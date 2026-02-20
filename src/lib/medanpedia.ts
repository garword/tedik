
import crypto from 'crypto';
import prisma from '@/lib/prisma';

interface MedanPediaConfig {
    apiId: string;
    apiKey: string;
    marginPercent: number;
}

export interface MedanPediaResponse {
    status: boolean;
    data?: any;
    msg?: string;
    orders?: any; // For mass status
}

export async function getMedanPediaConfig(): Promise<MedanPediaConfig> {
    const apiId = await prisma.siteContent.findUnique({ where: { slug: 'medanpedia_api_id' } });
    const apiKey = await prisma.siteContent.findUnique({ where: { slug: 'medanpedia_api_key' } });
    const margin = await prisma.siteContent.findUnique({ where: { slug: 'medanpedia_margin_percent' } });

    if (!apiId?.content || !apiKey?.content) {
        throw new Error('MedanPedia Configuration Missing (API ID or Key)');
    }

    return {
        apiId: apiId.content,
        apiKey: apiKey.content,
        marginPercent: margin?.content ? Number(margin.content) : 10 // Default 10%
    };
}

async function postMedanPedia(endpoint: string, formParams: Record<string, any>): Promise<MedanPediaResponse> {
    try {
        const formData = new URLSearchParams();
        for (const key in formParams) {
            formData.append(key, String(formParams[key]));
        }

        const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString()
        });

        const data = await res.json();
        return data;
    } catch (error: any) {
        console.error(`MedanPedia Error (${endpoint}):`, error);
        return { status: false, msg: error.message || 'Connection Error' };
    }
}

export async function checkBalance(): Promise<number> {
    const config = await getMedanPediaConfig();
    const res = await postMedanPedia('https://api.medanpedia.co.id/profile', {
        api_id: config.apiId,
        api_key: config.apiKey
    });

    if (res.status && res.data) {
        return Number(res.data.balance);
    }
    throw new Error(res.msg || 'Failed to check balance');
}

export async function getServices(): Promise<any[]> {
    const config = await getMedanPediaConfig();
    const res = await postMedanPedia('https://api.medanpedia.co.id/services', {
        api_id: config.apiId,
        api_key: config.apiKey
    });

    if (res.status && Array.isArray(res.data)) {
        return res.data;
    }
    throw new Error(res.msg || 'Failed to fetch services');
}

export async function createOrder(params: {
    serviceId: string | number;
    target: string;
    quantity: number;
    customComments?: string;
    customLink?: string;
}): Promise<{ id: string, msg: string }> {
    const config = await getMedanPediaConfig();
    const payload: any = {
        api_id: config.apiId,
        api_key: config.apiKey,
        service: params.serviceId,
        target: params.target,
        quantity: params.quantity
    };

    if (params.customComments) payload.custom_comments = params.customComments;
    if (params.customLink) payload.custom_link = params.customLink;

    const res = await postMedanPedia('https://api.medanpedia.co.id/order', payload);

    if (res.status && res.data?.id) {
        return { id: String(res.data.id), msg: res.msg || 'Order created' };
    }
    throw new Error(res.msg || 'Failed to create order');
}

export async function checkStatus(orderId: string): Promise<{ status: string, start_count: number, remains: number }> {
    const config = await getMedanPediaConfig();
    const res = await postMedanPedia('https://api.medanpedia.co.id/status', {
        api_id: config.apiId,
        api_key: config.apiKey,
        id: orderId
    });

    if (res.status && res.data) {
        return {
            status: res.data.status,
            start_count: Number(res.data.start_count),
            remains: Number(res.data.remains)
        };
    }
    throw new Error(res.msg || 'Failed to check status');
}

export async function refillOrder(orderId: string): Promise<{ id: string, msg: string }> {
    const config = await getMedanPediaConfig();
    const res = await postMedanPedia('https://api.medanpedia.co.id/refill', {
        api_id: config.apiId,
        api_key: config.apiKey,
        id_order: orderId
    });

    if (res.status && res.data?.id_refill) {
        return { id: String(res.data.id_refill), msg: res.msg || 'Refill request submitted' };
    }
    throw new Error(res.msg || 'Failed to request refill');
}

export async function checkRefillStatus(refillId: string): Promise<{ status: string }> {
    const config = await getMedanPediaConfig();
    const res = await postMedanPedia('https://api.medanpedia.co.id/refill_status', {
        api_id: config.apiId,
        api_key: config.apiKey,
        id_refill: refillId
    });

    if (res.status && res.data) {
        return {
            status: res.data.status,
            // Add other fields if needed
        };
    }
    throw new Error(res.msg || 'Failed to check refill status');
}

function slugify(text: string) {
    return text.toString().toLowerCase()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-')         // Replace multiple - with single -
        .replace(/^-+/, '')             // Trim - from start of text
        .replace(/-+$/, '');            // Trim - from end of text
}

