import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const iconContent = await prisma.siteContent.findUnique({
            where: { slug: 'wallet_topup_icon' }
        });

        return NextResponse.json({
            walletIconUrl: iconContent?.content || ''
        });
    } catch (error) {
        console.error('Error fetching Topup Icon config:', error);
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

        const siteContent = await prisma.siteContent.upsert({
            where: { slug: 'wallet_topup_icon' },
            update: { content: data.walletIconUrl || '', title: 'Wallet Topup Icon' },
            create: { slug: 'wallet_topup_icon', content: data.walletIconUrl || '', title: 'Wallet Topup Icon' }
        });

        return NextResponse.json({ walletIconUrl: siteContent.content });
    } catch (error) {
        console.error('Error saving Topup Icon config:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
