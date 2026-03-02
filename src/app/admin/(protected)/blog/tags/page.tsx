'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Tag as TagIcon, Save, X } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

type BlogTag = {
    id: string;
    name: string;
    slug: string;
    _count: { posts: number };
};

export default function BlogTagsPage() {
    const { showToast } = useToast();
    const [tags, setTags] = useState<BlogTag[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [formId, setFormId] = useState('');
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchTags();
    }, []);

    const fetchTags = async () => {
        try {
            const res = await fetch('/api/admin/blog/tags');
            const data = await res.json();
            setTags(data);
        } catch (error) {
            console.error('Failed to fetch tags', error);
        } finally {
            setLoading(false);
        }
    };

    const handleNameChange = (val: string) => {
        setName(val);
        if (!formId) {
            setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
        }
    };

    const handleEdit = (tag: BlogTag) => {
        setFormId(tag.id);
        setName(tag.name);
        setSlug(tag.slug);
        setIsModalOpen(true);
    };

    const handleCreateNew = () => {
        setFormId('');
        setName('');
        setSlug('');
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const method = formId ? 'PUT' : 'POST';
            const payload = formId
                ? { id: formId, name, slug }
                : { name, slug };

            const res = await fetch('/api/admin/blog/tags', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                showToast(`Tag berhasil ${formId ? 'diperbarui' : 'dibuat'}!`, 'success');
                setIsModalOpen(false);
                fetchTags();
            } else {
                showToast(data.error || 'Terjadi kesalahan sistem', 'error');
            }
        } catch (error) {
            showToast('Koneksi terputus', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Hapus tag "${name}"?`)) return;

        try {
            const res = await fetch(`/api/admin/blog/tags?id=${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (res.ok) {
                showToast('Tag terhapus', 'success');
                fetchTags();
            } else {
                showToast(data.error || 'Gagal menghapus', 'error');
            }
        } catch (error) {
            showToast('Koneksi terputus', 'error');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <TagIcon className="w-6 h-6 text-emerald-600" />
                        Tags SEO
                    </h1>
                    <p className="text-gray-500">Kelola kata kunci spesifik untuk SEO artikel Anda.</p>
                </div>
                <button
                    onClick={handleCreateNew}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition-colors font-medium shadow-sm"
                >
                    <Plus size={18} />
                    <span>Buat Tag</span>
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-medium text-sm">
                                <th className="p-4">Nama Tag</th>
                                <th className="p-4">Slug (URL)</th>
                                <th className="p-4 text-center">Dipakai Oleh</th>
                                <th className="p-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-400">Loading...</td>
                                </tr>
                            ) : tags.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-400">
                                        <div className="flex flex-col items-center">
                                            <TagIcon className="w-12 h-12 mb-3 text-gray-200" />
                                            <p>Belum ada tag yang dibuat.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                tags.map((tag) => (
                                    <tr key={tag.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="p-4">
                                            <div className="font-bold text-gray-900 border border-gray-200 bg-gray-50 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 text-sm">
                                                <span className="text-emerald-600">#</span>{tag.name}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="text-gray-500 text-sm font-mono">
                                                {tag.slug}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${tag._count.posts > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                {tag._count.posts} Artikel
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(tag)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(tag.id, tag.name)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                                    title="Hapus"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Form */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100">
                            <h3 className="font-bold text-lg text-gray-900 flex items-center gap-2">
                                <TagIcon className="w-5 h-5 text-emerald-600" />
                                {formId ? 'Edit Tag' : 'Tag SEO Baru'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full p-2 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama Tag</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600 font-bold opacity-50">#</div>
                                    <input
                                        type="text"
                                        required
                                        value={name}
                                        onChange={e => handleNameChange(e.target.value)}
                                        className="w-full border border-gray-300 pl-8 pr-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-medium"
                                        placeholder="Mobile Legends"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Slug URL Tag</label>
                                <input
                                    type="text"
                                    required
                                    value={slug}
                                    onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))}
                                    className="w-full border border-gray-300 px-4 py-2.5 rounded-xl bg-gray-50 text-gray-500 font-mono text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    placeholder="mobile-legends"
                                />
                            </div>

                            <div className="pt-2 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3 bg-gray-100 text-gray-700 hover:bg-gray-200 font-bold rounded-xl transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || !name || !slug}
                                    className="flex-1 py-3 bg-emerald-600 text-white hover:bg-emerald-700 font-bold rounded-xl transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                                >
                                    <Save size={18} />
                                    {saving ? 'Menyimpan...' : 'Simpan Tag'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
