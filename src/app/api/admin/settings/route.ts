
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { logAdminAction } from '@/lib/audit';

export async function GET() {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [
        geminiConfig, openRouterConfig, openRouterModelConfig,
        turnstileSiteConfig, turnstileSecretConfig, imgbbConfig,
        r2AccountId, r2AccessKeyId, r2SecretAccessKey, r2BucketName, r2PublicUrl
    ] = await Promise.all([
        prisma.siteContent.findUnique({ where: { slug: 'gemini_api_key' } }),
        prisma.siteContent.findUnique({ where: { slug: 'openrouter_api_key' } }),
        prisma.siteContent.findUnique({ where: { slug: 'openrouter_model' } }),
        prisma.siteContent.findUnique({ where: { slug: 'turnstile_site_key' } }),
        prisma.siteContent.findUnique({ where: { slug: 'turnstile_secret_key' } }),
        prisma.siteContent.findUnique({ where: { slug: 'imgbb_api_key' } }),
        prisma.siteContent.findUnique({ where: { slug: 'r2_account_id' } }),
        prisma.siteContent.findUnique({ where: { slug: 'r2_access_key_id' } }),
        prisma.siteContent.findUnique({ where: { slug: 'r2_secret_access_key' } }),
        prisma.siteContent.findUnique({ where: { slug: 'r2_bucket_name' } }),
        prisma.siteContent.findUnique({ where: { slug: 'r2_public_url' } }),
    ]);

    return NextResponse.json({
        geminiApiKey: geminiConfig?.content || '',
        openRouterApiKey: openRouterConfig?.content || '',
        openRouterModel: openRouterModelConfig?.content || '',
        turnstileSiteKey: turnstileSiteConfig?.content || '',
        turnstileSecretKey: turnstileSecretConfig?.content || '',
        imgbbApiKey: imgbbConfig?.content || '',
        r2AccountId: r2AccountId?.content || '',
        r2AccessKeyId: r2AccessKeyId?.content || '',
        r2SecretAccessKey: r2SecretAccessKey?.content || '',
        r2BucketName: r2BucketName?.content || '',
        r2PublicUrl: r2PublicUrl?.content || '',
    });
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const {
            geminiApiKey, openRouterApiKey, openRouterModel,
            turnstileSiteKey, turnstileSecretKey, imgbbApiKey,
            r2AccountId, r2AccessKeyId, r2SecretAccessKey, r2BucketName, r2PublicUrl
        } = body;

        // Helper for upsert
        const upsertSetting = async (slug: string, title: string, value: string | undefined) => {
            if (value === undefined) return;
            await prisma.siteContent.upsert({
                where: { slug },
                update: { content: value },
                create: { slug, title, content: value }
            });
        };

        await Promise.all([
            upsertSetting('gemini_api_key', 'Gemini API Key', geminiApiKey),
            upsertSetting('openrouter_api_key', 'OpenRouter API Key', openRouterApiKey),
            upsertSetting('openrouter_model', 'OpenRouter Model', openRouterModel),
            upsertSetting('turnstile_site_key', 'Turnstile Site Key', turnstileSiteKey),
            upsertSetting('turnstile_secret_key', 'Turnstile Secret Key', turnstileSecretKey),
            upsertSetting('imgbb_api_key', 'ImgBB API Key', imgbbApiKey),
            upsertSetting('r2_account_id', 'R2 Account ID', r2AccountId),
            upsertSetting('r2_access_key_id', 'R2 Access Key ID', r2AccessKeyId),
            upsertSetting('r2_secret_access_key', 'R2 Secret Access Key', r2SecretAccessKey),
            upsertSetting('r2_bucket_name', 'R2 Bucket Name', r2BucketName),
            upsertSetting('r2_public_url', 'R2 Public URL', r2PublicUrl),
        ]);

        await logAdminAction(session.userId, 'UPDATE_SETTINGS', 'Updated Settings & API Keys');

        return NextResponse.json({ message: 'Settings saved' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
