import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

// GET: Ambil Semua Kategori Blog
export async function GET() {
    try {
        const categories = await prisma.blogCategory.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                _count: {
                    select: { posts: true }
                }
            }
        });
        return NextResponse.json(categories);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Buat Kategori Blog Baru
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { name, slug, description } = await req.json();

        if (!name || !slug) {
            return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 });
        }

        // Cek apakah slug sudah ada
        const existing = await prisma.blogCategory.findUnique({
            where: { slug }
        });

        if (existing) {
            return NextResponse.json({ error: 'Slug sudah digunakan oleh kategori lain.' }, { status: 400 });
        }

        const category = await prisma.blogCategory.create({
            data: { name, slug, description }
        });

        return NextResponse.json(category);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Update Kategori
export async function PUT(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id, name, slug, description } = await req.json();

        if (!id || !name || !slug) {
            return NextResponse.json({ error: 'ID, name, and slug are required' }, { status: 400 });
        }

        // Cek apakah slug sudah dipakai oleh ID lain
        const existing = await prisma.blogCategory.findFirst({
            where: {
                slug,
                NOT: { id }
            }
        });

        if (existing) {
            return NextResponse.json({ error: 'Slug sudah digunakan oleh kategori lain.' }, { status: 400 });
        }

        const category = await prisma.blogCategory.update({
            where: { id },
            data: { name, slug, description }
        });

        return NextResponse.json(category);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Hapus Kategori
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

        // Cek apakah kategori sedang dipakai oleh post
        const category = await prisma.blogCategory.findUnique({
            where: { id },
            include: { _count: { select: { posts: true } } }
        });

        if (!category) {
            return NextResponse.json({ error: 'Category not found' }, { status: 404 });
        }

        if (category._count.posts > 0) {
            return NextResponse.json({
                error: `Tidak bisa dihapus: Kategori ini sedang digunakan oleh ${category._count.posts} artikel.`
            }, { status: 400 });
        }

        await prisma.blogCategory.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: 'Kategori berhasil dihapus' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
