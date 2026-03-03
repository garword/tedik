import { MetadataRoute } from 'next';
import { getSeoConfig } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default async function robots(): Promise<MetadataRoute.Robots> {
    const seo = await getSeoConfig();
    const baseUrl = seo.siteUrl.replace(/\/$/, '');

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: [
                    '/admin/',
                    '/api/',
                    '/account/',
                    '/invoice/',
                    '/wallet/',
                    '/otp/',
                    '/webhook-logs/',
                    '/_next/',
                ],
            },
            {
                // Izinkan Googlebot khusus untuk halaman produk & blog
                userAgent: 'Googlebot',
                allow: ['/p/', '/blog/', '/', '/panduan', '/track', '/info/'],
                disallow: ['/admin/', '/api/', '/account/'],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
