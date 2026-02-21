import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function GET() {
    const session = await getSession();
    // if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const apiKey = await prisma.siteContent.findUnique({ where: { slug: 'vaksms_api_key' } });
    const rubRate = await prisma.siteContent.findUnique({ where: { slug: 'vaksms_rub_rate' } });
    const margin = await prisma.siteContent.findUnique({ where: { slug: 'vaksms_margin_percent' } });
    const isActive = await prisma.siteContent.findUnique({ where: { slug: 'vaksms_is_active' } });
    const tierActive = await prisma.siteContent.findUnique({ where: { slug: 'vaksms_tier_active' } });

    return NextResponse.json({
        config: {
            apiKey: apiKey?.content || '',
            rubRate: rubRate?.content || '200',
            marginPercent: margin?.content || '20',
            isActive: isActive?.content === 'true',
            tierActive: tierActive?.content === 'true'
        }
    });
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    // if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { apiKey, rubRate, marginPercent, isActive, tierActive } = body;

    await prisma.siteContent.upsert({
        where: { slug: 'vaksms_api_key' },
        create: { slug: 'vaksms_api_key', content: apiKey },
        update: { content: apiKey }
    });

    await prisma.siteContent.upsert({
        where: { slug: 'vaksms_rub_rate' },
        create: { slug: 'vaksms_rub_rate', content: String(rubRate) },
        update: { content: String(rubRate) }
    });

    await prisma.siteContent.upsert({
        where: { slug: 'vaksms_margin_percent' },
        create: { slug: 'vaksms_margin_percent', content: String(marginPercent) },
        update: { content: String(marginPercent) }
    });

    await prisma.siteContent.upsert({
        where: { slug: 'vaksms_is_active' },
        create: { slug: 'vaksms_is_active', content: String(isActive) },
        update: { content: String(isActive) }
    });

    await prisma.siteContent.upsert({
        where: { slug: 'vaksms_tier_active' },
        create: { slug: 'vaksms_tier_active', content: String(tierActive) },
        update: { content: String(tierActive) }
    });

    return NextResponse.json({ success: true });
}
