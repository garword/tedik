'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Save, Loader2, Globe, Search, Image, Key, Tag, AlignLeft,
    CheckCircle2, ExternalLink, RefreshCw, Eye, Info
} from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface SeoFormData {
    siteName: string;
    siteUrl: string;
    tagline: string;
    description: string;
    keywords: string;
    logoUrl: string;
    ogImageUrl: string;
    googleVerification: string;
    twitterHandle: string;
}

const DEFAULT_FORM: SeoFormData = {
    siteName: '',
    siteUrl: '',
    tagline: '',
    description: '',
    keywords: '',
    logoUrl: '',
    ogImageUrl: '',
    googleVerification: '',
    twitterHandle: '',
};

// Hitung panjang description untuk SEO guidance
function DescriptionCounter({ text }: { text: string }) {
    const len = text.length;
    const color = len === 0 ? 'text-gray-400'
        : len < 120 ? 'text-yellow-500'
            : len <= 160 ? 'text-emerald-500'
                : 'text-red-500';
    const label = len === 0 ? 'Kosong'
        : len < 120 ? 'Terlalu pendek'
            : len <= 160 ? 'Ideal untuk Google'
                : 'Terlalu panjang (Google akan memotong)';
    return (
        <div className={`flex items-center gap-1.5 text-xs font-medium ${color} mt-1`}>
            <span>{len}/160 karakter</span>
            <span>·</span>
            <span>{label}</span>
        </div>
    );
}

