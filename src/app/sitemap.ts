import { MetadataRoute } from 'next';
import prisma from '@/lib/prisma';
import { getSeoConfig } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const seo = await getSeoConfig();
    const baseUrl = seo.siteUrl.replace(/\/$/, ''); // hapus trailing slash

    const now = new Date();

    // 1. Halaman statis
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 1.0,
        },
        {
            url: `${baseUrl}/panduan`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.6,
        },
        {
            url: `${baseUrl}/blog`,
            lastModified: now,
            changeFrequency: 'daily',
            priority: 0.7,
        },
        {
            url: `${baseUrl}/track`,
            lastModified: now,
            changeFrequency: 'monthly',
            priority: 0.4,
        },
    ];

    // 2. Semua produk aktif
    let productPages: MetadataRoute.Sitemap = [];
    try {
        const products = await prisma.product.findMany({
            where: { isActive: true, isDeleted: false },
            select: { slug: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' },
        });

        productPages = products.map((p) => ({
            url: `${baseUrl}/p/${p.slug}`,
            lastModified: p.updatedAt,
            changeFrequency: 'weekly' as const,
            priority: 0.9,
        }));
    } catch (e) {
        console.error('[sitemap] Failed to fetch products:', e);
    }

    // 3. Semua artikel blog published
    let blogPages: MetadataRoute.Sitemap = [];
    try {
        const posts = await prisma.blogPost.findMany({
            where: { isPublished: true },
            select: { slug: true, updatedAt: true },
            orderBy: { updatedAt: 'desc' },
        });

        blogPages = posts.map((p) => ({
            url: `${baseUrl}/blog/${p.slug}`,
            lastModified: p.updatedAt,
            changeFrequency: 'weekly' as const,
            priority: 0.7,
        }));
    } catch (e) {
        console.error('[sitemap] Failed to fetch blog posts:', e);
    }

    // 4. Halaman info dinamis (Tentang, Syarat, dll)
    let infoPages: MetadataRoute.Sitemap = [];
    try {
        const infoSlugs = ['about', 'terms', 'privacy', 'refund', 'contact', 'faq', 'how-to-buy'];
        const pages = await prisma.siteContent.findMany({
            where: { slug: { in: infoSlugs } },
            select: { slug: true, updatedAt: true },
        });

        infoPages = pages.map((p) => ({
            url: `${baseUrl}/info/${p.slug}`,
            lastModified: p.updatedAt,
            changeFrequency: 'monthly' as const,
            priority: 0.5,
        }));
    } catch (e) {
        console.error('[sitemap] Failed to fetch info pages:', e);
    }

    return [...staticPages, ...productPages, ...blogPages, ...infoPages];
}
