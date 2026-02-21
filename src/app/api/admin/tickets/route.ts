import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status');

        const whereClause: any = {};
        if (status) {
            whereClause.status = status;
        }

        const tickets = await prisma.ticket.findMany({
            where: whereClause,
            include: {
                user: {
                    select: { name: true, email: true, username: true }
                },
                orderItem: {
                    select: {
                        providerTrxId: true,
                        productName: true,
                        target: true
                    }
                },
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        // Add an extra field easily accessible for the frontend showing provider ID
        const formattedTickets = tickets.map((t: any) => ({
            ...t,
            providerTrxId: t.orderItem?.providerTrxId || null
        }));

        return NextResponse.json({ success: true, tickets: formattedTickets });

    } catch (error: any) {
        console.error('Fetch Admin Tickets Error:', error);
        return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
    }
}
