'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function TopupIconSettings() {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [walletIconUrl, setWalletIconUrl] = useState('');

    useEffect(() => {
        fetch('/api/admin/settings/topup-icon')
            .then(res => res.json())
            .then(data => {
                if (data.walletIconUrl !== undefined) {
                    setWalletIconUrl(data.walletIconUrl || '');
                }
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/admin/settings/topup-icon', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    walletIconUrl
                })
            });

            if (res.ok) {
                showToast('Ikon Topup berhasil disimpan!', 'success');
            } else {
                showToast('Gagal menyimpan ikon topup', 'error');
            }
        } catch (error) {
            showToast('Terjadi kesalahan saat menyimpan', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold flex items-center gap-3 text-gray-800">
                <ImageIcon className="w-8 h-8 text-indigo-600" />
                Pengaturan Ikon Topup
            </h1>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6">
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-4">
                        <label className="block text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <div className="w-6 h-6 flex items-center justify-center bg-yellow-100 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-600"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
                            </div>
                            URL Ikon Wallet Topup
                        </label>

                        {walletIconUrl && (
                            <div className="mb-4 flex items-center justify-center bg-gray-50 border border-gray-100 rounded-xl py-6">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={walletIconUrl} alt="Topup Icon Preview" className="w-16 h-16 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                            </div>
                        )}

                        <input
                            type="text"
                            value={walletIconUrl}
                            onChange={e => setWalletIconUrl(e.target.value)}
                            placeholder="https://example.com/icon.png"
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all text-sm mb-1"
                        />
                        <p className="text-xs text-gray-500 pl-1">
                            Kosongkan form ini jika ingin menggunakan ikon petir (lightning) bawaan sistem. Ikon ini akan muncul di tombol pengisian saldo pengguna.
                        </p>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-gray-100">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            {saving ? 'Menyimpan...' : 'Simpan Ikon'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
