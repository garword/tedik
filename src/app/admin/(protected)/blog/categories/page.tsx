'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, FolderOpen, Save, X } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

type BlogCategory = {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    _count: { posts: number };
};

export default function BlogCategoriesPage() {
    const { showToast } = useToast();
    const [categories, setCategories] = useState<BlogCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Form State
    const [formId, setFormId] = useState('');
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [description, setDescription] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const res = await fetch('/api/admin/blog/categories');
            const data = await res.json();
            setCategories(data);
        } catch (error) {
            console.error('Failed to fetch categories', error);
        } finally {
            setLoading(false);
        }
    };

    // Auto-generate slug from name
    const handleNameChange = (val: string) => {
        setName(val);
        if (!formId) {
            setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
        }
    };

    const handleEdit = (cat: BlogCategory) => {
        setFormId(cat.id);
        setName(cat.name);
        setSlug(cat.slug);
        setDescription(cat.description || '');
        setIsModalOpen(true);
    };

    const handleCreateNew = () => {
        setFormId('');
        setName('');
        setSlug('');
        setDescription('');
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const method = formId ? 'PUT' : 'POST';
            const payload = formId
                ? { id: formId, name, slug, description }
                : { name, slug, description };

            const res = await fetch('/api/admin/blog/categories', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                showToast(`Kategori berhasil ${formId ? 'diperbarui' : 'dibuat'}!`, 'success');
                setIsModalOpen(false);
                fetchCategories();
            } else {
                showToast(data.error || 'Terjadi kesalahan sistem', 'error');
            }
        } catch (error) {
            console.error(error);
            showToast('Koneksi terputus', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Hapus kategori "${name}"?`)) return;

        try {
            const res = await fetch(`/api/admin/blog/categories?id=${id}`, { method: 'DELETE' });
            const data = await res.json();

            if (res.ok) {
                showToast('Kategori terhapus', 'success');
                fetchCategories();
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
                    <h1 className="text-2xl font-bold text-gray-900">Kategori Blog</h1>
                    <p className="text-gray-500">Kelola pilar SEO dan topik utama artikel Anda.</p>
                </div>
                <button
                    onClick={handleCreateNew}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition-colors font-medium shadow-sm"
                >
                    <Plus size={18} />
                    <span>Buat Kategori</span>
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 font-medium text-sm">
                                <th className="p-4">Nama Kategori</th>
                                <th className="p-4">Slug (URL)</th>
                                <th className="p-4 text-center">Jumlah Artikel</th>
                                <th className="p-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-400">Loading...</td>
                                </tr>
                            ) : categories.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-400">
                                        <div className="flex flex-col items-center">
                                            <FolderOpen className="w-12 h-12 mb-3 text-gray-200" />
                                            <p>Belum ada kategori yang dibuat.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                categories.map((cat) => (
                                    <tr key={cat.id} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="p-4">
                                            <div className="font-bold text-gray-900">{cat.name}</div>
                                            {cat.description && (
                                                <div className="text-xs text-gray-500 mt-1 line-clamp-1 max-w-xs">{cat.description}</div>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-mono rounded-lg">
                                                /blog/category/{cat.slug}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${cat._count.posts > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                {cat._count.posts} Post
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(cat)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cat.id, cat.name)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                                                    title="Hapus"
                                                    disabled={cat._count.posts > 0}
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
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center p-5 border-b border-gray-100">
                            <h3 className="font-bold text-lg text-gray-900">
                                {formId ? 'Edit Kategori' : 'Kategori Baru'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full p-2 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-5 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama Kategori</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={e => handleNameChange(e.target.value)}
                                    className="w-full border border-gray-300 px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                                    placeholder="Contoh: Tutorial"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Slug URL Kategori</label>
                                <input
                                    type="text"
                                    required
                                    value={slug}
                                    onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))}
                                    className="w-full border border-gray-300 px-4 py-2.5 rounded-xl bg-gray-50 text-gray-600 font-mono text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                    placeholder="contoh: tips-dan-trik"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Deskripsi Singkat (Opsional)</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    className="w-full border border-gray-300 px-4 py-3 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none h-24"
                                    placeholder="Tulis ringkasan tentang apa yang dibahas pada kategori ini..."
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
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
                                    {saving ? 'Loading...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
