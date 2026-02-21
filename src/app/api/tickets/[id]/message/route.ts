import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id: ticketId } = await params;
        const { message } = await req.json();

        if (!message || message.trim() === '') {
            return NextResponse.json({ error: 'Pesan tidak boleh kosong' }, { status: 400 });
        }

        // Verify ticket ownership for regular user
        const ticket = await prisma.ticket.findUnique({
            where: { id: ticketId }
        });

        if (!ticket) {
            return NextResponse.json({ error: 'Tiket tidak ditemukan' }, { status: 404 });
        }

        const user = await prisma.user.findUnique({ where: { id: session.userId } });
        const isAdmin = user?.role === 'ADMIN';

        if (ticket.userId !== session.userId && !isAdmin) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const newMessage = await prisma.$transaction(async (tx: any) => {
            const msg = await tx.ticketMessage.create({
                data: {
                    ticketId,
                    senderId: session.userId,
                    message,
                    isRead: true
                }
            });

            // Update ticket status based on who replied
            const newStatus = isAdmin ? 'WAITING_USER' : 'IN_PROGRESS';

            await tx.ticket.update({
                where: { id: ticketId },
                data: { status: newStatus }
            });

            return msg;
        });

        return NextResponse.json({ success: true, message: newMessage });

    } catch (error: any) {
        console.error('Send message error:', error);
        return NextResponse.json({ error: 'Gagal mengirim pesan' }, { status: 500 });
    }
}
