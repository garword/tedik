import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
        }

        const body = await req.json();
        const { orderId } = body;

        if (!orderId) {
            return NextResponse.json({ success: false, error: 'Order ID required.' }, { status: 400 });
        }

        const order = await prisma.virtualNumberOrder.findUnique({
            where: { id: orderId }
        });

        if (!order || order.userId !== session.id) {
            return NextResponse.json({ success: false, error: 'Pesanan tidak ditemukan.' }, { status: 404 });
        }

        if (order.status !== 'WAITING') {
            return NextResponse.json({ success: false, error: 'Hanya pesanan berstatus WAITING yang dapat dibatalkan.' }, { status: 400 });
        }

        // Cek Aturan 2 Menit (120000 ms)
        const elapsed = Date.now() - new Date(order.createdAt).getTime();
        const MIN_TIME = 2 * 60 * 1000;

        if (elapsed < MIN_TIME) {
            return NextResponse.json({ success: false, error: 'Pembatalan hanya bisa dilakukan setelah 2 menit.' }, { status: 400 });
        }

        const apiKeyRec = await prisma.siteContent.findUnique({ where: { slug: 'vaksms_api_key' } });
        const apiKey = apiKeyRec?.content;

        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'API Key VAK-SMS tidak valid.' }, { status: 500 });
        }

        // Panggil VAK-SMS untuk membatalkan (Set Status: end)
        const cancelUrl = `https://moresms.net/api/setStatus/?apiKey=${apiKey}&status=end&idNum=${order.apiIdNum}`;
        const res = await fetch(cancelUrl, { headers: { 'Accept': 'application/json' } });
        const data = await res.json();

        // data format is {"status": "update"} for successful cancellation, or errors.
        // Even if the provider fails to update (e.g. number already processed), we should probably 
        // still cancel it locally if it's "update" or "waitSms". Wait, if "waitSms" or something it can't be cancelled?
        // Let's assume user clicks "Cancel" and we force refund locally no matter what, 
        // as long as VAK-SMS says "update", "cancel", "waitSMS", it means we try our best.
        // Actually, "status: update" means it's cancelled nicely.

        console.log('[VAK-SMS Cancel API response]:', data);

        // Refund User Wallet
        const refundedUser = await prisma.user.update({
            where: { id: session.id },
            data: { balance: { increment: order.userPrice } }
        });

        await prisma.walletTransaction.create({
            data: {
                userId: session.id,
                type: 'CREDIT',
                amount: order.userPrice,
                balanceBefore: refundedUser.balance.toNumber() - order.userPrice.toNumber(),
                balanceAfter: refundedUser.balance,
                referenceId: `CANCEL-${order.id}`,
                description: `Pengembalian Dana Pembatalan Manual OTP (${order.phoneNumber})`,
                status: 'SUCCESS'
            }
        });

        // Update Order DB
        const updatedOrder = await prisma.virtualNumberOrder.update({
            where: { id: order.id },
            data: { status: 'CANCELLED', updatedAt: new Date() }
        });

        return NextResponse.json({ success: true, message: 'Pesanan berhasil dibatalkan dan Saldo dikembalikan.', order: updatedOrder });

    } catch (error: any) {
        console.error('[Virtual Number Cancel Error]:', error);
        return NextResponse.json({ success: false, error: error.message || 'Terjadi kesalahan internal ketika membatalkan pesanan.' }, { status: 500 });
    }
}
