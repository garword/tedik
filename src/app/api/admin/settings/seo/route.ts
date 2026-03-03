import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';
import { logAdminAction } from '@/lib/audit';
import { invalidateSeoCache } from '@/lib/seo';

const SLUG = 'seo_config';

export async function GET() {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const record = await prisma.siteContent.findUnique({ where: { slug: SLUG } });
        const data = record?.content ? JSON.parse(record.content) : {};
        return NextResponse.json(data);
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await req.json();

        // Sanitasi: hanya simpan field yang diizinkan
        const allowed = [
            'siteName', 'siteUrl', 'tagline', 'description',
            'logoUrl', 'ogImageUrl', 'keywords', 'googleVerification', 'twitterHandle'
        ];
        const clean: Record<string, string> = {};
        for (const key of allowed) {
            if (body[key] !== undefined) {
                clean[key] = String(body[key]).trim();
            }
        }

        // Validasi URL format
        if (clean.siteUrl && !clean.siteUrl.startsWith('http')) {
            clean.siteUrl = `https://${clean.siteUrl}`;
        }

        // Ambil data lama dulu untuk merge
        const existing = await prisma.siteContent.findUnique({ where: { slug: SLUG } });
        const oldData = existing?.content ? JSON.parse(existing.content) : {};
        const newData = { ...oldData, ...clean };

        await prisma.siteContent.upsert({
            where: { slug: SLUG },
            update: { content: JSON.stringify(newData) },
            create: {
                slug: SLUG,
                title: 'SEO Configuration',
                content: JSON.stringify(newData),
            },
        });

        // Invalidate cache agar perubahan langsung berlaku
        invalidateSeoCache();

        await logAdminAction(session.userId, 'UPDATE_SEO_SETTINGS', 'Updated SEO & Site Identity Configuration');

        return NextResponse.json({ message: 'SEO settings saved', data: newData });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
