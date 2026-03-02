export const dynamic = 'force-dynamic';

import prisma from '@/lib/prisma';
import Link from 'next/link';
import { Plus, Edit2, Eye, EyeOff, MessageSquare, Clock, BarChart } from 'lucide-react';

export default async function AdminBlogPage() {
    // Ambil data semua post (termasuk draft) dengan author & category
    const posts = await prisma.blogPost.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
            category: true,
            author: { select: { name: true } },
            tags: true,
        }
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Manajemen Artikel</h1>
                    <p className="text-gray-500">Kelola dan publikasikan konten untuk Blog Anda.</p>
                </div>
                <Link
                    href="/admin/blog/create"
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition-colors font-medium shadow-sm"
                >
                    <Plus size={18} />
                    <span>Tulis Artikel</span>
                </Link>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-medium text-sm">
                                <th className="p-4 w-[40%]">Judul Artikel</th>
                                <th className="p-4">Kategori & Tags</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-center">Statistik</th>
                                <th className="p-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {posts.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-12 text-center text-gray-400">
                                        <div className="flex flex-col items-center">
                                            <MessageSquare className="w-12 h-12 mb-3 text-gray-200" />
                                            <p>Belum ada artikel. Mulai menulis!</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                posts.map((post: any) => (
                                    <tr key={post.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="p-4">
                                            <div className="flex gap-4 items-center">
                                                {post.thumbnailUrl ? (
                                                    <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 border border-gray-200 bg-gray-100 hidden sm:block">
                                                        <img src={post.thumbnailUrl} alt={post.title} className="w-full h-full object-cover" />
                                                    </div>
                                                ) : (
                                                    <div className="w-16 h-12 rounded-lg bg-gray-100 border border-gray-200 shrink-0 hidden sm:flex items-center justify-center">
                                                        <MessageSquare className="w-6 h-6 text-gray-300" />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <div className="font-bold text-gray-900 truncate pr-4 text-sm md:text-base">
                                                        {post.title}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 font-medium">
                                                        <Clock size={12} />
                                                        {new Date(post.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        <span className="text-gray-300">•</span>
                                                        <span>{post.author.name}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="space-y-1.5">
                                                <span className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-[11px] font-bold">
                                                    {post.category.name}
                                                </span>
                                                {post.tags.length > 0 && (
                                                    <div className="flex flex-wrap gap-1">
                                                        {post.tags.slice(0, 2).map((tag: any) => (
                                                            <span key={tag.id} className="text-[10px] text-gray-500">#{tag.name}</span>
                                                        ))}
                                                        {post.tags.length > 2 && <span className="text-[10px] text-gray-400">+{post.tags.length - 2}</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            {post.isPublished ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold">
                                                    <Eye size={12} />
                                                    Published
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-bold">
                                                    <EyeOff size={12} />
                                                    Draft
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex items-center justify-center gap-1 text-gray-600 font-medium text-sm">
                                                <BarChart size={14} className="text-gray-400" />
                                                {post.viewCount}
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Link
                                                    href={`/admin/blog/edit/${post.id}`}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit Artikel"
                                                >
                                                    <Edit2 size={16} />
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
