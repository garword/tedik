"use client";

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar, ArrowRight, Eye, Search, X } from 'lucide-react';
import ImageFallback from '@/components/ui/ImageFallback';

interface BlogPost {
    id: string;
    slug: string;
    title: string;
    excerpt: string | null;
    thumbnailUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
    viewCount: number;
    category: {
        id: string;
        name: string;
        slug: string;
    };
    tags: Array<{
        id: string;
        name: string;
        slug: string;
    }>;
}

interface BlogListClientProps {
    initialPosts: BlogPost[];
}

export default function BlogListClient({ initialPosts }: BlogListClientProps) {
    const [searchQuery, setSearchQuery] = useState('');

    // Filter posts based on search query
    const filteredPosts = useMemo(() => {
        if (!searchQuery.trim()) return initialPosts;

        const query = searchQuery.toLowerCase();
        return initialPosts.filter(post => {
            const matchTitle = post.title.toLowerCase().includes(query);
            const matchExcerpt = post.excerpt?.toLowerCase().includes(query) || false;
            const matchCategory = post.category.name.toLowerCase().includes(query);

            // Optional: Search by tag as well
            const matchTags = post.tags?.some(tag => tag.name.toLowerCase().includes(query));

            return matchTitle || matchExcerpt || matchCategory || matchTags;
        });
    }, [initialPosts, searchQuery]);

    return (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

            {/* Search Bar UI */}
            <div className="mb-12 flex justify-center">
                <div className="relative w-full max-w-2xl">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                        <Search className="h-6 w-6 text-emerald-500" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-14 pr-12 py-4 bg-white/70 backdrop-blur-md border border-gray-200/60 rounded-[2rem] text-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all shadow-sm hover:shadow-md focus:bg-white"
                        placeholder="Cari artikel, panduan, atau topik..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-5 flex items-center text-gray-400 hover:text-emerald-500 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Results Header */}
            {searchQuery && (
                <div className="mb-8 text-center sm:text-left text-gray-600 font-medium">
                    Menampilkan <span className="text-emerald-600 font-bold">{filteredPosts.length}</span> hasil untuk pencarian "<span className="text-gray-900 font-bold">{searchQuery}</span>"
                </div>
            )}

            {/* Grid Artikel */}
            {filteredPosts.length === 0 ? (
                <div className="text-center text-gray-500 py-20 bg-white/50 backdrop-blur-sm rounded-[2rem] shadow-sm border border-gray-100">
                    <span className="text-5xl block mb-6">🔍</span>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Artikel Tidak Ditemukan</h3>
                    <p className="text-lg text-gray-500">
                        Coba gunakan kata kunci lain atau periksa kembali ejaan Anda.
                    </p>
                    <button
                        onClick={() => setSearchQuery('')}
                        className="mt-6 px-6 py-2.5 bg-emerald-50 text-emerald-600 font-bold rounded-full hover:bg-emerald-100 transition-colors"
                    >
                        Tampilkan Semua Artikel
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                    {filteredPosts.map((post) => (
                        <div key={post.id} className="bg-white rounded-[2rem] overflow-hidden shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-gray-100/50 flex flex-col group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)]">

                            {/* Image Header with Floating Badge */}
                            <Link href={`/blog/${post.slug}`} className="block relative aspect-[16/10] overflow-hidden bg-gray-100">
                                {post.thumbnailUrl ? (
                                    <ImageFallback
                                        src={post.thumbnailUrl}
                                        alt={post.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                                        fallbackSrc="https://placehold.co/800x400/e2e8f0/64748b"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">Tanpa Gambar</div>
                                )}
                                {/* Floating Category Badge (Glassmorphism / White Pill style) */}
                                <div className="absolute top-4 left-4 z-10">
                                    <span className="bg-white/95 backdrop-blur text-emerald-600 text-[11px] sm:text-xs font-bold px-4 py-1.5 rounded-full shadow-sm tracking-wide uppercase">
                                        {post.category.name}
                                    </span>
                                </div>
                            </Link>

                            {/* Card Body */}
                            <div className="p-6 sm:p-7 flex flex-col flex-1">

                                {/* Date Meta */}
                                <div className="text-xs text-gray-500 font-medium mb-3 flex items-center gap-3">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar className="w-4 h-4" />
                                        <time dateTime={post.createdAt?.toISOString() || post.updatedAt.toISOString()}>
                                            {format(post.createdAt || post.updatedAt, 'd MMM yyyy', { locale: id })}
                                        </time>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Eye className="w-4 h-4" />
                                        <span>{post.viewCount || 0}x dilihat</span>
                                    </div>
                                </div>

                                {/* Title */}
                                <Link href={`/blog/${post.slug}`} className="block group-hover:text-emerald-600 transition-colors">
                                    <h2 className="text-[1.35rem] leading-snug font-extrabold text-[#0f172a] mb-3 line-clamp-2">
                                        "{post.title}"
                                    </h2>
                                </Link>

                                {/* Excerpt */}
                                <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 md:line-clamp-3 mb-6 flex-1">
                                    {post.excerpt}
                                </p>

                                {/* Action Link Footer */}
                                <div className="pt-2 mt-auto">
                                    <Link
                                        href={`/blog/${post.slug}`}
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
            )}
        </section>
    );
}
