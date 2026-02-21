import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

// GET: Fetch all user tickets
export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const tickets = await prisma.ticket.findMany({
            where: { userId: session.userId },
            include: {
                orderItem: true,
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        return NextResponse.json({ success: true, tickets });
    } catch (error: any) {
        console.error('Fetch Tickets Error:', error);
        return NextResponse.json({ error: 'Terjadi kesalahan internal' }, { status: 500 });
    }
}

// POST: Create a new ticket
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { orderItemId, subject, message } = await req.json();

        if (!subject || !message) {
            return NextResponse.json({ error: 'Subjek dan Pesan harus diisi' }, { status: 400 });
        }

        // Validate OrderItem ownership to prevent creating tickets for others' orders
        if (orderItemId) {
            const orderItem = await prisma.orderItem.findFirst({
                where: {
                    id: orderItemId,
                    order: { userId: session.userId }
                }
            });

            if (!orderItem) {
                return NextResponse.json({ error: 'Pesanan tidak ditemukan atau bukan milik Anda' }, { status: 404 });
            }
        }

        const newTicket = await prisma.$transaction(async (tx: any) => {
            const ticket = await tx.ticket.create({
                data: {
                    userId: session.userId,
                    orderItemId: orderItemId || null,
                    subject: subject,
                    status: 'OPEN',
                }
            });

            await tx.ticketMessage.create({
                data: {
                    ticketId: ticket.id,
                    senderId: session.userId,
                    message: message,
                    isRead: true // Sender read their own message
                }
            });

            return ticket;
        });

        return NextResponse.json({ success: true, ticket: newTicket, msg: 'Tiket berhasil dikirim' }, { status: 201 });

    } catch (error: any) {
        console.error('Create Ticket Error:', error);
        return NextResponse.json({ error: 'Gagal membuat tiket bantuan' }, { status: 500 });
    }
}
