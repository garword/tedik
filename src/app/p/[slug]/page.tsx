
import prisma from '@/lib/prisma';
import ProductDetailClient from '@/components/features/product/ProductDetailClient';
import { getSession } from '@/lib/session';
import { notFound } from 'next/navigation';
import { applyTierPricing } from '@/lib/tiers';
import { getSeoConfig } from '@/lib/seo';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

// ✅ Generate metadata dinamis per produk
export async function generateMetadata(
    { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
    const { slug } = await params;
    const seo = await getSeoConfig();
    const baseUrl = seo.siteUrl.replace(/\/$/, '');

    const product = await prisma.product.findUnique({
        where: { slug },
        include: {
            category: { select: { name: true, slug: true } },
            variants: {
                where: { isActive: true, isDeleted: false },
                orderBy: { price: 'asc' },
                take: 1,
            },
        },
    });

    if (!product) {
        return {
            title: 'Produk Tidak Ditemukan',
            description: 'Produk yang Anda cari tidak ditemukan.',
        };
    }

    const minPrice = product.variants[0] ? Number(product.variants[0].price) : 0;
    const priceStr = minPrice > 0
        ? `Mulai Rp${minPrice.toLocaleString('id-ID')}`
        : '';

    // Beberapa produk menyimpan description sebagai JSON: {"main": "...", "info": "..."}
    let plainDescription = '';
    if (product.description) {
        try {
            const parsed = JSON.parse(product.description);
            plainDescription = parsed.main || Object.values(parsed).filter((v: any) => typeof v === 'string').join('. ');
        } catch {
            plainDescription = product.description;
        }
    }
    const description = plainDescription
        ? plainDescription.slice(0, 155)
        : `Beli ${product.name} di ${seo.siteName}. ${priceStr}. Proses cepat & aman.`;

    const imageUrl = (product as any).imageUrl || seo.ogImageUrl || '';
    const pageUrl = `${baseUrl}/p/${slug}`;

    return {
        title: product.name,
        description,
        alternates: { canonical: pageUrl },
        openGraph: {
            title: `${product.name} | ${seo.siteName}`,
            description,
            url: pageUrl,
            type: 'website',
            siteName: seo.siteName,
            images: imageUrl
                ? [{ url: imageUrl, width: 800, height: 600, alt: product.name }]
                : [],
        },
        twitter: {
            card: 'summary_large_image',
            title: `${product.name} | ${seo.siteName}`,
            description,
            images: imageUrl ? [imageUrl] : [],
        },
    };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const session = await getSession();

    let user = null;
    if (session?.userId) {
        const dbUser = await prisma.user.findUnique({
            where: { id: session.userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                balance: true, // Crucial for PaymentModal
                emailVerifiedAt: true,
            }
        });

        if (dbUser) {
            user = {
                ...dbUser,
                balance: Number(dbUser.balance)
            };
        }
    }

    const product = await prisma.product.findUnique({
        where: { slug },
        include: {
            category: true,
            variants: {
                where: { isActive: true, isDeleted: false },
                orderBy: { price: 'asc' },
                include: {
                    stocks: {
                        where: { status: 'AVAILABLE' },
                        select: { id: true },
                    },
                    providers: true, // Include providers to get SKU for Realtime Check
                },
            }
        }
    });

    if (!product || product.isDeleted) {
        notFound();
    }

    // Check Service Status
    let serviceStatus = { GAME: true, DIGITAL: true, PULSA: true, SOSMED: true };
    try {
        // @ts-ignore
        const config = await prisma.systemConfig.findUnique({ where: { key: 'MAIN_CATEGORY_STATUS' } });
        if (config) serviceStatus = JSON.parse(config.value);
    } catch (e) { }

    // @ts-ignore
    const isServiceOffline = serviceStatus[product.category.type] === false;

    // Force inactive if service offline
    if (isServiceOffline) {
        // We modify the object in-memory for the view
        product.isActive = false;
        product.category.isActive = false; // Double ensure
    }

    // Apply Dynamic Tier Pricing if user is logged in
    // This returns a plain object with serialized prices
    const { product: tieredProduct, tier } = await applyTierPricing(product, session?.userId); // Use serialized base to avoid Decimal issues if passed directly

    // Calculate minPrice from variants since it might not be in the product object directly
    const prices = tieredProduct.variants.map((v: any) => v.price); // v.price is already number from applyTierPricing
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

    // Additional serialization if needed (applyTierPricing handles most)
    const serializedProduct = {
        ...tieredProduct,
        minPrice: minPrice,
        // Ensure standard fields are preserved
        variants: tieredProduct.variants.map((v: any) => ({
            ...v,
            price: Number(v.price),
            originalPrice: v.originalPrice ? Number(v.originalPrice) : null,
            providers: v.providers?.map((p: any) => ({
                ...p,
                providerPrice: Number(p.providerPrice)
            })),
        })),
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* JSON-LD: Product + BreadcrumbList (kunci sitelinks Google) */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'Product',
                        name: serializedProduct.name,
                        description: serializedProduct.description || `${serializedProduct.name} di ${serializedProduct.category?.name}`,
                        image: (serializedProduct as any).imageUrl || undefined,
                        offers: {
                            '@type': 'AggregateOffer',
                            priceCurrency: 'IDR',
                            lowPrice: minPrice,
                            offerCount: serializedProduct.variants.length,
                            availability: 'https://schema.org/InStock',
                        },
                        brand: {
                            '@type': 'Brand',
                            name: serializedProduct.category?.name || serializedProduct.name,
                        },
                    })
                }}
            />
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'BreadcrumbList',
                        itemListElement: [
                            {
                                '@type': 'ListItem',
                                position: 1,
                                name: 'Beranda',
                                item: process.env.NEXT_PUBLIC_APP_URL || 'https://example.com',
                            },
                            {
                                '@type': 'ListItem',
                                position: 2,
                                name: serializedProduct.category?.name || 'Produk',
                                item: `${process.env.NEXT_PUBLIC_APP_URL || 'https://example.com'}/?tab=${serializedProduct.category?.slug || 'games'}`,
                            },
                            {
                                '@type': 'ListItem',
                                position: 3,
                                name: serializedProduct.name,
                            },
                        ],
                    })
                }}
            />
            <ProductDetailClient
                product={serializedProduct}
                user={user}
                tierName={tier?.name}
            />
        </div>
    );
}