// Google SERP Preview
function GooglePreview({ siteName, siteUrl, tagline, description }: {
    siteName: string; siteUrl: string; tagline: string; description: string;
}) {
    const displayUrl = siteUrl
        ? siteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
        : 'example.com';
    const displayTitle = [siteName, tagline].filter(Boolean).join(' — ') || 'Nama Toko — Tagline Toko';
    const displayDesc = description || 'Deskripsi toko Anda akan muncul di sini. Pastikan memuat keyword penting dan ajakan untuk klik.';
    const truncTitle = displayTitle.length > 65 ? displayTitle.slice(0, 62) + '...' : displayTitle;
    const truncDesc = displayDesc.length > 160 ? displayDesc.slice(0, 157) + '...' : displayDesc;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" />
                Preview Tampilan di Google
            </p>
            {/* Google Search Bar Mockup */}
            <div className="mb-4 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-4 py-2">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-500 italic">nama toko anda ...</span>
            </div>
            {/* Search Result Card */}
            <div className="font-sans rounded-xl border border-gray-100 p-4 bg-white">
                {/* Favicon + URL */}
                <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <Globe className="w-3 h-3 text-gray-400" />
                    </div>
                    <div>
                        <p className="text-xs text-gray-700 leading-tight font-medium">{siteName || 'Nama Toko'}</p>
                        <p className="text-xs text-gray-500 leading-tight">{displayUrl} › beranda</p>
                    </div>
                </div>
                {/* Title */}
                <h3 className="text-[#1a0dab] text-lg font-medium leading-snug hover:underline cursor-pointer mb-0.5">
                    {truncTitle}
                </h3>
                {/* Description */}
                <p className="text-sm text-gray-600 leading-snug">{truncDesc}</p>

                {/* Fake Sitelinks */}
                <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1">
                    {['Mobile Legends', 'Free Fire', 'Pulsa Murah', 'Lihat Semua'].map((sl) => (
                        <div key={sl} className="flex items-center gap-1">
                            <span className="text-[#1a0dab] text-xs hover:underline cursor-pointer">{sl}</span>
                            <span className="text-gray-400 text-xs">›</span>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-gray-400 mt-2 italic">
                    * Sitelinks muncul otomatis setelah Google index cukup halaman
                </p>
            </div>
        </div>
    );
}

export default function SeoSettingsForm() {
    const { showToast } = useToast();
    const [form, setForm] = useState<SeoFormData>(DEFAULT_FORM);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        fetch('/api/admin/settings/seo')
            .then(r => r.json())
            .then(data => {
                setForm(prev => ({ ...prev, ...data }));
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const handleChange = useCallback((field: keyof SeoFormData, value: string) => {
        setSaved(false);
        setForm(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/admin/settings/seo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            if (res.ok) {
                setSaved(true);
                showToast('SEO settings berhasil disimpan!', 'success');
                setTimeout(() => setSaved(false), 3000);
            } else {
                const err = await res.json();
                showToast(err.error || 'Gagal menyimpan', 'error');
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
                <div className="flex items-center gap-3 text-gray-400">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Memuat konfigurasi SEO...</span>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSave}>
            {/* Header Card */}
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl md:rounded-3xl p-6 md:p-8 text-white mb-6">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 bg-white/20 rounded-lg backdrop-blur-sm">
                                <Search className="w-5 h-5" />
                            </div>
                            <h2 className="text-lg md:text-xl font-bold">SEO & Identitas Toko</h2>
                        </div>
                        <p className="text-emerald-100 text-sm leading-relaxed max-w-xl">
                            Konfigurasi ini mengontrol tampilan toko Anda di Google, WhatsApp preview,
                            dan semua mesin pencari. Perubahan berlaku dalam ~60 detik.
                        </p>
                    </div>
                    <div className="hidden md:flex items-center gap-1.5 bg-white/15 backdrop-blur rounded-xl px-3 py-1.5 text-xs font-medium flex-shrink-0">
                        <Globe className="w-3.5 h-3.5" />
                        Schema.org ✓
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Kolom Kiri: Form Fields */}
                <div className="space-y-5">

                    {/* Nama & Domain */}
                    <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                            <Tag className="w-4 h-4 text-emerald-500" />
                            Identitas Toko
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Nama Toko <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.siteName}
                                    onChange={e => handleChange('siteName', e.target.value)}
                                    placeholder="Contoh: GarStore"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                                />
                                <p className="text-xs text-gray-400 mt-1">Muncul di title setiap halaman dan JSON-LD Organization</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Domain / URL Toko <span className="text-red-400">*</span>
                                </label>
                                <div className="relative">
                                    <Globe className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                                    <input
                                        type="url"
                                        value={form.siteUrl}
                                        onChange={e => handleChange('siteUrl', e.target.value)}
                                        placeholder="https://garstore.id"
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm font-mono"
                                    />
                                </div>
                                <p className="text-xs text-gray-400 mt-1">URL lengkap production (dipakai sitemap.xml & canonical)</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Tagline / Slogan
                                </label>
                                <input
                                    type="text"
                                    value={form.tagline}
                                    onChange={e => handleChange('tagline', e.target.value)}
                                    placeholder="Top Up Game Termurah & Tercepat Se-Indonesia"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                                />
                                <p className="text-xs text-gray-400 mt-1">Muncul di title beranda: "Nama Toko — Tagline"</p>
                            </div>
                        </div>
                    </div>

                    {/* Deskripsi & Keywords */}
                    <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                            <AlignLeft className="w-4 h-4 text-blue-500" />
                            Snippet Google
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Deskripsi Toko (Meta Description)
                                </label>
                                <textarea
                                    rows={4}
                                    value={form.description}
                                    onChange={e => handleChange('description', e.target.value)}
                                    placeholder="Contoh: GarStore adalah tempat top up games aman, murah & terpercaya. Proses cepat 1-3 detik. Open 24 jam. Payment terlengkap."
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm resize-none"
                                />
                                <DescriptionCounter text={form.description} />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Keywords (pisah dengan koma)
                                </label>
                                <input
                                    type="text"
                                    value={form.keywords}
                                    onChange={e => handleChange('keywords', e.target.value)}
                                    placeholder="top up game, ml diamonds, free fire, pulsa murah"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm"
                                />
                                <p className="text-xs text-gray-400 mt-1">Google tidak menjamin ini berpengaruh, tapi bantu mesin pencari lain</p>
                            </div>
                        </div>
                    </div>

                    {/* Logo & OG Image */}
                    <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                            <Image className="w-4 h-4 text-purple-500" />
                            Gambar & Logo
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    URL Logo
                                </label>
                                <input
                                    type="text"
                                    value={form.logoUrl}
                                    onChange={e => handleChange('logoUrl', e.target.value)}
                                    placeholder="/uploads/logo.png"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm font-mono"
                                />
                                <p className="text-xs text-gray-400 mt-1">Path relatif dari folder public (contoh: /uploads/nama-file.jpg)</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    OG Image URL (preview link WA/Telegram)
                                </label>
                                <input
                                    type="text"
                                    value={form.ogImageUrl}
                                    onChange={e => handleChange('ogImageUrl', e.target.value)}
                                    placeholder="/uploads/og-banner.jpg"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm font-mono"
                                />
                                <p className="text-xs text-gray-400 mt-1">Gambar yang muncul saat link ditempel di WhatsApp/Telegram. Ukuran ideal: 1200×630px</p>
                            </div>
                            {/* File yang tersedia di /uploads */}
                            <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                                <p className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1">
                                    <Info className="w-3.5 h-3.5" />
                                    File tersedia di /public/uploads/:
                                </p>
                                <div className="space-y-1">
                                    {[
                                        '/uploads/1771181935283_Untitled_(60_x_40_px).jpg',
                                        '/uploads/1771183039227_Untitled_design.jpg',
                                        '/uploads/1771183601024_Untitled_design_(2).png',
                                    ].map(f => (
                                        <button
                                            key={f}
                                            type="button"
                                            onClick={() => {
                                                handleChange('logoUrl', f);
                                                handleChange('ogImageUrl', f);
                                            }}
                                            className="block w-full text-left text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded-lg px-2 py-1.5 transition-colors font-mono truncate"
                                        >
                                            {f}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Advanced */}
                    <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                            <Key className="w-4 h-4 text-gray-400" />
                            Verifikasi & Advanced
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Google Search Console Verification Code
                                </label>
                                <input
                                    type="text"
                                    value={form.googleVerification}
                                    onChange={e => handleChange('googleVerification', e.target.value)}
                                    placeholder="Contoh: abc123xyz..."
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none transition-all text-sm font-mono"
                                />
                                <p className="text-xs text-gray-400 mt-1">
                                    Dari{' '}
                                    <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline">
                                        Google Search Console
                                    </a>{' '}→ Add property → HTML tag → ambil nilai content="..."
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                    Twitter/X Handle (opsional)
                                </label>
                                <input
                                    type="text"
                                    value={form.twitterHandle}
                                    onChange={e => handleChange('twitterHandle', e.target.value)}
                                    placeholder="@namatoko"
                                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none transition-all text-sm font-mono"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Kolom Kanan: Live Preview + Tips */}
                <div className="space-y-5">
                    {/* Live Google Preview */}
                    <GooglePreview
                        siteName={form.siteName}
                        siteUrl={form.siteUrl}
                        tagline={form.tagline}
                        description={form.description}
                    />

                    {/* Tips Panel */}
                    <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            Checklist SEO
                        </h3>
                        <div className="space-y-2.5">
                            {[
                                { ok: form.siteName.length > 0, label: 'Nama toko diisi' },
                                { ok: form.siteUrl.startsWith('http'), label: 'Domain valid (dimulai dengan https://)' },
                                { ok: form.tagline.length > 0, label: 'Tagline diisi' },
                                { ok: form.description.length >= 120 && form.description.length <= 160, label: 'Deskripsi 120-160 karakter (ideal)' },
                                { ok: form.keywords.length > 0, label: 'Keywords diisi' },
                                { ok: form.logoUrl.length > 0, label: 'URL Logo diisi' },
                                { ok: form.ogImageUrl.length > 0, label: 'OG Image diisi (untuk preview WA/Telegram)' },
                                { ok: form.googleVerification.length > 0, label: 'Google Search Console verification diisi' },
                            ].map(item => (
                                <div key={item.label} className="flex items-start gap-2.5">
                                    <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center ${item.ok ? 'bg-emerald-100 text-emerald-500' : 'bg-gray-100 text-gray-300'}`}>
                                        {item.ok ? <CheckCircle2 className="w-3 h-3" /> : <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />}
                                    </div>
                                    <span className={`text-xs ${item.ok ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
                        <h3 className="text-sm font-bold text-blue-800 mb-3 flex items-center gap-2">
                            <ExternalLink className="w-4 h-4" />
                            Tools Verifikasi SEO
                        </h3>
                        <div className="space-y-2">
                            {[
                                { label: 'Google Rich Results Test', url: 'https://search.google.com/test/rich-results' },
                                { label: 'Schema.org Validator', url: 'https://validator.schema.org/' },
                                { label: 'Google Search Console', url: 'https://search.google.com/search-console' },
                                { label: 'Meta Tags Preview (metatags.io)', url: 'https://metatags.io' },
                            ].map(item => (
                                <a
                                    key={item.url}
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 text-xs text-blue-700 hover:text-blue-900 hover:bg-blue-100 rounded-lg px-2.5 py-1.5 transition-colors"
                                >
                                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                    {item.label}
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Sitemap Link */}
                    {form.siteUrl && (
                        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5">
                            <h3 className="text-sm font-bold text-emerald-800 mb-2 flex items-center gap-2">
                                <RefreshCw className="w-4 h-4" />
                                Sitemap Anda
                            </h3>
                            <a
                                href={`${form.siteUrl.replace(/\/$/, '')}/sitemap.xml`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-emerald-700 hover:underline font-mono break-all"
                            >
                                {form.siteUrl.replace(/\/$/, '')}/sitemap.xml
                            </a>
                            <p className="text-xs text-emerald-600 mt-2">
                                Submit URL ini ke Google Search Console agar halaman cepat terindex.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 flex items-center justify-between gap-4 pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400">
                    Perubahan diterapkan ke seluruh halaman termasuk sitemap.xml dan metadata JSON-LD
                </p>
                <button
                    type="submit"
                    disabled={saving}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${saved
                        ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/30 hover:-translate-y-0.5'
                        } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                    {saving ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
                    ) : saved ? (
                        <><CheckCircle2 className="w-4 h-4" /> Tersimpan!</>
                    ) : (
                        <><Save className="w-4 h-4" /> Simpan SEO Settings</>
                    )}
                </button>
            </div>
        </form>
    );
}
