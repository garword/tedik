import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getUserTier } from '@/lib/tiers';

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized. Harap login.' }, { status: 401 });
        }

        const body = await req.json();
        const { service, country, operator = 'any' } = body;

        if (!service || !country) {
            return NextResponse.json({ success: false, error: 'Service dan Country wajib diisi.' }, { status: 400 });
        }

        // 1. Ambil config
        const configs = await prisma.siteContent.findMany({
            where: {
                slug: { in: ['vaksms_api_key', 'vaksms_is_active', 'vaksms_rub_rate', 'vaksms_margin_percent', 'vaksms_tier_active'] }
            }
        });

        const configMap = configs.reduce((acc, curr) => {
            acc[curr.slug] = curr.content;
            return acc;
        }, {} as Record<string, string | null>);

        if (configMap['vaksms_is_active'] !== 'true' || !configMap['vaksms_api_key']) {
            return NextResponse.json({ success: false, error: 'Layanan Virtual Number sedang dimatikan/maintenance.' }, { status: 503 });
        }

        const apiKey = configMap['vaksms_api_key'];
        const rubRate = Number(configMap['vaksms_rub_rate'] || '200');
        const marginPercent = Number(configMap['vaksms_margin_percent'] || '20');

        // 2. Kalkulasi Harga Real-tim
        // Kita hitung di server lagi agar aman dari manipulasi client
        const priceUrl = `https://moresms.net/api/getCountNumber/?apiKey=${apiKey}&service=${service}&country=${country}&operator=${operator}&price`;
        const priceRes = await fetch(priceUrl, { headers: { 'Accept': 'application/json' } });
        const priceData = await priceRes.json();

        if (priceData.error || priceData.price === undefined) {
            return NextResponse.json({ success: false, error: priceData.error || 'Harga layanan tidak ditemukan.' }, { status: 400 });
        }

        const count = priceData[service] || 0;
        if (count === 0) {
            return NextResponse.json({ success: false, error: 'Stok nomor sedang kosong. Coba lagi nanti.' }, { status: 400 });
        }

        const basePriceIdr = priceData.price * rubRate;
        const isTierActive = configMap['vaksms_tier_active'] === 'true';

        // Logika Sistem Tier
        let userTierMargin = 10;
        if (isTierActive) {
            const userTier = await getUserTier(session.id);
            userTierMargin = userTier.marginPercent;
        }

        const totalUserMarginPercent = marginPercent + (isTierActive ? userTierMargin : 0);
        const rawUserPrice = basePriceIdr + (basePriceIdr * (totalUserMarginPercent / 100));
        const userPriceIdr = Math.ceil(rawUserPrice / 100) * 100; // Pembulatan ke atas

        // 3. Cek Saldo User & Potong di awal (Optimistic Deduction) untuk cegah Race Condition
        const user = await prisma.user.findUnique({ where: { id: session.id } });
        if (!user || user.balance.toNumber() < userPriceIdr) {
            return NextResponse.json({ success: false, error: `Saldo tidak mencukupi. (Harga: Rp${userPriceIdr.toLocaleString('id-ID')})` }, { status: 400 });
        }

        // --- POTONG SALDO DI AWAL ---
        const trxId = `TRXVAK${Date.now()}`;
        const updatedUser = await prisma.user.update({
            where: { id: session.id },
            data: { balance: { decrement: userPriceIdr } }
        });

        await prisma.walletTransaction.create({
            data: {
                userId: session.id,
                type: 'DEBIT',
                amount: userPriceIdr,
                balanceBefore: user.balance,
                balanceAfter: updatedUser.balance,
                referenceId: trxId,
                description: `Sewa Nomor Virtual (${service}) - VAK-SMS`,
                status: 'SUCCESS'
            }
        });

        // 4. Beli Nomor ke VAK-SMS API
        let apiData: any = {};
        try {
            const baseUrl = `https://moresms.net/api/getNumber/?apiKey=${apiKey}&service=${service}&country=${country}`;
            const getNumberUrl = operator && operator.toLowerCase() !== 'any'
                ? `${baseUrl}&operator=${operator}`
                : baseUrl;

            const apiRes = await fetch(getNumberUrl, { headers: { 'Accept': 'application/json' } });
            apiData = await apiRes.json();
        } catch (err) {
            apiData = { error: 'Gagal terhubung ke provider (Timeout).' };
        }

        // 5. Handling Error VAK-SMS & Refund Otomatis
        if (apiData.error) {
            // --- REFUND KARENA GAGAL ---
            const refundedUser = await prisma.user.update({
                where: { id: session.id },
                data: { balance: { increment: userPriceIdr } }
            });

            await prisma.walletTransaction.create({
                data: {
                    userId: session.id,
                    type: 'CREDIT',
                    amount: userPriceIdr,
                    balanceBefore: updatedUser.balance,
                    balanceAfter: refundedUser.balance,
                    referenceId: `REFUND-${trxId}`,
                    description: `Refund Otomatis (${apiData.error}) - VAK-SMS`,
                    status: 'SUCCESS'
                }
            });

            return NextResponse.json({ success: false, error: `Gagal memproses ke server pusat: ${apiData.error}` }, { status: 400 });
        }

        // Jika Berhasil: {"tel": 79991112233, "idNum": "3adb...fd"}
        const idNum = apiData.idNum;
        const tel = apiData.tel;

        // 6. Simpan Pesanan ke Database
        const newOrder = await prisma.virtualNumberOrder.create({
            data: {
                userId: session.id,
                apiIdNum: idNum,
                service: service,
                country: country,
                phoneNumber: String(tel),
                price: priceData.price, // Harga asli rubel
                userPrice: userPriceIdr, // Harga jual rupiah
                status: 'WAITING',
            }
        });

        return NextResponse.json({ success: true, order: newOrder });

    } catch (error: any) {
        console.error('[Virtual Number Order Error]:', error);
        return NextResponse.json({ success: false, error: error.message || 'Terjadi kesalahan internal ketika melakukan pemesanan.' }, { status: 500 });
    }
}
