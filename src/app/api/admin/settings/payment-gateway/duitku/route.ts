import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const config = await prisma.paymentGatewayConfig.findUnique({
            where: { name: 'duitku' }
        });

        // Mengembalikan config kosong jika belum ada
        return NextResponse.json(config || {});
    } catch (error) {
        console.error('Error fetching Duitku config:', error);
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

        const config = await prisma.paymentGatewayConfig.upsert({
            where: { name: 'duitku' },
            update: {
                // Di schema, merchantCode disimpan di field 'slug'
                slug: data.merchantCode,
                apiKey: data.apiKey,
                mode: data.mode, // "SANDBOX" | "PRODUCTION"
                feePercentage: parseFloat(data.feePercentage || 0),
                feeFixed: data.feeFixed,
                isActive: data.isActive
            },
            create: {
                name: 'duitku',
                slug: data.merchantCode,
                apiKey: data.apiKey,
                mode: data.mode || 'SANDBOX',
                feePercentage: parseFloat(data.feePercentage || 0),
                feeFixed: data.feeFixed,
                isActive: data.isActive
            }
        });

        return NextResponse.json(config);
    } catch (error) {
        console.error('Error saving Duitku config:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
