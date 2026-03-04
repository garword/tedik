import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import prisma from '@/lib/prisma';

interface R2Config {
    accountId: string;
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    publicUrl: string;
}

/**
 * Fetch R2 credentials from database (siteContent table).
 * Throws if any required field is missing.
 */
async function getR2Config(): Promise<R2Config> {
    const [accountId, accessKeyId, secretAccessKey, bucketName, publicUrl] = await Promise.all([
        prisma.siteContent.findUnique({ where: { slug: 'r2_account_id' } }),
        prisma.siteContent.findUnique({ where: { slug: 'r2_access_key_id' } }),
        prisma.siteContent.findUnique({ where: { slug: 'r2_secret_access_key' } }),
        prisma.siteContent.findUnique({ where: { slug: 'r2_bucket_name' } }),
        prisma.siteContent.findUnique({ where: { slug: 'r2_public_url' } }),
    ]);

    if (!accountId?.content || !accessKeyId?.content || !secretAccessKey?.content || !bucketName?.content || !publicUrl?.content) {
        throw new Error('Konfigurasi Cloudflare R2 belum lengkap. Silakan isi di Admin Panel → Settings.');
    }

    return {
        accountId: accountId.content,
        accessKeyId: accessKeyId.content,
        secretAccessKey: secretAccessKey.content,
        bucketName: bucketName.content,
        publicUrl: publicUrl.content.replace(/\/+$/, ''), // Remove trailing slash
    };
}

/**
 * Create a new S3Client pointing to R2.
 */
function createR2Client(config: R2Config): S3Client {
    return new S3Client({
        region: 'auto',
        endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
        },
    });
}

/**
 * Get MIME type from file extension.
 */
function getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'avif': 'image/avif',
    };
    return mimeMap[ext || ''] || 'application/octet-stream';
}

/**
 * Upload a File to Cloudflare R2 and return the public URL.
 */
export async function uploadToR2(file: File): Promise<string> {
    const config = await getR2Config();
    const client = createR2Client(config);

    // Generate unique filename
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const key = `blog/${timestamp}-${random}.${ext}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to R2
    await client.send(new PutObjectCommand({
        Bucket: config.bucketName,
        Key: key,
        Body: buffer,
        ContentType: getMimeType(file.name),
        CacheControl: 'public, max-age=31536000, immutable',
    }));

    // Return the public URL
    return `${config.publicUrl}/${key}`;
}
