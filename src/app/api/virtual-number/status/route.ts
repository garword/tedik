import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET(req: NextRequest) {
    try {
        const session = await getSession();
        if (!session?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const orderId = searchParams.get('orderId');

        if (!orderId) {
            return NextResponse.json({ success: false, error: 'Order ID required.' }, { status: 400 });
        }

        const order = await prisma.virtualNumberOrder.findUnique({
            where: { id: orderId }
        });

        if (!order || order.userId !== session.id) {
            return NextResponse.json({ success: false, error: 'Pesanan tidak ditemukan.' }, { status: 404 });
        }

        // Jika sudah tidak WAITING, jangan panggil VAK-SMS lagi, hemat API
        if (order.status !== 'WAITING') {
            return NextResponse.json({ success: true, data: order });
        }

        // Ambil konfigurasi API Key
        const apiKeyRec = await prisma.siteContent.findUnique({ where: { slug: 'vaksms_api_key' } });
        const apiKey = apiKeyRec?.content;
        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'API Key VAK-SMS tidak ditemukan di sistem.' }, { status: 500 });
        }

        // Cek Expired (5 Menit / 300 Detik)
        const elapsed = Date.now() - new Date(order.createdAt).getTime();
        const MAX_TIME = 5 * 60 * 1000;

        if (elapsed > MAX_TIME) {
            // Sesuai Aturan: Jika 5 menit lewat, Batalkan pesanan dan Refund
            // Panggil API Set Status "end" ke VAK-SMS
            try {
                await fetch(`https://moresms.net/api/setStatus/?apiKey=${apiKey}&status=end&idNum=${order.apiIdNum}`);
            } catch (err) {
                console.error('Gagal cancel di pusat:', err);
            }

            // Refund
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
                    referenceId: `REFUND-TIMEOUT-${order.id}`,
                    description: `Refund Kedaluwarsa Nomor (${order.phoneNumber}) - VAK-SMS`,
                    status: 'SUCCESS'
                }
            });

            const updatedOrder = await prisma.virtualNumberOrder.update({
                where: { id: order.id },
                data: { status: 'REFUNDED', updatedAt: new Date() }
            });

            return NextResponse.json({ success: true, data: updatedOrder });
        }

        // Cek Status / SMS Code ke VAK-SMS
        const getCodeUrl = `https://moresms.net/api/getSmsCode/?apiKey=${apiKey}&idNum=${order.apiIdNum}`;
        const res = await fetch(getCodeUrl, { headers: { 'Accept': 'application/json' } });
        const data = await res.json();

        // data format: {"smsCode": "G-12345"} or {"smsCode": null}
        if (data.smsCode) {
            // Kita dapat kodenya!
            const finalOrder = await prisma.virtualNumberOrder.update({
                where: { id: order.id },
                data: {
                    status: 'SUCCESS',
                    smsCode: data.smsCode,
                    updatedAt: new Date()
                }
            });

            return NextResponse.json({ success: true, data: finalOrder });
        } else if (data.error) {
            console.log('[VAK-SMS Polling Error/Info]:', data.error);
            // Biarkan WAITING jika error adalah hal seperti waitSms dll
        }

        return NextResponse.json({ success: true, data: order });

    } catch (error: any) {
        console.error('[Virtual Number Status Error]:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
