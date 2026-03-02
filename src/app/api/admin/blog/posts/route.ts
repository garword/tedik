import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

// GET: Ambil Semua Artikel (Bisa difilter untuk Admin)
export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const includeAuthor = url.searchParams.get('includeAuthor') === 'true';

        const posts = await prisma.blogPost.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                category: true,
                tags: true,
                ...(includeAuthor ? { author: { select: { id: true, name: true, role: true } } } : {})
            }
        });
        return NextResponse.json(posts);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Buat Artikel Baru
export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        let { title, slug, content, excerpt, thumbnailUrl, categoryId, tagIds, isPublished } = await req.json();

        if (isPublished) {
            if (!title || !slug || !content || !categoryId) {
                return NextResponse.json({ error: 'Title, slug, content, and category are required for publishing' }, { status: 400 });
            }
        } else {
            if (!title) {
                return NextResponse.json({ error: 'Title is required for draft' }, { status: 400 });
            }
        }

        let finalSlug = slug || `draft-${Date.now()}`;
        let finalContent = content || '';
        let finalCategoryId = categoryId;

        if (!finalCategoryId) {
            let defaultCat = await prisma.blogCategory.findFirst({ where: { slug: 'uncategorized' } });
            if (!defaultCat) {
                defaultCat = await prisma.blogCategory.create({ data: { name: 'Uncategorized', slug: 'uncategorized' } });
            }
            finalCategoryId = defaultCat.id;
        }

        const existing = await prisma.blogPost.findUnique({
            where: { slug: finalSlug }
        });

        if (existing) {
            if (!slug) {
                finalSlug = `${finalSlug}-${Math.floor(Math.random() * 1000)}`;
            } else {
                return NextResponse.json({ error: 'URL Slug sudah dipakai oleh artikel lain.' }, { status: 400 });
            }
        }

        // Siapkan koneksi tags (Many-to-Many)
        const tagsConnect = Array.isArray(tagIds) ? tagIds.map(id => ({ id })) : [];

        const post = await prisma.blogPost.create({
            data: {
                title,
                slug: finalSlug,
                content: finalContent,
                excerpt,
                thumbnailUrl,
                isPublished: Boolean(isPublished),
                authorId: session.userId,
                categoryId: finalCategoryId,
                tags: {
                    connect: tagsConnect
                }
            },
            include: {
                category: true,
                tags: true
            }
        });

        return NextResponse.json(post);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Update Artikel
export async function PUT(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        let { id, title, slug, content, excerpt, thumbnailUrl, categoryId, tagIds, isPublished } = await req.json();

        if (isPublished) {
            if (!id || !title || !slug || !content || !categoryId) {
                return NextResponse.json({ error: 'Missing mandatory fields for publish' }, { status: 400 });
            }
        } else {
            if (!id || !title) {
                return NextResponse.json({ error: 'ID and Title are required for draft' }, { status: 400 });
            }
        }

        let finalSlug = slug || `draft-${id.substring(0, 8)}`;
        let finalContent = content || '';
        let finalCategoryId = categoryId;

        if (!finalCategoryId) {
            let defaultCat = await prisma.blogCategory.findFirst({ where: { slug: 'uncategorized' } });
            if (!defaultCat) {
                defaultCat = await prisma.blogCategory.create({ data: { name: 'Uncategorized', slug: 'uncategorized' } });
            }
            finalCategoryId = defaultCat.id;
        }

        const existing = await prisma.blogPost.findFirst({
            where: {
                slug: finalSlug,
                NOT: { id }
            }
        });

        if (existing) {
            if (!slug) {
                finalSlug = `${finalSlug}-${Math.floor(Math.random() * 1000)}`;
            } else {
                return NextResponse.json({ error: 'URL Slug sudah dipakai oleh artikel lain.' }, { status: 400 });
            }
        }

        const tagsConnect = Array.isArray(tagIds) ? tagIds.map(tId => ({ id: tId })) : [];

        const post = await prisma.blogPost.update({
            where: { id },
            data: {
                title,
                slug: finalSlug,
                content: finalContent,
                excerpt,
                thumbnailUrl,
                isPublished: Boolean(isPublished),
                categoryId: finalCategoryId,
                tags: {
                    set: [], // Hapus relasi lama
                    connect: tagsConnect // Pasang relasi baru
                }
            },
            include: {
                category: true,
                tags: true
            }
        });

        return NextResponse.json(post);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: Hapus Artikel
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

        await prisma.blogPost.delete({
            where: { id }
        });

        return NextResponse.json({ success: true, message: 'Artikel berhasil dihapus' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
