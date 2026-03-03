import prisma from '@/lib/prisma';

export interface SeoConfig {
    siteName: string;
    siteUrl: string;
    tagline: string;
    description: string;
    logoUrl: string;
    ogImageUrl: string;
    keywords: string;
    googleVerification: string;
    twitterHandle: string;
}

const DEFAULT_SEO: SeoConfig = {
    siteName: 'Digital Store',
    siteUrl: 'https://example.com',
    tagline: 'Toko Digital Terpercaya',
    description: 'Toko produk digital murah dan terpercaya. Top up game, pulsa, dan layanan digital lainnya.',
    logoUrl: '',
    ogImageUrl: '',
    keywords: 'toko digital, top up game, pulsa murah, produk digital',
    googleVerification: '',
    twitterHandle: '',
};

// Cache sederhana agar tidak spam database di setiap request
let seoCache: SeoConfig | null = null;
let seoCacheTime = 0;
const SEO_CACHE_TTL = 60 * 1000; // 60 detik

export async function getSeoConfig(): Promise<SeoConfig> {
    const now = Date.now();

    // Kembalikan cache jika masih segar
    if (seoCache && now - seoCacheTime < SEO_CACHE_TTL) {
        return seoCache;
    }

    try {
        const record = await prisma.siteContent.findUnique({
            where: { slug: 'seo_config' },
        });

        if (record?.content) {
            const parsed = JSON.parse(record.content);
            seoCache = { ...DEFAULT_SEO, ...parsed };
            seoCacheTime = now;
            return seoCache as SeoConfig;
        }
    } catch (e) {
        console.error('[seo.ts] Failed to fetch SEO config:', e);
    }

    return DEFAULT_SEO;
}

// Helper: invalidate cache setelah update dari admin
export function invalidateSeoCache() {
    seoCache = null;
    seoCacheTime = 0;
}