function getPlatform(categoryName: string): string {
    const lower = categoryName.toLowerCase();
    if (lower.includes('instagram')) return 'Instagram';
    if (lower.includes('youtube')) return 'Youtube';
    if (lower.includes('tiktok')) return 'TikTok';
    if (lower.includes('facebook')) return 'Facebook';
    if (lower.includes('twitter') || lower.includes('x ')) return 'Twitter';
    if (lower.includes('threads')) return 'Threads';
    if (lower.includes('telegram')) return 'Telegram';
    if (lower.includes('spotify')) return 'Spotify';
    if (lower.includes('google')) return 'Google';
    if (lower.includes('shopee')) return 'Shopee';
    if (lower.includes('tokopedia')) return 'Tokopedia';
    if (lower.includes('discord')) return 'Discord';
    if (lower.includes('netflix')) return 'Netflix';
    if (lower.includes('vidio')) return 'Vidio';
    if (lower.includes('twitch')) return 'Twitch';
    if (lower.includes('linkedin')) return 'LinkedIn';
    if (lower.includes('soundcloud')) return 'Soundcloud';
    if (lower.includes('pinterest')) return 'Pinterest';
    if (lower.includes('clubhouse')) return 'Clubhouse';
    if (lower.includes('website') || lower.includes('traffic')) return 'Website Traffic';
    return 'Other';
}

function getSubCategory(categoryName: string, platform: string): string {
    const regex = new RegExp(platform, 'gi');
    let sub = categoryName.replace(regex, '').trim();
    sub = sub.replace(/^[-:|]+/, '').trim();
    return sub || 'General';
}

export async function syncMedanPediaCatalog() {
    const config = await getMedanPediaConfig();
    const services = await getServices();

    let createdProducts = 0;
    let createdVariants = 0;
    let updatedVariants = 0;

    let smmCategory = await prisma.category.findFirst({
        where: { type: 'SOSMED', name: 'SMM' }
    });

    if (!smmCategory) {
        smmCategory = await prisma.category.findFirst({
            where: { type: 'SOSMED', name: 'Social Media' }
        });

        if (!smmCategory) {
            smmCategory = await prisma.category.create({
                data: {
                    name: 'SMM',
                    slug: 'smm-services',
                    type: 'SOSMED',
                    iconKey: 'users'
                }
            });
        }
    }

    const platforms: Record<string, any[]> = {};
    for (const service of services) {
        const platform = getPlatform(service.category);
        if (!platforms[platform]) platforms[platform] = [];
        platforms[platform].push(service);
    }

    for (const platform of Object.keys(platforms)) {
        const platformServices = platforms[platform];
        const productSlug = slugify(platform);
        const productName = platform;

        let product = await prisma.product.findFirst({
            where: {
                slug: productSlug,
                category: { type: 'SOSMED' }
            },
            include: { variants: true }
        });

        if (!product) {
            product = await prisma.product.findFirst({
                where: {
                    name: productName,
                    category: { type: 'SOSMED' }
                },
                include: { variants: true }
            });
        }

        if (!product) {
            product = await prisma.product.create({
                data: {
                    name: productName,
                    slug: productSlug,
                    description: `Layanan SMM untuk ${platform}. Pilih layanan yang Anda butuhkan.`,
                    categoryId: smmCategory.id,
                    isActive: true,
                    ratingValue: 5.0,
                    soldCount: 0,
                },
                include: { variants: true }
            });
            createdProducts++;
        } else {
            if (product.categoryId !== smmCategory.id) {
                await prisma.product.update({
                    where: { id: product.id },
                    data: { categoryId: smmCategory.id }
                });
            }
        }

        for (const service of platformServices) {
            const subCategory = getSubCategory(service.category, platform);
            const variantName = `[${subCategory}] ${service.name}`;
            const basePrice = Number(service.price) / 1000;
            const sellingPrice = basePrice * (1 + config.marginPercent / 100);

            const existingProvider = await prisma.variantProvider.findFirst({
                where: {
                    providerCode: 'MEDANPEDIA',
                    providerSku: String(service.id),
                    variant: { productId: product.id }
                },
                include: { variant: true }
            });

            if (existingProvider) {
                await prisma.productVariant.update({
                    where: { id: existingProvider.variantId },
                    data: {
                        name: variantName,
                        price: sellingPrice,
                        stock: 999999,
                        isActive: true
                    }
                });

                await prisma.variantProvider.update({
                    where: { id: existingProvider.id },
                    data: {
                        providerPrice: service.price,
                        providerStatus: true
                    }
                });
                updatedVariants++;
            } else {
                await prisma.productVariant.create({
                    data: {
                        productId: product.id,
                        name: variantName,
                        price: sellingPrice,
                        durationDays: 0,
                        warrantyDays: 0,
                        deliveryType: 'instant',
                        stock: 999999,
                        bestProvider: 'MEDANPEDIA',
                        providers: {
                            create: {
                                providerCode: 'MEDANPEDIA',
                                providerSku: String(service.id),
                                providerPrice: service.price,
                                providerStatus: true
                            }
                        }
                    }
                });
                createdVariants++;
            }
        }
    }

    const validPlatformNames = Object.keys(platforms);
    const obsoleteProducts = await prisma.product.findMany({
        where: {
            category: { type: 'SOSMED' },
            name: { notIn: validPlatformNames }
        },
        select: { id: true, name: true }
    });

    if (obsoleteProducts.length > 0) {
        console.log(`Cleaning up ${obsoleteProducts.length} obsolete SMM products...`);
        await prisma.product.deleteMany({
            where: {
                id: { in: obsoleteProducts.map(p => p.id) }
            }
        });
    }

    return {
        success: true,
        message: `Sync complete. Grouped into ${Object.keys(platforms).length} platforms. Created/Updated ${createdProducts} products, ${createdVariants} new variants, ${updatedVariants} updated variants. Cleaned ${obsoleteProducts.length} old products.`,
        platforms: Object.keys(platforms)
    };
}
