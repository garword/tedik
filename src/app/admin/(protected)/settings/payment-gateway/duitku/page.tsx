'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, Calculator, Settings, AlertTriangle, Key, Copy, Terminal } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

export default function DuitkuSettings() {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // State untuk Config
    const [merchantCode, setMerchantCode] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [mode, setMode] = useState('SANDBOX'); // SANDBOX | PRODUCTION
    const [feePercentage, setFeePercentage] = useState(0);
    const [feeFixed, setFeeFixed] = useState(0);
    const [isActive, setIsActive] = useState(false);

    // State untuk Kalkulator Simulasi Biaya
    const [testAmount, setTestAmount] = useState(100000);

    // URL Webhook auto-generate
    const [webhookUrl, setWebhookUrl] = useState('');

    useEffect(() => {
        // Set URL webhook agar admin mudah meng-copy
        if (typeof window !== 'undefined') {
            setWebhookUrl(`${window.location.origin}/api/webhooks/duitku`);
        }

        // Ambil config dari server
        fetch('/api/admin/settings/payment-gateway/duitku')
            .then(res => res.json())
            .then(data => {
                if (data.name) {
                    setMerchantCode(data.slug || ''); // Kita store merchantCode di field slug
                    setApiKey(data.apiKey || '');
                    setMode(data.mode || 'SANDBOX');
                    setFeePercentage(data.feePercentage || 0);
                    setFeeFixed(Number(data.feeFixed || 0));
                    setIsActive(data.isActive || false);
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
            const res = await fetch('/api/admin/settings/payment-gateway/duitku', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    merchantCode,
                    apiKey,
                    mode,
                    feePercentage,
                    feeFixed,
                    isActive
                })
            });

            if (res.ok) {
                showToast('Konfigurasi Duitku berhasil disimpan!', 'success');
            } else {
                showToast('Gagal menyimpan konfigurasi', 'error');
            }
        } catch (error) {
            showToast('Terjadi kesalahan saat menyimpan', 'error');
        } finally {
            setSaving(false);
        }
    };

    const copyWebhook = () => {
        navigator.clipboard.writeText(webhookUrl);
        showToast('Webhook URL disalin!', 'success');
    };

    // Kalkulasi fee simulasi
    const simFee = (testAmount * feePercentage / 100) + Number(feeFixed);
    const simTotal = testAmount + Math.ceil(simFee);

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <h1 className="text-2xl font-bold flex items-center gap-3 text-gray-800">
                <Settings className="w-8 h-8 text-indigo-600" />
                Konfigurasi Duitku
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form Utama Settings */}
                <div className="lg:col-span-2 space-y-6">
                    <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 space-y-6 relative overflow-hidden">
                        {mode === 'SANDBOX' && (
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                <Terminal className="w-32 h-32" />
                            </div>
                        )}

                        <div className="flex items-center justify-between pb-4 border-b border-gray-100 relative z-10">
                            <h2 className="text-lg font-bold text-gray-900">Pengaturan Utama</h2>
                            <div className={`p-1 rounded-full flex gap-1 bg-gray-100`}>
                                <button
                                    type="button"
                                    onClick={() => setMode('SANDBOX')}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${mode === 'SANDBOX' ? 'bg-yellow-400 text-yellow-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    <Terminal className="w-3 h-3" />
                                    SANDBOX
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setMode('PRODUCTION')}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-2 ${mode === 'PRODUCTION' ? 'bg-green-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    <Key className="w-3 h-3" />
                                    PRODUCTION
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Merchant Code</label>
                                    <input
                                        type="text"
                                        value={merchantCode}
                                        onChange={e => setMerchantCode(e.target.value)}
                                        placeholder="DXXXX"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                        <Key className="w-4 h-4 text-gray-400" /> API Key
                                    </label>
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={e => setApiKey(e.target.value)}
                                        placeholder="API Key Duitku Anda"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Pengaturan Biaya Layanan</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Persentase (%)</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={feePercentage}
                                            onChange={e => setFeePercentage(parseFloat(e.target.value))}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 mb-1 block">Nominal Tetap (Rp)</label>
                                        <input
                                            type="number"
                                            value={feeFixed}
                                            onChange={e => setFeeFixed(Number(e.target.value))}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                                <p className="text-[11px] text-gray-500 leading-tight bg-gray-50 p-3 rounded-lg border border-gray-100">
                                    Biaya ini akan <strong>dibebankan ke pelanggan</strong> pada saat checkout. Biaya Duitku sendiri akan dipotong otomatis dari Settlement Anda atau ditambahkan jika Anda setting "Ditanggung Customer" di dashboard Duitku.
                                </p>
                            </div>
                        </div>

                        {/* Webhook URL Display */}
                        <div className="bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 relative z-10">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-bold text-indigo-800 uppercase tracking-wider">Webhook / Callback URL</label>
                                <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-bold">POST</span>
                            </div>
                            <div className="flex gap-2">
                                <code className="flex-1 bg-white px-3 py-2 rounded-lg border border-indigo-200 text-xs font-mono text-indigo-600 break-all shadow-sm">
                                    {webhookUrl}
                                </code>
                                <button type="button" onClick={copyWebhook} className="p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md shadow-indigo-200 transition-all">
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Warning Localhost */}
                            <div className={`mt-3 flex items-start gap-2 p-3 rounded-lg border transition-all ${webhookUrl.includes('localhost')
                                    ? 'text-amber-700 bg-amber-50 border-amber-200'
                                    : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                                }`}>
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <p className="text-[11px] leading-relaxed">
                                    {webhookUrl.includes('localhost') ? (
                                        <><strong>Localhost Terdeteksi:</strong> Duitku TIDAK BISA mengirim Callback ke localhost. Gunakan Ngrok atau pasang di server live untuk menerima notifikasi pembayaran sukses.</>
                                    ) : (
                                        <>Pastikan untuk mengisi URL di atas pada project settings di dashboard merchant Duitku Anda agar status pesanan terupdate otomatis.</>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Enable Gateway */}
                        <div className="pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => setIsActive(!isActive)}>
                                <div className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${isActive ? 'bg-green-500' : 'bg-gray-300'}`}>
                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${isActive ? 'translate-x-6' : 'translate-x-0'}`} />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-semibold text-sm text-gray-900">Izinkan Duitku sebagai Payment Gateway</span>
                                    <span className="text-xs text-gray-500">Gateway ini belum aktif. Pilih "Jadikan Active" di halaman Overview untuk menggunakannya.</span>
                                </div>
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="flex justify-end pt-4 border-t border-gray-100 relative z-10">
                            <button
                                type="submit"
                                disabled={saving}
                                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {saving ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Sidebar: Simulation & Tools */}
                <div className="space-y-6">
                    {/* Fee Calculator */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-gray-400" />
                            Simulasi Biaya Checkout
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-gray-500 font-bold mb-1 block">Contoh Transaksi (Rp)</label>
                                <input
                                    type="number"
                                    value={testAmount}
                                    onChange={e => setTestAmount(Number(e.target.value))}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                                />
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl space-y-2 border border-gray-100">
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Biaya Persentase ({feePercentage}%)</span>
                                    <span>+ Rp {Math.ceil(testAmount * feePercentage / 100).toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex justify-between text-sm text-gray-600">
                                    <span>Biaya Tetap</span>
                                    <span>+ Rp {Number(feeFixed).toLocaleString('id-ID')}</span>
                                </div>
                                <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-gray-900">
                                    <span>Total Bayar Customer</span>
                                    <span>Rp {simTotal.toLocaleString('id-ID')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
