import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id: ticketId } = await params;

        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId },
            include: {
                user: {
                    select: { name: true, email: true, username: true, role: true }
                },
                orderItem: {
                    select: {
                        providerTrxId: true,
                        productName: true,
                        target: true
                    }
                },
                messages: {
                    orderBy: { createdAt: 'asc' },
                    include: {
                        sender: { select: { id: true, name: true, role: true } }
                    }
                }
            }
        });

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
        }

        const formattedTicket = {
            ...ticket,
            providerTrxId: ticket.orderItem?.providerTrxId || null
        };

        return NextResponse.json({ success: true, ticket: formattedTicket });

    } catch (error: any) {
        console.error('Fetch Admin Ticket Detail Error:', error);
        return NextResponse.json({ error: 'Failed to fetch ticket details' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id: ticketId } = await params;
        const { status } = await req.json();

        if (!status) {
            return NextResponse.json({ error: 'Missing status' }, { status: 400 });
        }

        const validStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED'];
        if (!validStatuses.includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        }

        const updatedTicket = await prisma.ticket.update({
            where: { id: ticketId },
            data: { status }
        });

        return NextResponse.json({ success: true, ticket: updatedTicket });

    } catch (error: any) {
        console.error('Update Ticket Status Error:', error);
        return NextResponse.json({ error: 'Failed to update ticket status' }, { status: 500 });
    }
}
