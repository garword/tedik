import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET(req: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const announcements = await prisma.announcement.findMany({
            orderBy: [
                { isPinned: 'desc' },
                { sortOrder: 'asc' },
                { createdAt: 'desc' },
            ]
        });

        return NextResponse.json(announcements);
    } catch (error) {
        console.error('Error fetching announcements:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const data = await req.json();

        // Validate basic fields
        if (!data.title || !data.content) {
            return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
        }

        const announcement = await prisma.announcement.create({
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
        console.error('Error creating announcement:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
