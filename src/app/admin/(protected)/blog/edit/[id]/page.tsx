import prisma from '@/lib/prisma';
import BlogPostForm from '@/components/features/admin/BlogPostForm';
import { notFound } from 'next/navigation';

export const metadata = {
    title: 'Edit Artikel - Admin Panel',
};

export default async function EditBlogPostPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const post = await prisma.blogPost.findUnique({
        where: { id },
        include: { tags: true }
    });

    if (!post) {
        // Jika artikel tidak ditemukan, lemparkan error 404
        notFound();
    }

    return (
        <BlogPostForm initialData={post} />
    );
}
