
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { getPakasirConfig, createPakasirTransaction } from '@/lib/pakasir';
import { getDuitkuConfig, createDuitkuTransaction } from '@/lib/duitku';

export async function POST(req: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { amount } = await req.json();
        const depositAmount = Number(amount);

        if (!depositAmount || depositAmount < 1000) {
            return NextResponse.json({ error: 'Minimum deposit Rp 1.000' }, { status: 400 });
        }

        // 1. Get Active Gateway Setting
        const activeSetting = await prisma.siteSetting.findUnique({
            where: { key: 'active_payment_gateway' }
        });
        const activeGatewayStr = activeSetting?.value || 'pakasir';

        // 2. Fetch Config & Calculate Fee based on gateway
        let gatewayConfig: any = null;
        let totalFee = 0;
        let totalPay = 0;

        if (activeGatewayStr === 'duitku') {
            gatewayConfig = await getDuitkuConfig();
        } else {
            gatewayConfig = await prisma.paymentGatewayConfig.findUnique({
                where: { name: 'pakasir' }
            });
        }

        if (!gatewayConfig || !gatewayConfig.isActive) {
            return NextResponse.json({ error: 'Payment gateway unavailable' }, { status: 503 });
        }

        const feePercent = (depositAmount * gatewayConfig.feePercentage) / 100;
        const feeFixed = Number(gatewayConfig.feeFixed);
        totalFee = Math.ceil(feePercent + feeFixed);
        totalPay = depositAmount + totalFee;

        // Generate Custom ID: DEPOSIT-RW-RANDOM
        const randomStr = Math.random().toString(36).substring(2, 9).toUpperCase();
        const customId = `DEPOSIT-RW-${randomStr}`;

        // 3. Create Deposit Record
        const deposit = await prisma.deposit.create({
            data: {
                id: customId,
                userId: session.userId,
                amount: depositAmount,
                feeAmount: totalFee,
                totalPay: totalPay,
                status: 'PENDING',
                paymentMethod: activeGatewayStr === 'duitku' ? 'duitku-qris' : 'QRIS'
            }
        });

        // 4. Call Payment Gateway
        let qrString = '';

        if (activeGatewayStr === 'duitku') {
            const user = await prisma.user.findUnique({ where: { id: session.userId } });

            // Get origin for callbacks
            let originUrl = 'https://rawanscript.com';
            try {
                // req.headers.get('origin') or construct from NextUrl if available
                originUrl = new URL(req.url).origin;
            } catch (e) {
                // fallback
            }

            const duitkuRes = await createDuitkuTransaction(gatewayConfig, {
                orderId: deposit.id,
                amount: totalPay,
                email: user?.email || 'customer@example.com',
                customerVaName: user?.name || 'Customer',
                callbackUrl: `${originUrl}/api/webhooks/duitku`,
                returnUrl: `${originUrl}/user/deposit`
            });

            if (duitkuRes?.statusCode === '00' && (duitkuRes.qrString || duitkuRes.paymentUrl)) {
                qrString = duitkuRes.qrString || duitkuRes.paymentUrl;
            } else {
                await prisma.deposit.update({ where: { id: deposit.id }, data: { status: 'FAILED' } });
                console.error('Duitku Error:', duitkuRes);
                return NextResponse.json({ error: 'Failed to generate Duitku transaction' }, { status: 500 });
            }
        } else {
            const pakasirRes = await createPakasirTransaction(gatewayConfig, {
                orderId: deposit.id,
                amount: totalPay
            });

            if (!pakasirRes?.payment?.payment_number) {
                await prisma.deposit.update({ where: { id: deposit.id }, data: { status: 'FAILED' } });
                console.error('Pakasir Error:', pakasirRes);
                return NextResponse.json({ error: 'Failed to generate QRIS' }, { status: 500 });
            }
            qrString = pakasirRes.payment.payment_number;
        }

        // 5. Update Deposit with QRIS
        await prisma.deposit.update({
            where: { id: deposit.id },
            data: {
                qrisString: qrString,
                expiredAt: new Date(Date.now() + (activeGatewayStr === 'duitku' ? 60 : 10) * 60 * 1000)
            }
        });

        return NextResponse.json({
            success: true,
            depositId: deposit.id,
            qris: qrString,
            amount: depositAmount,
            fee: totalFee,
            total: totalPay,
            expiredAt: new Date(Date.now() + (activeGatewayStr === 'duitku' ? 60 : 10) * 60 * 1000)
        });

    } catch (error) {
        console.error('Deposit Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
