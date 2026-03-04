'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Image as ImageIcon, CheckCircle, Tag } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import RichTextEditor from '@/components/features/admin/RichTextEditor';

type BlogCategory = { id: string; name: string; slug: string };
type BlogTag = { id: string; name: string };

export default function BlogPostForm({
    initialData = null
}: {
    initialData?: any;
}) {
    const router = useRouter();
    const { showToast } = useToast();

    // Dependencies
    const [categories, setCategories] = useState<BlogCategory[]>([]);
    const [tags, setTags] = useState<BlogTag[]>([]);

    // Form State
    const [title, setTitle] = useState(initialData?.title || '');
    const [slug, setSlug] = useState(initialData?.slug || '');
    const [content, setContent] = useState(initialData?.content || '');
    const [excerpt, setExcerpt] = useState(initialData?.excerpt || '');
    const [thumbnailUrl, setThumbnailUrl] = useState(initialData?.thumbnailUrl || '');
    const [categoryId, setCategoryId] = useState(initialData?.categoryId || '');
    const [selectedTags, setSelectedTags] = useState<string[]>(
        initialData?.tags?.map((t: any) => t.id) || []
    );
    const [isPublished, setIsPublished] = useState(initialData?.isPublished || false);

    // Form Controls
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingThumb, setUploadingThumb] = useState(false);

    useEffect(() => {
        Promise.all([
            fetch('/api/admin/blog/categories').then(res => res.json()),
            fetch('/api/admin/blog/tags').then(res => res.json())
        ]).then(([cats, tgs]) => {
            setCategories(cats);
            setTags(tgs);
            if (!initialData && cats.length > 0) {
                setCategoryId(cats[0].id); // Auto-pilih kategori pertama
            }
            setLoading(false);
        }).catch(err => {
            console.error(err);
            showToast('Gagal memuat data kategori & tag', 'error');
            setLoading(false);
        });
    }, [initialData]);

    const handleTitleChange = (val: string) => {
        setTitle(val);
        if (!initialData) {
            setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
        }
    };

    const toggleTag = (id: string) => {
        setSelectedTags(prev =>
            prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
        );
    };

    const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('Format file ditolak. Harus berupa gambar.', 'error');
            return;
        }

        setUploadingThumb(true);
        const toastId = showToast('Mengunggah Thumbnail...', 'info');

        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await fetch('/api/admin/blog/upload', {
                method: 'POST',
                body: formData,
                credentials: 'same-origin'
            });

            const data = await res.json();
            if (res.ok && data.url) {
                setThumbnailUrl(data.url);
                showToast('Thumbnail tersimpan di ImgBB', 'success');
            } else {
                showToast(data.error || 'Gagal mengunggah thumbnail', 'error');
            }
        } catch (error) {
            showToast('Koneksi terputus', 'error');
        } finally {
            setUploadingThumb(false);
        }
    };

    const handleSave = async (publishStatus: boolean) => {
        setIsPublished(publishStatus); // Set untuk keperluan UI

        if (publishStatus) {
            if (!title || !slug || !categoryId || !content) {
                showToast('Tolong lengkapi semua field wajib (Judul, URL, Kategori, Isi) untuk Publikasi', 'error');
                return;
            }
        } else {
            // Untuk Draft, minimal ada Judul
            if (!title) {
                showToast('Judul diperlukan untuk menyimpan Draf', 'error');
                return;
            }
        }

        setSaving(true);
        try {
            const payload = {
                id: initialData?.id,
                title,
                slug,
                content,
                excerpt,
                thumbnailUrl,
                categoryId,
                tagIds: selectedTags,
                isPublished: publishStatus
            };

            const method = initialData ? 'PUT' : 'POST';
            const res = await fetch('/api/admin/blog/posts', {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (res.ok) {
                showToast(`Artikel disimpan sebagai ${publishStatus ? 'PUBLISHED' : 'DRAFT'}!`, 'success');
                router.push('/admin/blog');
            } else {
                showToast(data.error || 'Gagal menyimpan', 'error');
            }
        } catch (error) {
            showToast('Koneksi terputus', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-12 text-center text-gray-500">Memuat Editor...</div>;

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-24">

            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="w-10 h-10 bg-white border border-gray-200 rounded-xl flex items-center justify-center text-gray-600 hover:text-emerald-700 hover:border-emerald-200 transition-colors shadow-sm">
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">{initialData ? 'Edit Artikel' : 'Tulis Artikel Baru'}</h1>
                        <p className="text-gray-500 text-sm">Rich Text Editor & SEO CMS</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => handleSave(false)}
                        disabled={saving}
                        className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        Simpan Draf
                    </button>
                    <button
                        onClick={() => handleSave(true)}
                        disabled={saving}
                        className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm shadow-emerald-600/20 disabled:opacity-50"
                    >
                        <CheckCircle size={18} />
                        Publikasikan
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative">

                {/* Kolom Utama (Kiri 2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Blok Judul */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-5">
                        <div>
                            <input
                                type="text"
                                value={title}
                                onChange={e => handleTitleChange(e.target.value)}
                                placeholder="Tulis Judul Artikel (Saran: 50-60 Karakter SEO)..."
                                className="w-full text-2xl md:text-3xl font-bold border-none outline-none placeholder:text-gray-300 text-gray-900 leading-tight"
                            />
                        </div>
                        <div className="flex items-center text-sm font-mono gap-1 text-gray-500 bg-gray-50 px-3 py-2 rounded-lg w-full overflow-x-auto">
                            <span className="shrink-0">{typeof window !== 'undefined' ? window.location.origin : ''}/blog/</span>
                            <input
                                type="text"
                                value={slug}
                                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''))}
                                className="bg-transparent border-none outline-none text-emerald-600 font-bold flex-1 min-w-[200px]"
                                placeholder="url-slug-artikel"
                            />
                        </div>
                    </div>

                    {/* Area Rich Teks */}
                    <RichTextEditor content={content} onChange={setContent} />
                </div>

                {/* Kolom Sidebar (Kanan 1/3) */}
                <div className="lg:col-span-1 space-y-6">

                    {/* Kotak Media */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <ImageIcon className="w-5 h-5 text-emerald-600" />
                                Thumbnail Utama
                            </h3>
                        </div>
                        <div className="p-5">
                            {thumbnailUrl ? (
                                <div className="space-y-3">
                                    <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-gray-200">
                                        <img src={thumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                                    </div>
                                    <button
                                        onClick={() => setThumbnailUrl('')}
                                        className="w-full py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        Hapus Foto
                                    </button>
                                </div>
                            ) : (
                                <label className={`
                                    flex flex-col items-center justify-center w-full aspect-video 
                                    border-2 border-dashed rounded-xl cursor-pointer 
                                    transition-all duration-200
                                    ${uploadingThumb ? 'bg-emerald-50 border-emerald-300' : 'border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-emerald-500'}
                                `}>
                                    <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                                        <ImageIcon className={`w-8 h-8 mb-3 ${uploadingThumb ? 'text-emerald-500 animate-pulse' : 'text-gray-400'}`} />
                                        <p className="mb-1 text-sm font-bold text-gray-700">
                                            {uploadingThumb ? 'Mengirim ke ImgBB...' : 'Klik untuk Upload'}
                                        </p>
                                        <p className="text-xs text-gray-500">Maks. Ukuran Bebas (Auto-Compress)</p>
                                    </div>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/png, image/jpeg, image/webp"
                                        onChange={handleThumbnailUpload}
                                        disabled={uploadingThumb}
                                    />
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Metadata Kategori & Tag */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-5 border-b border-gray-100 bg-gray-50">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                <Tag className="w-5 h-5 text-emerald-600" />
                                Klasifikasi SEO
                            </h3>
                        </div>
                        <div className="p-5 space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Kategori Induk</label>
                                {categories.length === 0 ? (
                                    <p className="text-xs text-red-500 bg-red-50 p-3 rounded-lg border border-red-100">
                                        Perhatian: Kategori kosong. Anda harus membuat Kategori Blog terlebih dahulu di menu Kategori.
                                    </p>
                                ) : (
                                    <select
                                        value={categoryId}
                                        onChange={(e) => setCategoryId(e.target.value)}
                                        className="w-full bg-white border border-gray-300 text-gray-900 text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 p-3 appearance-none shadow-sm font-medium"
                                    >
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Pilih Tags Teks</label>
                                <div className="border border-gray-200 rounded-xl p-3 bg-gray-50 max-h-48 overflow-y-auto space-y-2">
                                    {tags.length === 0 ? (
                                        <p className="text-xs text-gray-500">Belum ada tag SEO.</p>
                                    ) : (
                                        tags.map(t => (
                                            <label key={t.id} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100 cursor-pointer hover:border-emerald-300 transition-colors">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 text-emerald-600 rounded bg-gray-100 border-gray-300 focus:ring-emerald-500 focus:ring-2"
                                                    checked={selectedTags.includes(t.id)}
                                                    onChange={() => toggleTag(t.id)}
                                                />
                                                <span className="text-sm font-medium text-gray-700">{t.name}</span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Meta Excerpt (Ringkasan)</label>
                                <textarea
                                    value={excerpt}
                                    onChange={e => setExcerpt(e.target.value)}
                                    maxLength={250}
                                    className="w-full border border-gray-300 rounded-xl p-3 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm h-28 resize-none shadow-sm"
                                    placeholder="Tulis 1-2 kalimat pemikat untuk meta tag mesin pencari..."
                                />
                                <div className="text-right text-xs text-gray-400 mt-1 mb-6">
                                    {excerpt.length}/250
                                </div>

                                {/* Google Live Preview (Publii Style) */}
                                <div className="mt-4">
                                    <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center justify-between">
                                        <span>Pratinjau Google Penelusuran</span>
                                        <span className="text-xs font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Live Preview</span>
                                    </label>
                                    <div className="border border-gray-200 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow font-sans">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 shrink-0 bg-gray-50 flex items-center justify-center">
                                                <img src="/globe.svg" alt="Globe" className="w-4 h-4 opacity-50" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                                            </div>
                                            <div className="flex flex-col justify-center">
                                                <span className="text-[14px] text-[#202124] leading-tight">Nama Toko Anda</span>
                                                <span className="text-[12px] text-[#4d5156] leading-tight flex items-center gap-1 mt-0.5 truncate max-w-xs md:max-w-sm">
                                                    https://{typeof window !== 'undefined' ? window.location.host : 'domainanda.com'} <span className="opacity-70 text-[10px]">›</span> blog <span className="opacity-70 text-[10px]">›</span> {slug || 'url'}
                                                </span>
                                            </div>
                                        </div>
                                        <h3 className="text-[#1a0dab] text-[20px] leading-[1.3] truncate hover:underline cursor-pointer mb-1 mt-1 font-normal">
                                            {title || 'Judul Menarik Artikel Anda Muncul di Sini'}
                                        </h3>
                                        <p className="text-[#4d5156] text-[14px] leading-[1.58] line-clamp-2">
                                            {excerpt || 'Silakan tulis ringkasan narasi (meta excerpt) yang memancing rasa penasaran pembaca. Kalimat ini akan menjadi daya tarik utama agar link Anda di-klik di Google...'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

        </div>
    );
}
