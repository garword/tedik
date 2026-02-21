'use client';

import { useState, useEffect } from 'react';
import { Save, CheckCircle, XCircle, Globe, Key, Zap, Percent, ShieldCheck, Wallet } from 'lucide-react';
import { toast } from 'sonner';

export default function OTPAdminPage() {
    const [vaksmsApiKey, setVaksmsApiKey] = useState('');
    const [vaksmsRubRate, setVaksmsRubRate] = useState(200);
    const [vaksmsMargin, setVaksmsMargin] = useState(20);
    const [vaksmsActive, setVaksmsActive] = useState(false);
    const [vaksmsTierActive, setVaksmsTierActive] = useState(false);
    const [loading, setLoading] = useState(false);
    const [testResult, setTestResult] = useState<any>(null);

    useEffect(() => {
        fetchConfig();
    }, []);

    async function fetchConfig() {
        setTestResult(null);
        try {
            const res = await fetch('/api/admin/settings/providers/vaksms');
            if (res.ok) {
                const data = await res.json();
                if (data.config) {
                    setVaksmsApiKey(data.config.apiKey || '');
                    const rubRate = Number(data.config.rubRate);
                    setVaksmsRubRate(isNaN(rubRate) ? 200 : rubRate);
                    const margin = Number(data.config.marginPercent);
                    setVaksmsMargin(isNaN(margin) ? 20 : margin);
                    setVaksmsActive(data.config.isActive || false);
                    setVaksmsTierActive(data.config.tierActive || false);
                }
            }
        } catch (error) {
            console.error('Failed to fetch config', error);
        }
    }

    async function handleSave() {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/settings/providers/vaksms', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    apiKey: vaksmsApiKey,
                    rubRate: vaksmsRubRate,
                    marginPercent: vaksmsMargin,
                    isActive: vaksmsActive,
                    tierActive: vaksmsTierActive
                })
            });

            const data = await res.json();

            if (res.ok && data.success) {
                toast.success(`Konfigurasi Layanan OTP berhasil disimpan`);
            } else {
                toast.error(data.error || 'Gagal menyimpan konfigurasi');
            }
        } catch (error) {
            toast.error('Network error');
        }
        setLoading(false);
    }

    async function handleTest() {
        setLoading(true);
        setTestResult(null);

        try {
            const res = await fetch(`/api/admin/settings/providers/vaksms/test`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: vaksmsApiKey })
            });

            const data = await res.json();
            setTestResult(data);

            if (data.success) {
                toast.success('Koneksi VAK-SMS berhasil terhubung!');
            } else {
                toast.error(data.error || 'Koneksi gagal');
            }
        } catch (error) {
            setTestResult({ error: 'Network error: ' + (error as Error).message });
            toast.error('Network error');
        }
        setLoading(false);
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Virtual Number OTP</h1>
                    <p className="text-gray-500 mt-1">Konfigurasi kunci API dan sistem harga (Rubel ke Rupiah) VAK-SMS.</p>
                </div>
                <div className={`px-4 py-1.5 rounded-full text-xs font-bold border flex items-center gap-2 w-fit ${vaksmsActive
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-gray-50 text-gray-500 border-gray-200'
                    }`}>
                    <div className={`w-2 h-2 rounded-full ${vaksmsActive ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                    {vaksmsActive ? 'LAYANAN AKTIF' : 'LAYANAN DIMATIKAN'}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Configuration Form */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden relative">
                        {/* Decorative Header Bar */}
                        <div className="h-2 w-full bg-gradient-to-r from-orange-500 to-amber-400" />

                        <div className="p-8 space-y-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-4 rounded-2xl bg-orange-50 text-orange-600">
                                    <Globe size={32} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Pengaturan API Moresms.net</h2>
                                    <p className="text-sm text-gray-500">Sesuaikan kredensial dan kalkulasi konversi secara otomatis.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">VAK-SMS API Key</label>
                                    <div className="relative">
                                        <Key className="absolute left-4 top-3.5 text-gray-400 w-4 h-4" />
                                        <input
                                            type="password"
                                            value={vaksmsApiKey}
                                            onChange={(e) => setVaksmsApiKey(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all font-mono text-sm text-gray-800"
                                            placeholder="••••••••••••••••"
                                        />
                                    </div>
                                    <p className="text-xs text-gray-400 mt-1.5 ml-1">Kunci verifikasi H2H yang diberikan oleh moresms.net.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Rate 1 Rubel to IDR</label>
                                        <div className="relative">
                                            <div className="absolute left-4 top-3.5 text-gray-400 text-sm font-bold">Rp</div>
                                            <input
                                                type="number"
                                                value={vaksmsRubRate}
                                                onChange={(e) => setVaksmsRubRate(Number(e.target.value))}
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all font-bold text-sm text-gray-800"
                                                placeholder="200"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">Margin Profit (%)</label>
                                        <div className="relative">
                                            <Percent className="absolute left-4 top-3.5 text-gray-400 w-4 h-4" />
                                            <input
                                                type="number"
                                                value={vaksmsMargin}
                                                onChange={(e) => setVaksmsMargin(Number(e.target.value))}
                                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all font-bold text-sm text-gray-800"
                                                placeholder="20"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex gap-3 mt-4">
                                    <div className="p-2 bg-orange-100 rounded-full h-fit text-orange-500"><Zap size={16} /></div>
                                    <div>
                                        <h4 className="font-bold text-orange-700 text-sm">Rumus Auto-Price System</h4>
                                        <p className="text-xs text-orange-600 mt-0.5">Harga Jual Website = <strong>(Harga Asli VAK * Rate Rubel) + Margin Persen</strong>. Anda tak perlu memikirkan konversi kurs pusing-pusing lagi!</p>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-gray-100 space-y-4">
                                <label className="relative flex items-center justify-between cursor-pointer group p-4 border rounded-xl hover:bg-gray-50 transition-colors">
                                    <div>
                                        <span className="block text-sm font-bold text-gray-800">Sistem Tier Otomatis (Membership)</span>
                                        <span className="block text-xs text-gray-500 mt-0.5 max-w-sm">Jika aktif, sistem akan mengurangi harga OTP sesuai dengan Diskon Tier User saat ini (Silver, Gold, dsb). UI akan menampilkan "Harga Coret".</span>
                                    </div>
                                    <div className="relative inline-flex items-center">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={vaksmsTierActive}
                                            onChange={(e) => setVaksmsTierActive(e.target.checked)}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer 
                                            peer-checked:after:translate-x-full peer-checked:after:border-white 
                                            after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                                            after:bg-white after:border-gray-300 after:border after:rounded-full 
                                            after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500
                                            transition-colors duration-300 ease-in-out"></div>
                                    </div>
                                </label>
                            </div>

                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                                <label className="relative inline-flex items-center cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={vaksmsActive}
                                        onChange={(e) => setVaksmsActive(e.target.checked)}
                                    />
                                    <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none rounded-full peer 
                                        peer-checked:after:translate-x-full peer-checked:after:border-white 
                                        after:content-[''] after:absolute after:top-[4px] after:left-[4px] 
                                        after:bg-white after:border-gray-300 after:border after:rounded-full 
                                        after:h-6 after:w-6 after:transition-all peer-checked:bg-orange-500
                                        transition-colors duration-300 ease-in-out"></div>
                                    <span className="ml-3 text-sm font-bold text-gray-600 group-hover:text-gray-900 transition-colors">
                                        Active Status
                                    </span>
                                </label>

                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 bg-gradient-to-r from-orange-500 to-amber-400 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Save size={18} />
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Info & Status */}
                <div className="space-y-6">
                    <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <ShieldCheck size={20} className="text-gray-400" />
                            Connection Check
                        </h3>

                        <div className="space-y-4">
                            <button
                                onClick={handleTest}
                                disabled={loading}
                                className="w-full py-3 border-2 border-gray-200 rounded-xl font-bold text-gray-600 hover:border-gray-300 hover:bg-orange-50 hover:text-orange-600 transition-all flex items-center justify-center gap-2"
                            >
                                <Zap size={18} />
                                Test API Connection
                            </button>

                            {testResult && (
                                <div className={`p-4 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-300 ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                                    }`}>
                                    <div className="flex items-start gap-3">
                                        {testResult.success ? (
                                            <CheckCircle className="text-green-500 shrink-0" size={20} />
                                        ) : (
                                            <XCircle className="text-red-500 shrink-0" size={20} />
                                        )}
                                        <div>
                                            <p className={`font-bold text-sm ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                                                {testResult.success ? 'Connected Successfully' : 'Connection Failed'}
                                            </p>

                                            {testResult.success && (
                                                <div className="mt-2 space-y-1">
                                                    {testResult.balance !== undefined && (
                                                        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-100/50 px-2 py-1 rounded-lg w-fit">
                                                            <Wallet size={14} />
                                                            <span>Balance: {testResult.balance} RUB</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {!testResult.success && testResult.error && (
                                                <p className="mt-1 text-xs text-red-600 break-words">{testResult.error}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
