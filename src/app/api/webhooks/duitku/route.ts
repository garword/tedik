import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getDuitkuConfig, verifyDuitkuCallback } from '@/lib/duitku';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

// Force rebuild
export const maxDuration = 60; // Sama seperti Pak Kasir, untuk handle auto-fulfill yang lama

export async function POST(req: Request) {
    try {
        // PERHATIAN: Duitku mengirim callback dalam format `x-www-form-urlencoded`
        // Bukan JSON. Jadi kita harus parse sebagai formData atau text lalu URLSearchParams.
        const text = await req.text();
        const params = new URLSearchParams(text);

        // Ambil field penting yang dikirim Duitku
        const merchantCode = params.get('merchantCode');
        const amount = params.get('amount'); // Nominal transaksi
        const merchantOrderId = params.get('merchantOrderId');
        const resultCode = params.get('resultCode'); // "00" = Success, "01" = Failed
        const reference = params.get('reference');
        const signature = params.get('signature');

        const bodyLog = Object.fromEntries(params.entries());
        console.log('[Duitku Webhook] Received:', bodyLog);

        // -- Logging file sementara untuk debug --
        try {
            const logPath = join(process.cwd(), 'webhook-logs.json');
            const existingLogs = JSON.parse(await readFile(logPath, 'utf-8').catch(() => '[]'));
            existingLogs.unshift({
                timestamp: new Date().toISOString(),
                source: 'duitku',
                data: bodyLog
            });
            await writeFile(logPath, JSON.stringify(existingLogs.slice(0, 50), null, 2));
        } catch (logError) {
            console.error('[Duitku Webhook] Log file error:', logError);
        }

        // 1. Verifikasi Parameter
        if (!merchantCode || !amount || !merchantOrderId || !signature) {
            console.error('[Duitku Webhook] Missing required parameters');
            // Duitku mengharapkan HTTP 200, return error bad request agar Duitku retry/tahu error
            return NextResponse.json({ error: 'Bad Parameter' }, { status: 400 });
        }

        // 2. Verifikasi Signature
        const config = await getDuitkuConfig();
        if (!config || !config.apiKey) {
            console.error('[Duitku Webhook] Gateway config not found');
            return NextResponse.json({ error: 'Config missing' }, { status: 500 });
        }

        const isValid = verifyDuitkuCallback(config, {
            amount,
            merchantOrderId,
            signature
        });

        if (!isValid) {
            console.error('[Duitku Webhook] Invalid signature mismatch');
            return NextResponse.json({ error: 'Bad Signature' }, { status: 400 });
        }

        // Mapping status dari Duitku
        // "00" = Success, selain itu biasanya Failed ("01")
        const isSuccess = resultCode === '00';

        // 3. Tangani Pesanan (Orders)
        const order = await prisma.order.findUnique({
            where: { invoiceCode: merchantOrderId },
            include: {
                orderItems: {
                    include: {
                        variant: {
                            include: {
                                product: { include: { category: true } },
                                providers: true
                            }
                        }
                    }
                }
            }
        });

        if (!order) {
            // 3.5. Jika bukan Order, cek Deposit (Top Up Saldo)
            const deposit = await prisma.deposit.findUnique({
                where: { id: merchantOrderId }
            });

            if (deposit) {
                if (isSuccess) {
                    if (deposit.status === 'PAID') {
                        return NextResponse.json({ message: 'Already processed' });
                    }

                    // Aksi Atomik: Tambah saldo User
                    await prisma.$transaction(async (tx) => {
                        const user = await tx.user.findUnique({ where: { id: deposit.userId } });
                        if (!user) throw new Error("User not found");

                        // Mark Deposit = PAID
                        await tx.deposit.update({
                            where: { id: deposit.id },
                            data: { status: 'PAID' }
                        });

                        // Tambahkan Balance
                        const currentBalance = Number(user.balance);
                        const depositAmount = Number(deposit.amount);
                        const newBalance = currentBalance + depositAmount;

                        await tx.user.update({
                            where: { id: user.id },
                            data: { balance: newBalance }
                        });

                        // Log history wallet
                        await tx.walletTransaction.create({
                            data: {
                                userId: user.id,
                                type: 'DEPOSIT',
                                amount: deposit.amount,
                                balanceBefore: currentBalance,
                                balanceAfter: newBalance,
                                referenceId: deposit.id,
                                description: `Deposit via Duitku`
                            }
                        });
                    });

                    return NextResponse.json({ success: true, type: 'DEPOSIT' });
                } else {
                    // Jika gagal atau dibatalkan
                    await prisma.deposit.update({
                        where: { id: deposit.id },
                        data: { status: 'CANCELED' }
                    });
                    return NextResponse.json({ success: true, status: 'CANCELED' });
                }
            }

            return NextResponse.json({ error: 'Order/Deposit not found' }, { status: 404 });
        }

        // 4. Update Status Order
        if (isSuccess) {
            // Idempotency check: Jangan proses dua kali
            if (order.status === 'DELIVERED' || order.status === 'PROCESSING') {
                return NextResponse.json({ message: 'Already processed' });
            }

            // Ubah menjadi PROCESSING
            await prisma.order.update({
                where: { id: order.id },
                data: { status: 'PROCESSING' }
            });

            // 5. Eksekusi Fulfillment (Proses topup otomatis)
            const { fulfillOrder } = await import('@/lib/order-fulfillment');
            await fulfillOrder(order.id);

        } else {
            // "01" Failed atau status lain
            await prisma.order.update({
                where: { id: order.id },
                data: { status: 'CANCELED' }
            });
        }

        // HARUS KEMBALIKAN HTTP 200 AGAR DUITKU TIDAK RETRY
        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[Duitku Webhook] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
