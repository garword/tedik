import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
    try {
        const session = await getSession();
        if (!session?.id) {
            return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
        }

        // Cari pesanan yang masih WAITING dan milik user ini
        const activeOrder = await prisma.virtualNumberOrder.findFirst({
            where: {
                userId: session.id,
                status: 'WAITING'
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (!activeOrder) {
            return NextResponse.json({ success: true, data: null });
        }

        // Cek Expired (5 Menit) - Sama seperti logika status
        const elapsed = Date.now() - new Date(activeOrder.createdAt).getTime();
        const MAX_TIME = 5 * 60 * 1000;

        if (elapsed > MAX_TIME) {
            // Biarkan endpoint status yang memproses cancel-nya jika di-hit, 
            // atau kita kembalikan saja null agar UI reset, 
            // tapi lebih bagus kembalikan data agar client nge-hit /status dan trigger refund.
        }

        return NextResponse.json({ success: true, data: activeOrder });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
