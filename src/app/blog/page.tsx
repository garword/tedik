import { Metadata } from 'next';
import prisma from '@/lib/prisma';
import Footer from '@/components/layout/Footer';
import BlogListClient from '@/components/features/blog/BlogListClient';
import { getSeoConfig } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
    const seo = await getSeoConfig();
    return {
        title: 'Blog & Artikel Edukasi',
        description: `Kumpulan artikel, tutorial, dan berita seputar dunia digital dari ${seo.siteName}. Update setiap minggu.`,
        openGraph: {
            title: `Blog & Artikel | ${seo.siteName}`,
            description: `Kumpulan artikel, tutorial, dan berita seputar dunia digital dari ${seo.siteName}.`,
            type: 'website',
        },
    };
}

export default async function BlogIndexPage() {
    // Ambil artikel yang hanya isPublished = true
    const posts = await prisma.blogPost.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: 'desc' },
        include: {
            category: true,
            tags: true
        }
    });

    return (
        <div className="min-h-screen bg-transparent font-sans relative">
            {/* Background Pattern */}
            <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

            <div className="relative z-10 pb-24">

                {/* Header Hero */}
                <header className="bg-emerald-600 text-white py-16 px-4 text-center">
                    <div className="max-w-4xl mx-auto space-y-4">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Kabar Digital & Edukasi</h1>
                        <p className="text-emerald-100 text-lg md:text-xl max-w-2xl mx-auto">
                            Temukan insight, tutorial teknis, dan berita terbaru seputar dunia layanan digital yang kami sajikan khusus untuk Anda.
                        </p>
                    </div>
                </header>

                {/* Interactive Blog List with Search */}
                <BlogListClient initialPosts={posts} />

            </div>
            <Footer />
        </div>
    );
}
