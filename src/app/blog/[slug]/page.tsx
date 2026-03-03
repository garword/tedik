import { Metadata, ResolvingMetadata } from 'next';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar, Clock, ChevronRight, ArrowRight, Eye } from 'lucide-react';
import ShareButtons from '@/components/features/blog/ShareButtons';
import ImageFallback from '@/components/ui/ImageFallback';
import Footer from '@/components/layout/Footer';

interface Props {
    params: Promise<{ slug: string }>;
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// 1. Ambil Data Artikel dari DB
async function getPost(slug: string) {
    const post = await prisma.blogPost.findUnique({
        where: { slug: slug },
        include: {
            category: true,
            tags: true
        }
    }) as any;

    if (!post || !post.isPublished) {
        return null;
    }

    // Update View Count (Background Async)
    prisma.blogPost.update({
        where: { id: post.id },
        data: { viewCount: { increment: 1 } }
    }).catch(console.error);

    return post;
}

// 2. Generate Next.js Dynamic Metadata (Open Graph & Twitter)
export async function generateMetadata(
    { params }: Props,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const { slug } = await params;
    const post = await getPost(slug);

    if (!post) {
        return {
            title: 'Artikel Tidak Ditemukan',
            description: 'Artikel yang Anda cari tidak ada atau sudah dihapus.'
        };
    }

    const previousImages = (await parent).openGraph?.images || [];
    const imageUrl = post.thumbnailUrl ? post.thumbnailUrl : '/logo.png'; // Fallback ke logo situs 

    return {
        title: post.title,
        description: post.excerpt,
        openGraph: {
            title: post.title,
            description: post.excerpt,
            type: 'article',
            publishedTime: post.createdAt?.toISOString(),
            authors: ['Admin'],
            tags: post.tags.map((t: any) => t.name),
            images: [imageUrl, ...previousImages],
        },
        twitter: {
            card: 'summary_large_image',
            title: post.title,
            description: post.excerpt,
            images: [imageUrl],
        }
    };
}

// 3. Helper to estimate reading time
function estimateReadingTime(text: string) {
    const wpm = 225;
    const words = text.trim().split(/\s+/).length;
    const time = Math.ceil(words / wpm);
    return time || 1;
}

// 4. Render Halaman Utama & JSON-LD
export default async function BlogPostPage({ params }: Props) {
    const { slug } = await params;
    const post = await getPost(slug);

    if (!post) {
        notFound();
    }

    const readingTime = estimateReadingTime(post.content);

    // Ambil artikel terkait (Kategori sama, batasi 3 terbaru)
    const relatedPosts = await prisma.blogPost.findMany({
        where: {
            isPublished: true,
            categoryId: post.categoryId,
            id: { not: post.id }
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
        include: { category: true }
    });

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'NewsArticle',
        headline: post.title,
        description: post.excerpt,
        image: [
            post.thumbnailUrl || `${process.env.NEXT_PUBLIC_APP_URL || 'https://example.com'}/logo.png`
        ],
        datePublished: post.createdAt?.toISOString(),
        dateModified: post.updatedAt.toISOString(),
        author: [{
            '@type': 'Person',
            name: 'Admin',
            url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://example.com'}/info/about`
        }],
        publisher: {
            '@type': 'Organization',
            name: post.category?.name || 'Blog',
        },
        url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://example.com'}/blog/${post.slug}`,
        mainEntityOfPage: `${process.env.NEXT_PUBLIC_APP_URL || 'https://example.com'}/blog/${post.slug}`,
    };

    return (
        <div className="min-h-screen bg-transparent font-sans relative">
            {/* Background Pattern */}
            <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>

            <article className="relative z-10 pb-24 border-b border-gray-100">
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />

                {/* Breadcrumb Navigation */}
                <div className="border-b border-gray-100">
                    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <nav className="flex items-center text-sm text-gray-500 overflow-x-auto whitespace-nowrap">
                            <Link href="/" className="hover:text-emerald-600 transition-colors">Home</Link>
                            <ChevronRight className="w-4 h-4 mx-1 text-gray-300 flex-shrink-0" />
                            <Link href="/blog" className="hover:text-emerald-600 transition-colors">Blog</Link>
                            <ChevronRight className="w-4 h-4 mx-1 text-gray-300 flex-shrink-0" />
                            <Link href={`/blog/kategori/${post.category.slug}`} className="hover:text-emerald-600 transition-colors">
                                {post.category.name}
                            </Link>
                            <ChevronRight className="w-4 h-4 mx-1 text-gray-300 flex-shrink-0" />
                            <span className="text-gray-900 font-medium truncate max-w-[200px] sm:max-w-md">"{post.title}"</span>
                        </nav>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

                    {/* Hero Image / Cover */}
                    {post.thumbnailUrl && (
                        <div className="relative w-full aspect-video md:aspect-[21/9] rounded-[2rem] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.08)] mb-8 bg-gray-100">
                            <ImageFallback
                                src={post.thumbnailUrl}
                                alt={post.title}
                                className="w-full h-full object-cover"
                                fallbackSrc="https://placehold.co/800x400/e2e8f0/64748b"
                            />
                            {/* Floating Category Badge */}
                            <div className="absolute top-6 left-6 z-10">
                                <span className="bg-white/95 backdrop-blur text-emerald-600 font-bold px-4 py-1.5 rounded-full shadow-sm text-xs sm:text-sm tracking-wide uppercase">
                                    {post.category.name}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="max-w-4xl mx-auto bg-white rounded-[2rem] p-6 sm:p-10 md:p-14 shadow-sm ring-1 ring-gray-100">
                        {/* Meta Row: Date, Time, Tags */}
                        <div className="flex flex-wrap items-center gap-4 text-[13px] font-bold text-gray-500 mb-6 tracking-wide">
                            <div className="flex items-center gap-1.5 uppercase">
                                <Calendar className="w-4 h-4" />
                                <time dateTime={post.createdAt?.toISOString() || post.updatedAt.toISOString()}>
                                    {format(post.createdAt || post.updatedAt, 'dd MMM yyyy', { locale: id })}
                                </time>
                            </div>
                            <div className="flex items-center gap-1.5 uppercase">
                                <Clock className="w-4 h-4" />
                                <span>{readingTime} MIN BACA</span>
                            </div>
                            <div className="flex items-center gap-1.5 uppercase">
                                <Eye className="w-4 h-4" />
                                <span>{post.viewCount || 0} DILIHAT</span>
                            </div>
                            {/* Optional: Limit to first 3 tags for clean UI */}
                            {post.tags.slice(0, 3).map((t: any) => (
                                <Link key={t.id} href={`/blog/tag/${t.slug}`} className="bg-gray-100 px-3 py-1 rounded-full text-gray-600 hover:bg-gray-200 transition-colors">
                                    {t.name}
                                </Link>
                            ))}
                        </div>

                        {/* Headline */}
                        <h1 className="text-3xl md:text-4xl lg:text-[2.75rem] font-extrabold text-[#0f172a] leading-[1.15] mb-8 tracking-tight">
                            "{post.title}"
                        </h1>

                        {/* Blockquote Excerpt */}
                        {post.excerpt && (
                            <div className="pl-6 border-l-4 border-emerald-500 mb-10">
                                <p className="text-lg md:text-xl text-gray-600 leading-relaxed font-medium">
                                    {post.excerpt}
                                </p>
                            </div>
                        )}

                        {/* HTML Content Body */}
                        <div
                            className="prose prose-lg prose-emerald max-w-none prose-img:rounded-[1.5rem] prose-img:shadow-md text-gray-700 leading-relaxed
                        prose-headings:font-bold prose-headings:text-[#0f172a] prose-headings:tracking-tight prose-headings:mt-12
                        prose-a:text-emerald-600 prose-a:no-underline hover:prose-a:underline
                        prose-p:mb-6"
                            dangerouslySetInnerHTML={{ __html: post.content }}
                        />

                        {/* Share Buttons Component */}
                        <ShareButtons title={post.title} />

                    </div>
                </div>

                {/* Related Articles Section */}
                {relatedPosts.length > 0 && (
                    <div className="py-16 mt-12 border-t border-gray-100 bg-white/50 backdrop-blur-sm">
                        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                            <h3 className="text-2xl font-extrabold text-[#0f172a] mb-8">Artikel Terkait</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                                {relatedPosts.map((rPost: any) => (
                                    <div key={rPost.id} className="bg-white rounded-[2rem] overflow-hidden shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-gray-100/50 flex flex-col group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
                                        <Link href={`/blog/${rPost.slug}`} className="block relative aspect-[16/10] overflow-hidden bg-gray-100">
                                            {rPost.thumbnailUrl ? (
                                                <ImageFallback
                                                    src={rPost.thumbnailUrl}
                                                    alt={rPost.title}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400">Tanpa Gambar</div>
                                            )}
                                            <div className="absolute top-4 left-4 z-10">
                                                <span className="bg-white/95 backdrop-blur text-emerald-600 text-[11px] sm:text-xs font-bold px-4 py-1.5 rounded-full shadow-sm tracking-wide uppercase">
                                                    {rPost.category.name}
                                                </span>
                                            </div>
                                        </Link>
                                        <div className="p-6 sm:p-7 flex flex-col flex-1">
                                            <div className="text-xs text-gray-500 font-medium mb-3 flex items-center gap-3">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-4 h-4 text-gray-400" />
                                                    <time dateTime={rPost.createdAt?.toISOString() || rPost.updatedAt.toISOString()}>
                                                        {format(rPost.createdAt || rPost.updatedAt, 'dd MMM yyyy', { locale: id })}
                                                    </time>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Eye className="w-4 h-4 text-gray-400" />
                                                    <span>{rPost.viewCount || 0}x</span>
                                                </div>
                                            </div>
                                            <Link href={`/blog/${rPost.slug}`} className="block group-hover:text-emerald-600 transition-colors">
                                                <h2 className="text-[1.35rem] leading-snug font-extrabold text-[#0f172a] mb-3 line-clamp-2">
                                                    "{rPost.title}"
                                                </h2>
                                            </Link>
                                            <div className="pt-2 mt-auto">
                                                <Link
                                                    href={`/blog/${rPost.slug}`}
                                                    className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                                                >
                                                    Baca selengkapnya
                                                    <ArrowRight className="w-4 h-4" />
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </article>
            <div className="relative z-10">
                <Footer />
            </div>
        </div>
    );
}
