import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const setting = await prisma.siteSetting.findUnique({
            where: { key: 'active_payment_gateway' }
        });

        return NextResponse.json({ activeGateway: setting?.value || 'pakasir' });
    } catch (error) {
        console.error('Error fetching active payment gateway:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { activeGateway } = await req.json();

        if (activeGateway !== 'pakasir' && activeGateway !== 'duitku') {
            return NextResponse.json({ error: 'Invalid gateway selection' }, { status: 400 });
        }

        const config = await prisma.siteSetting.upsert({
            where: { key: 'active_payment_gateway' },
            update: { value: activeGateway },
            create: { key: 'active_payment_gateway', value: activeGateway }
        });

        return NextResponse.json({ success: true, activeGateway: config.value });
    } catch (error) {
        console.error('Error saving active payment gateway:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
