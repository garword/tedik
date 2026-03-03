
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { refundOrder } from '@/lib/refund';

export const dynamic = 'force-dynamic';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: Request) {
    // 🔒 Auth Check — harus ada header Authorization: Bearer <CRON_SECRET>
    const authHeader = (req as any).headers?.get('authorization') ?? '';
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. Find Stale Orders
        const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

        const staleOrders = await prisma.order.findMany({
            where: {
                status: { in: ['PENDING', 'PROCESSING'] },
                createdAt: { lt: tenMinutesAgo },
            },
            take: 50
        });

        const results = {
            processed: 0,
            refunded: 0,
            canceled: 0,
            errors: 0
        };

        for (const order of staleOrders) {
            results.processed++;

            if (order.status === 'PROCESSING') {
                const res = await refundOrder(order.id, 'Timeout > 10 Minutes (Auto Refund)');
                if (res.success) results.refunded++;
                else results.errors++;
            } else if (order.status === 'PENDING') {
                await prisma.order.update({
                    where: { id: order.id },
                    data: { status: 'CANCELED' }
                });
                results.canceled++;
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Timeout check completed',
            results
        });

    } catch (error) {
        console.error('Cron Timeout Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
