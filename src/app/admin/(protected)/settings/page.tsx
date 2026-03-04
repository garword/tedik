'use client';

import { useState, useEffect } from 'react';
import { Save, Loader2, Key, ShieldCheck, Eye, EyeOff, RefreshCw, Link, Copy, Cloud, HardDrive } from 'lucide-react';
import { useToast } from '@/context/ToastContext';
import GoogleAuthConfigForm from '@/components/features/admin/GoogleAuthConfigForm';
import ResendConfigForm from '@/components/features/admin/ResendConfigForm';

export default function SettingsPage() {
    const { showToast } = useToast();
    const [geminiApiKey, setGeminiApiKey] = useState('');
    const [openRouterApiKey, setOpenRouterApiKey] = useState('');
    const [openRouterModel, setOpenRouterModel] = useState('');
    const [turnstileSiteKey, setTurnstileSiteKey] = useState('');
    const [turnstileSecretKey, setTurnstileSecretKey] = useState('');
    const [imgbbApiKey, setImgbbApiKey] = useState('');

    // Cloudflare R2
    const [r2AccountId, setR2AccountId] = useState('');
    const [r2AccessKeyId, setR2AccessKeyId] = useState('');
    const [r2SecretAccessKey, setR2SecretAccessKey] = useState('');
    const [r2BucketName, setR2BucketName] = useState('');
    const [r2PublicUrl, setR2PublicUrl] = useState('');

    // Visibility Toggles
    const [showTurnstileSecret, setShowTurnstileSecret] = useState(false);
    const [showR2Secret, setShowR2Secret] = useState(false);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch('/api/admin/settings')
            .then(res => res.json())
            .then(data => {
                setGeminiApiKey(data.geminiApiKey || '');
                setOpenRouterApiKey(data.openRouterApiKey || '');
                setOpenRouterModel(data.openRouterModel || 'deepseek/deepseek-r1-0528:free');
                setTurnstileSiteKey(data.turnstileSiteKey || '');
                setTurnstileSecretKey(data.turnstileSecretKey || '');
                setImgbbApiKey(data.imgbbApiKey || '');
                setR2AccountId(data.r2AccountId || '');
                setR2AccessKeyId(data.r2AccessKeyId || '');
                setR2SecretAccessKey(data.r2SecretAccessKey || '');
                setR2BucketName(data.r2BucketName || '');
                setR2PublicUrl(data.r2PublicUrl || '');
                setLoading(false);
            });
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    geminiApiKey,
                    openRouterApiKey,
                    openRouterModel,
                    turnstileSiteKey,
                    turnstileSecretKey,
                    imgbbApiKey,
                    r2AccountId,
                    r2AccessKeyId,
                    r2SecretAccessKey,
                    r2BucketName,
                    r2PublicUrl,
                })
            });
            if (res.ok) {
                showToast('Settings saved successfully!', 'success');
            } else {
                showToast('Failed to save settings', 'error');
            }
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-0">
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Settings</h1>

            {/* Google Configuration */}
            <GoogleAuthConfigForm />

            {/* Resend Email Config */}
            <ResendConfigForm />

            <form onSubmit={handleSave} className="space-y-6">

                {/* AI Configuration */}
                <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
                    <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <div className="p-2 bg-indigo-50 rounded-lg">
                            <Key className="w-5 h-5 text-indigo-600" />
                        </div>
                        AI Configuration
                    </h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Google Gemini API Key</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={geminiApiKey}
                                    onChange={e => setGeminiApiKey(e.target.value)}
                                    placeholder="AIzaSy..."
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                />
                                <Key className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Gemini Pro (Free Tier available). Get it from <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-indigo-600 hover:underline">Google AI Studio</a>.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">OpenRouter API Key (Optional)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={openRouterApiKey}
                                    onChange={e => setOpenRouterApiKey(e.target.value)}
                                    placeholder="sk-or-..."
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                />
                                <Key className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Supports DeepSeek, Claude, GPT. If filled, this will be prioritized over Gemini. Get it from <a href="https://openrouter.ai/keys" target="_blank" className="text-indigo-600 hover:underline">OpenRouter</a>.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">OpenRouter Model ID</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={openRouterModel}
                                    onChange={e => setOpenRouterModel(e.target.value)}
                                    placeholder="deepseek/deepseek-r1-0528:free"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                />
                                <Loader2 className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 animate-spin" style={{ animationDuration: '10s' }} />
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                                {[
                                    'deepseek/deepseek-r1-0528:free',
                                    'deepseek/deepseek-r1:free',
                                    'google/gemini-2.0-flash-exp:free',
                                    'mistralai/mistral-7b-instruct:free'
                                ].map(model => (
                                    <button
                                        key={model}
                                        type="button"
                                        onClick={() => setOpenRouterModel(model)}
                                        className={`px-3 py-1 text-xs rounded-full border transition-all ${openRouterModel === model
                                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold'
                                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                            }`}
                                    >
                                        {model.split('/')[1] || model}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Leave default or choose a free model.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Cloudflare R2 Storage Configuration */}
                <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
                    <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <div className="p-2 bg-orange-50 rounded-lg">
                            <Cloud className="w-5 h-5 text-orange-600" />
                        </div>
                        Cloudflare R2 Storage
                    </h2>
                    <p className="text-sm text-gray-500 mb-6 ml-11">Penyimpanan gambar blog menggunakan Cloudflare R2 (S3-Compatible). Semua upload gambar dari editor blog akan masuk ke sini.</p>

                    <div className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Account ID</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={r2AccountId}
                                        onChange={e => setR2AccountId(e.target.value)}
                                        placeholder="a1b2c3d4e5f6..."
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                    />
                                    <HardDrive className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                                </div>
                                <p className="text-xs text-gray-500 mt-1.5">Terlihat di URL bar Cloudflare Dashboard.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Bucket Name</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={r2BucketName}
                                        onChange={e => setR2BucketName(e.target.value)}
                                        placeholder="blog-images"
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                    />
                                    <Cloud className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Access Key ID</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={r2AccessKeyId}
                                    onChange={e => setR2AccessKeyId(e.target.value)}
                                    placeholder="R2_ACCESS_KEY_ID"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                />
                                <Key className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Secret Access Key</label>
                            <div className="relative">
                                <input
                                    type={showR2Secret ? "text" : "password"}
                                    value={r2SecretAccessKey}
                                    onChange={e => setR2SecretAccessKey(e.target.value)}
                                    placeholder="R2_SECRET_ACCESS_KEY"
                                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                />
                                <Key className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                                <button
                                    type="button"
                                    onClick={() => setShowR2Secret(!showR2Secret)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    {showR2Secret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1.5">Rahasiakan. Digunakan untuk autentikasi upload server-side.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Public URL (R2.dev atau Custom Domain)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={r2PublicUrl}
                                    onChange={e => setR2PublicUrl(e.target.value)}
                                    placeholder="https://pub-xxxxx.r2.dev"
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                />
                                <Link className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                            </div>
                            <p className="text-xs text-gray-500 mt-1.5">
                                URL publik R2 bucket Anda. Bisa ditemukan di <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer" className="text-orange-600 hover:underline">R2 → Bucket → Settings → Public Access</a>.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Automation & Sync Configuration */}
                <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
                    <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <RefreshCw className="w-5 h-5 text-blue-600" />
                        </div>
                        Automation & Cron Job
                    </h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Medanpedia Auto-Sync Endpoint</label>
                            <div className="relative flex">
                                <input
                                    type="text"
                                    readOnly
                                    value={typeof window !== 'undefined' ? `${window.location.origin}/api/medanpedia/auto-sync` : ''}
                                    className="w-full pl-10 pr-4 py-3 rounded-l-xl border border-gray-200 bg-gray-50 text-gray-600 outline-none font-mono text-sm"
                                />
                                <Link className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                                <button
                                    type="button"
                                    onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/api/medanpedia/auto-sync`);
                                        showToast('Endpoint URL copied to clipboard!', 'success');
                                    }}
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 rounded-r-xl border border-l-0 border-gray-200 transition-colors flex items-center gap-2 font-medium"
                                >
                                    <Copy className="w-4 h-4" />
                                    Copy
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Paste this URL into a 1-hour recurring schedule on tools like <a href="https://cron-job.org" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">cron-job.org</a>.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Security Configuration */}
                <div className="bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
                    <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                        <div className="p-2 bg-emerald-50 rounded-lg">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                        </div>
                        Security & Captcha (Cloudflare Turnstile)
                    </h2>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Site Key (Public)</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={turnstileSiteKey}
                                    onChange={e => setTurnstileSiteKey(e.target.value)}
                                    placeholder="0x4AAAAAA..."
                                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                />
                                <ShieldCheck className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                This key is visible to users. Used to render the widget.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Secret Key (Private)</label>
                            <div className="relative">
                                <input
                                    type={showTurnstileSecret ? "text" : "password"}
                                    value={turnstileSecretKey}
                                    onChange={e => setTurnstileSecretKey(e.target.value)}
                                    placeholder="0x4AAAAAA..."
                                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all font-mono text-sm"
                                />
                                <Key className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                                <button
                                    type="button"
                                    onClick={() => setShowTurnstileSecret(!showTurnstileSecret)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    {showTurnstileSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                Keep this secret. Used to verify tokens on the server.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-50">
                    <button
                        type="submit"
                        disabled={saving || loading}
                        className="w-full md:w-auto bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/30"
                    >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </form>
        </div>
    );
}
