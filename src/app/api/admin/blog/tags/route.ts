import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

// GET: Ambil Semua Tag
export async function GET() {
    try {
        const tags = await prisma.blogTag.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { posts: true }
                }
            }
        });
        return NextResponse.json(tags);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Buat Tag Baru
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { name, slug } = await req.json();

        if (!name || !slug) {
            return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
        }

        const existing = await prisma.blogTag.findUnique({
            where: { slug }
        });

        if (existing) {
            return NextResponse.json({ error: 'Tag slug sudah ada.' }, { status: 400 });
        }

        const tag = await prisma.blogTag.create({
            data: { name, slug }
        });

        return NextResponse.json(tag);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Update Tag
export async function PUT(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id, name, slug } = await req.json();

        if (!id || !name || !slug) {
            return NextResponse.json({ error: 'ID, name, and slug are required' }, { status: 400 });
        }

        const existing = await prisma.blogTag.findFirst({
            where: {
                slug,
                NOT: { id }
            }
        });

        if (existing) {
            return NextResponse.json({ error: 'Tag slug sudah dipakai yang lain.' }, { status: 400 });
        }

        const tag = await prisma.blogTag.update({
            where: { id },
            data: { name, slug }
        });

        return NextResponse.json(tag);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Hapus Tag
export async function DELETE(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const url = new URL(req.url);
        const id = url.searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'ID is required' }, { status: 400 });
        }

        await prisma.blogTag.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: 'Tag berhasil dihapus' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
