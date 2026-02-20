
import { NextResponse } from 'next/server';
// Force rebuild
import prisma from '@/lib/prisma';
import { getTokoVoucherConfig, createTokoVoucherOrder } from '@/lib/tokovoucher';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

// To handle Vercel timeout for long running processes (Digiflazz/TokoVoucher calls),
// ideally we should use background jobs, but for now we do it inline.
export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { order_id, status } = body;

        console.log('[Pakasir Webhook] Received:', body);

        // Log to file for debugging
        try {
            const logPath = join(process.cwd(), 'webhook-logs.json');
            const existingLogs = JSON.parse(await readFile(logPath, 'utf-8').catch(() => '[]'));
            existingLogs.unshift({
                timestamp: new Date().toISOString(),
                data: body
            });
            await writeFile(logPath, JSON.stringify(existingLogs.slice(0, 50), null, 2));
        } catch (logError) {
            console.error('[Pakasir Webhook] Log file error:', logError);
        }

        // 1. Find Order
        const order = await prisma.order.findUnique({
            where: { invoiceCode: order_id },
            include: {
                orderItems: {
                    include: {
                        variant: {
                            include: {
                                product: {
                                    include: { category: true }
                                },
                                providers: true // Get ALL providers (not just DIGIFLAZZ)
                            }
                        }
                    }
                }
            }
        });

        if (!order) {
            // 1.5 Check for Deposit (if not Order)
            const deposit = await prisma.deposit.findUnique({
                where: { id: order_id }
            });

            if (deposit) {
                if (status === 'completed') {
                    if (deposit.status === 'PAID') {
                        return NextResponse.json({ message: 'Already processed' });
                    }

                    // ATOMIC TRANSACTION: Credit Balance
                    await prisma.$transaction(async (tx) => {
                        const user = await tx.user.findUnique({ where: { id: deposit.userId } });
                        if (!user) throw new Error("User not found");

                        // 1. Mark Deposit as PAID
                        await tx.deposit.update({
                            where: { id: deposit.id },
                            data: { status: 'PAID' }
                        });

                        // 2. Increment User Balance
                        // Note: Prisma Decimal handling. Safe to use increment for simple update, 
                        // but we need values for the log.
                        const currentBalance = Number(user.balance);
                        const amount = Number(deposit.amount);
                        const newBalance = currentBalance + amount;

                        await tx.user.update({
                            where: { id: user.id },
                            data: { balance: newBalance }
                        });

                        // 3. Log Transaction
                        await tx.walletTransaction.create({
                            data: {
                                userId: user.id,
                                type: 'DEPOSIT',
                                amount: deposit.amount,
                                balanceBefore: currentBalance,
                                balanceAfter: newBalance,
                                referenceId: deposit.id,
                                description: `Deposit via ${deposit.paymentMethod}`
                            }
                        });
                    });

                    return NextResponse.json({ success: true, type: 'DEPOSIT' });
                } else if (status === 'canceled' || status === 'failed' || status === 'expired') {
                    await prisma.deposit.update({
                        where: { id: deposit.id },
                        data: { status: 'CANCELED' }
                    });
                    return NextResponse.json({ success: true, status: 'CANCELED' });
                }

                return NextResponse.json({ message: 'Ignored status for deposit' });
            }

            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // 2. Verify Payment Status
        if (status === 'completed') {
            // Idempotency check? If already processing/delivered, skip?
            if (order.status === 'DELIVERED' || order.status === 'PROCESSING') {
                return NextResponse.json({ message: 'Already processed' });
            }

            // Update to PROCESSING
            await prisma.order.update({
                where: { id: order.id },
                data: { status: 'PROCESSING' }
            });

            // 3. Process Fulfillment (Centralized)
            const { fulfillOrder } = await import('@/lib/order-fulfillment');
            await fulfillOrder(order.id);

        } else if (status === 'canceled' || status === 'failed') {
            await prisma.order.update({
                where: { id: order.id },
                data: { status: 'CANCELED' }
            });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('[Pakasir Webhook] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
