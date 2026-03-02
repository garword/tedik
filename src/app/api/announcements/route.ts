import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const now = new Date();

        const announcements = await prisma.announcement.findMany({
            where: {
                isActive: true,
                AND: [
                    {
                        OR: [
                            { startDate: null },
                            { startDate: { lte: now } }
                        ]
                    },
                    {
                        OR: [
                            { endDate: null },
                            { endDate: { gte: now } }
                        ]
                    }
                ]
            },
            orderBy: [
                { isPinned: 'desc' },
                { sortOrder: 'asc' },
                { createdAt: 'desc' },
            ]
        });

        return NextResponse.json(announcements);
    } catch (error) {
        console.error('Error fetching public announcements:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
