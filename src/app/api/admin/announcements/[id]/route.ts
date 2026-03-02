import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await req.json();

        if (!data.title || !data.content) {
            return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
        }

        const announcement = await prisma.announcement.update({
            where: { id },
            data: {
                title: data.title,
                content: data.content,
                type: data.type || 'info',
                isActive: data.isActive !== undefined ? data.isActive : true,
                isPinned: data.isPinned !== undefined ? data.isPinned : false,
                startDate: data.startDate ? new Date(data.startDate) : null,
                endDate: data.endDate ? new Date(data.endDate) : null,
                sortOrder: data.sortOrder || 0,
            }
        });

        return NextResponse.json(announcement);
    } catch (error) {
        console.error('Error updating announcement:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await prisma.announcement.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
