import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getUserTier } from '@/lib/tiers';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const service = searchParams.get('service');
        const country = searchParams.get('country') || 'id'; // default indonesia
        const operator = searchParams.get('operator') || 'any'; // VAK-SMS default is any

        if (!service) {
            return NextResponse.json({ success: false, error: 'Service code is required' }, { status: 400 });
        }

        // Ambil konfigurasi dari database
        const [apiKeyRec, isActiveRec, rubRateRec, marginRec, tierActiveRec] = await Promise.all([
            prisma.siteContent.findUnique({ where: { slug: 'vaksms_api_key' } }),
            prisma.siteContent.findUnique({ where: { slug: 'vaksms_is_active' } }),
            prisma.siteContent.findUnique({ where: { slug: 'vaksms_rub_rate' } }),
            prisma.siteContent.findUnique({ where: { slug: 'vaksms_margin_percent' } }),
            prisma.siteContent.findUnique({ where: { slug: 'vaksms_tier_active' } }),
        ]);

        const isActive = isActiveRec?.content === 'true';
        const apiKey = apiKeyRec?.content;

        if (!isActive || !apiKey) {
            return NextResponse.json({ success: false, error: 'Layanan Virtual Number sedang dimatikan.' }, { status: 503 });
        }

        const rubRate = Number(rubRateRec?.content || '200');
        const marginPercent = Number(marginRec?.content || '20');
        const isTierActive = tierActiveRec?.content === 'true';

        // Get session untuk membaca UserID (guest aman)
        const session = await getSession();
        const userId = session?.id;

        // Panggil API VAK-SMS
        // Tambahkan '&price' agar API mengembalikan harga
        const baseUrl = `https://moresms.net/api/getCountNumber/?apiKey=${apiKey}&service=${service}&country=${country}&price`;
        const url = operator && operator.toLowerCase() !== 'any'
            ? `${baseUrl}&operator=${operator}`
            : baseUrl;

        const response = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            cache: 'no-store'
        });
        const data = await response.json();

        // Error handling dari VAK-SMS
        if (data.error) {
            let errorMsg = data.error;
            if (data.error === 'noOperator' || data.error === 'noNumber') {
                errorMsg = 'Stok spesifik (Operator/Negara ini) sedang kosong.';
            } else if (data.error === 'badOperator') {
                errorMsg = 'Operator tidak tersedia untuk layanan ini.';
            }
            return NextResponse.json({ success: false, error: errorMsg, count: 0 }, { status: 400 });
        }

        // Response format: { "wa": 332, "price": 2.0 }
        const count = data[service] || 0;
        const priceRub = data.price;

        if (priceRub === undefined) {
            return NextResponse.json({ success: false, error: 'Harga tidak ditemukan untuk layanan ini.' }, { status: 400 });
        }

        if (count === 0) {
            return NextResponse.json({ success: false, error: 'Stok nomor sedang kosong.' }, { status: 400 });
        }

        // Kalkulasi Harga Rupiah (Base)
        const basePriceIdr = priceRub * rubRate;
        const globalProfitMargin = basePriceIdr * (marginPercent / 100);

        // Logika Sistem Tier Otomatis
        let userTierMargin = 10; // Default Bronze Margin
        let tierName = null;

        if (isTierActive) {
            const userTier = await getUserTier(userId);
            userTierMargin = userTier.marginPercent;
            tierName = userTier.name;
        }

        // Harga Asli (Original/Bronze) -> Jika Tier Aktif asumsi awal adalah 10% Bronze
        // Jika tidak aktif, maka original dan user price adalah sama.
        let originalPriceIdr = null;

        // Harga Jual untuk User ini: Base + Admin Margin (Global) + Tier Margin (Spesifik User)
        const totalUserMarginPercent = marginPercent + (isTierActive ? userTierMargin : 0);
        const rawUserPrice = basePriceIdr + (basePriceIdr * (totalUserMarginPercent / 100));
        const userPriceIdr = Math.ceil(rawUserPrice / 100) * 100;

        // Jika fitur tier menyala, hitung harga 'asli' (Bronze/Guest = 10% dasar) untuk dicoret
        if (isTierActive) {
            const totalBronzeMarginPercent = marginPercent + 10; // Asumsi Bronze margin default 10% di sistem Tiers
            const rawOriginalPrice = basePriceIdr + (basePriceIdr * (totalBronzeMarginPercent / 100));
            const calculatedOriginalPrice = Math.ceil(rawOriginalPrice / 100) * 100;

            // Hanya tampilkan harga coret jika harga user ternyata LBH MURAH dari Bronze
            if (userPriceIdr < calculatedOriginalPrice) {
                originalPriceIdr = calculatedOriginalPrice;
            }
        }

        return NextResponse.json({
            success: true,
            data: {
                count,
                priceRub,
                rubRate,
                marginPercent,
                userPriceIdr,
                originalPriceIdr,
                tierName
            }
        });

    } catch (error: any) {
        console.error('[VAK-SMS Price Check Error]:', error);
        return NextResponse.json({ success: false, error: 'Terjadi kesalahan sistem.' }, { status: 500 });
    }
}
