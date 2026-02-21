'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
    MessageSquare, Smartphone, Globe, RefreshCcw,
    XCircle, CheckCircle2, Copy, AlertCircle, Clock,
    Search, ChevronDown, Check, ShieldCheck, Zap,
    RadioTower, Sparkles, AlertTriangle, ShoppingCart, Tag, History, Info
} from 'lucide-react';
import { toast } from 'sonner';

// Tipe Data
interface Service { code: string; name: string; color: string; icon: string; }
interface Country { code: string; name: string; flag: string; operators: string[] }
interface Order {
    id: string; apiIdNum: string; service: string; country: string; operator?: string;
    phoneNumber: string; price: number; userPrice: number;
    smsCode?: string; status: string; createdAt: string;
}

export default function OTPDashboard() {
    const router = useRouter();

    const [services, setServices] = useState<Service[]>([]);
    const [countries, setCountries] = useState<Country[]>([]);

    // UI States
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedCountry, setSelectedCountry] = useState<string>('id');
    const [selectedOperator, setSelectedOperator] = useState<string>('any');

    const [appSearch, setAppSearch] = useState('');
    const [countrySearch, setCountrySearch] = useState('');

    // Dropdown toggles
    const [openDropdown, setOpenDropdown] = useState<'app' | 'country' | 'operator' | null>(null);

    // Transaction States
    const [activeOrder, setActiveOrder] = useState<Order | null>(null);
    const [priceData, setPriceData] = useState<any>(null);
    const [isLoadingPrice, setIsLoadingPrice] = useState(false);
    const [isOrdering, setIsOrdering] = useState(false);

    // Polling & Timer States
    const [timeLeft, setTimeLeft] = useState<number>(300); // 5 Menit = 300 detik
    const [isCancelling, setIsCancelling] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Close dropdowns on outside click or escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpenDropdown(null);
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, []);

    // Initial Fetch
    useEffect(() => {
        fetchInitialData();
        return () => { clearTimers(); };
    }, []);

    // Cek Harga saat service / negara / operator berubah
    useEffect(() => {
        if (selectedService && selectedCountry && !activeOrder) {
            const debounceTimer = setTimeout(() => {
                checkPrice();
            }, 300); // Debounce
            return () => clearTimeout(debounceTimer);
        } else {
            setPriceData(null);
        }
    }, [selectedService, selectedCountry, selectedOperator]);

    // Update available operators when country changes
    useEffect(() => {
        const countryObj = countries.find(c => c.code === selectedCountry);
        if (countryObj && countryObj.operators) {
            if (!countryObj.operators.includes(selectedOperator) && selectedOperator !== 'any') {
                setSelectedOperator('any');
            }
        } else {
            setSelectedOperator('any');
        }
    }, [selectedCountry, countries]);

    // Timer & Polling Logic
    useEffect(() => {
        if (activeOrder && activeOrder.status === 'WAITING') {
            const orderTime = new Date(activeOrder.createdAt).getTime();
            const maxTime = 5 * 60 * 1000;

            const updateTimer = () => {
                const elapsed = Date.now() - orderTime;
                const remaining = Math.max(0, Math.floor((maxTime - elapsed) / 1000));
                setTimeLeft(remaining);

                if (remaining <= 0) {
                    clearTimers();
                    handleTimeout();
                }
            };

            updateTimer();
            timerRef.current = setInterval(updateTimer, 1000);

            pollIntervalRef.current = setInterval(() => {
                pollStatus(activeOrder.id);
            }, 5000);

            return () => clearTimers();
        } else if (activeOrder && activeOrder.status !== 'WAITING') {
            clearTimers();
        }
    }, [activeOrder]);

    const clearTimers = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };

    const fetchInitialData = async () => {
        try {
            const activeRes = await fetch('/api/virtual-number/active');
            const activeData = await activeRes.json();

            if (activeData.success && activeData.data) {
                setActiveOrder(activeData.data);
            }

            const svRes = await fetch('/api/virtual-number/services');
            const svData = await svRes.json();
            if (svData.success) {
                setServices(svData.data.services);
                setCountries(svData.data.countries);
                if (!activeData.data && svData.data.services.length > 0) {
                    const defaultService = svData.data.services.find((s: any) => s.code === 'wa') || svData.data.services[0];
                    setSelectedService(defaultService);
                }
            }
        } catch (error) {
            console.error(error);
        }
    };

    const checkPrice = async () => {
        if (!selectedService) return;
        setIsLoadingPrice(true);
        try {
            const res = await fetch(`/api/virtual-number/price?service=${selectedService.code}&country=${selectedCountry}&operator=${selectedOperator}`);
            const data = await res.json();
            if (data.success) {
                setPriceData(data.data);
            } else {
                setPriceData({ error: data.error });
            }
        } catch (error) {
            setPriceData({ error: 'Gagal mengecek jaringan harga.' });
        }
        setIsLoadingPrice(false);
    };

    const handleOrder = async () => {
        if (!selectedService || !priceData || priceData.error) return;
        setIsOrdering(true);
        try {
            const res = await fetch('/api/virtual-number/order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service: selectedService.code,
                    country: selectedCountry,
                    operator: selectedOperator
                })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Nomor berhasil disewa!');
                setActiveOrder(data.order);
            } else {
                toast.error(data.error || 'Gagal menyewa nomor.', { duration: 5000 });
                if (data.error?.includes('Unauthorized') || data.error?.includes('login')) {
                    router.push('/login?callbackUrl=/otp');
                }
            }
        } catch (error) {
            toast.error('Gagal memproses pesanan akibat error jaringan.');
        }
        setIsOrdering(false);
    };

    const pollStatus = async (orderId: string) => {
        try {
            const res = await fetch(`/api/virtual-number/status?orderId=${orderId}`);
            const data = await res.json();
            if (data.success && data.data) {
                setActiveOrder(data.data);
                if (data.data.status === 'SUCCESS' && data.data.smsCode) {
                    toast.success('SMS Berhasil Diterima!', { duration: 5000 });
                    clearTimers();
                } else if (data.data.status === 'REFUNDED' || data.data.status === 'CANCELLED') {
                    toast.info('Pesanan telah dibatalkan & di-refund.');
                    clearTimers();
                }
            }
        } catch (error) {
            console.error('Polling error', error);
        }
    };

    const handleManualRefresh = async () => {
        if (!activeOrder || isRefreshing) return;
        setIsRefreshing(true);
        await pollStatus(activeOrder.id);
        setTimeout(() => setIsRefreshing(false), 1000);
    };

    const handleCancel = async () => {
        if (!activeOrder) return;
        setIsCancelling(true);
        try {
            const res = await fetch('/api/virtual-number/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: activeOrder.id })
            });
            const data = await res.json();
            if (data.success) {
                toast.success('Dibatalkan! Saldo telah di-refund 100%.');
                setActiveOrder(null);
            } else {
                toast.error(data.error || 'Gagal membatalkan pesanan.');
            }
        } catch (err) {
            toast.error('Gagal membatalkan ke sistem pusat.');
        }
        setIsCancelling(false);
    };

    const handleTimeout = async () => {
        if (activeOrder) {
            await pollStatus(activeOrder.id);
        }
    };

    const copyToClipboard = (text: string, title = 'Berhasil disalin!') => {
        navigator.clipboard.writeText(text);
        toast.success(title);
    };

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const isCancelAllowed = () => {
        // Bisa batalkan sesudah 2 Menit (artinya tersisa 3 menit)
        return timeLeft <= 180;
    };

    const toggleDropdown = (type: 'app' | 'country' | 'operator') => {
        if (openDropdown === type) setOpenDropdown(null);
        else setOpenDropdown(type);
    };

    // ------------- RENDER 1: ACTIVE ORDER MONITOR -------------
    if (activeOrder && (activeOrder.status === 'WAITING' || activeOrder.status === 'SUCCESS')) {
        const isSuccess = activeOrder.status === 'SUCCESS';

        return (
            <div className="max-w-4xl mx-auto w-full">
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl overflow-hidden relative">

                    <div className={`h-2 w-full absolute top-0 left-0 bg-gradient-to-r ${isSuccess ? 'from-green-500 to-emerald-400' : 'from-emerald-600 to-teal-500'}`} />

                    <div className="p-8 md:p-14 text-center relative">
                        <div className="flex flex-col items-center justify-center space-y-4 mb-10">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-50 text-slate-700 font-bold text-sm border border-slate-200">
                                {isSuccess ? (
                                    <><CheckCircle2 size={16} className="text-green-500" /> Transaksi Selesai</>
                                ) : (
                                    <><RefreshCcw size={16} className="text-emerald-500 animate-spin" /> Menunggu SMS Masuk...</>
                                )}
                            </div>
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">Virtual Number <span className={(isSuccess ? 'text-green-600' : 'text-emerald-600')}>{activeOrder.service.toUpperCase()}</span></h2>
                        </div>

                        {/* BIG PHONE NUMBER */}
                        <div className="mx-auto w-fit mb-12">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Nomor HP / Telepon</p>
                            <div
                                onClick={() => copyToClipboard(`+${activeOrder.phoneNumber}`, "Nomor HP Disalin!")}
                                className="relative bg-white border border-gray-200 px-8 py-5 rounded-2xl shadow-sm hover:shadow-md cursor-pointer flex items-center justify-center gap-5 transition-all group hover:border-emerald-400"
                            >
                                <span className="text-4xl md:text-5xl font-black tracking-wider text-gray-800 font-mono">
                                    +{activeOrder.phoneNumber}
                                </span>
                                <button className="p-3 bg-slate-50 text-gray-400 rounded-xl group-hover:text-emerald-600 group-hover:bg-emerald-50 transition-all">
                                    <Copy size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Interactive Area: Radar vs SMS Code */}
                        {isSuccess ? (
                            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-10 mt-8 relative flex flex-col items-center">
                                <div className="flex items-center gap-2 text-green-600 font-bold uppercase tracking-wider mb-6 text-sm">
                                    <MessageSquare size={18} /> Kode OTP Anda
                                </div>
                                <div
                                    className="flex items-center gap-6 bg-white border border-green-200 px-10 py-6 rounded-2xl shadow-sm cursor-pointer hover:shadow-md transition-all hover:border-green-400 group"
                                    onClick={() => copyToClipboard(activeOrder.smsCode!, "Kode OTP Disalin!")}
                                >
                                    <span className="text-5xl md:text-6xl font-black text-green-600 font-mono tracking-widest">
                                        {activeOrder.smsCode}
                                    </span>
                                    <Copy size={28} className="text-gray-300 group-hover:text-green-500 ml-4 transition-colors" />
                                </div>
                            </div>
                        ) : (
                            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 relative mt-8 flex flex-col md:flex-row items-center gap-6 justify-between">
                                {/* Pulse Radar & Manual Refresh */}
                                <div className="flex items-center gap-6">
                                    <div className="relative flex items-center justify-center w-16 h-16 shrink-0">
                                        <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-20" />
                                        <div className="relative z-10 bg-emerald-500 text-white w-12 h-12 flex items-center justify-center rounded-full shadow-lg">
                                            <RadioTower size={20} className={isRefreshing ? 'animate-bounce' : 'animate-pulse'} />
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-bold text-gray-900 mb-1 pointer-events-none">Melacak SMS...</p>
                                        <button
                                            onClick={handleManualRefresh}
                                            disabled={isRefreshing}
                                            className="text-xs font-semibold text-emerald-600 bg-white border border-emerald-100 hover:border-emerald-300 px-3 py-1.5 rounded flex items-center gap-2 group disabled:opacity-50 transition-all shadow-sm"
                                        >
                                            <RefreshCcw size={12} className={isRefreshing ? 'animate-spin' : ''} />
                                            {isRefreshing ? 'Loading...' : 'Refresh Manual'}
                                        </button>
                                    </div>
                                </div>

                                <div className="hidden md:block w-px h-16 bg-gray-200" />

                                {/* Timer & Cancel Logic */}
                                <div className="flex flex-col items-center md:items-end w-full md:w-auto">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-xs font-semibold text-gray-500 uppercase">Sisa Waktu:</span>
                                        <span className={`font-mono font-bold text-lg tracking-wider bg-white px-2 py-1 border rounded shadow-sm ${timeLeft <= 60 ? 'text-red-600 border-red-200' : 'text-gray-900 border-gray-200'}`}>
                                            {formatTime(timeLeft)}
                                        </span>
                                    </div>

                                    <button
                                        onClick={handleCancel}
                                        disabled={!isCancelAllowed() || isCancelling}
                                        className={`w-full md:w-auto px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 
                                            ${isCancelAllowed()
                                                ? 'bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 shadow-sm active:scale-95'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                            }`}
                                    >
                                        <XCircle size={16} />
                                        {isCancelling ? 'Membatalkan...' : (!isCancelAllowed() ? 'Batalkan (Tunggu 2m)' : 'Batalkan Pesanan')}
                                    </button>
                                </div>
                            </div>
                        )}

                        {isSuccess && (
                            <div className="mt-10 flex justify-center">
                                <button
                                    onClick={() => setActiveOrder(null)}
                                    className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-md flex items-center gap-2"
                                >
                                    Buat Pesanan Baru
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // ------------- RENDER 2: DASHBOARD (SMM PANEL STYLE) -------------
    const activeCountryObj = countries.find(c => c.code === selectedCountry);
    const operatorList = activeCountryObj?.operators || ['any'];

    return (
        <div className="w-full">
            <div className="max-w-[1000px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start relative z-10">

                {/* ---------- MAIN FORM (LEFT COLUMN) ---------- */}
                <div className="lg:col-span-12 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">

                    {/* Header Pannel */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white shadow-sm">
                        <div className="flex items-center gap-2 text-gray-800 font-semibold text-base">
                            <ShoppingCart size={18} className="text-emerald-600" />
                            Buat Pesanan
                        </div>
                    </div>

                    {/* Form Fields */}
                    <div className="p-6 md:p-8 space-y-6">

                        {/* KATEGORI (NEGARA) */}
                        <div className="space-y-1.5 relative">
                            <label className="block text-[13px] font-semibold text-gray-600">Negara (Kategori)</label>
                            <button
                                onClick={() => toggleDropdown('country')}
                                className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all hover:bg-gray-50"
                            >
                                <div className="flex items-center gap-2 truncate">
                                    {activeCountryObj?.name ? (
                                        <>
                                            <img
                                                src={`https://flagcdn.com/w20/${activeCountryObj.code.toLowerCase()}.png`}
                                                srcSet={`https://flagcdn.com/w40/${activeCountryObj.code.toLowerCase()}.png 2x`}
                                                alt={activeCountryObj.name}
                                                className="w-5 h-auto shadow-sm rounded-[2px]"
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            />
                                            <span className="truncate">{activeCountryObj.name}</span>
                                        </>
                                    ) : (
                                        <span>Pilih...</span>
                                    )}
                                </div>
                                <ChevronDown size={16} className="text-gray-400" />
                            </button>

                            {openDropdown === 'country' && (
                                <div className="absolute z-50 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl outline-none origin-top animate-in fade-in zoom-in-95 duration-100 max-h-72 overflow-hidden flex flex-col">
                                    <div className="p-2 border-b border-gray-100">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Cari negara..."
                                                value={countrySearch}
                                                onChange={e => setCountrySearch(e.target.value)}
                                                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-200">
                                        {countries.filter(c => c.name.toLowerCase().includes(countrySearch.toLowerCase())).map(c => (
                                            <button
                                                key={c.code}
                                                onClick={() => { setSelectedCountry(c.code); setOpenDropdown(null); setCountrySearch(''); }}
                                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-emerald-500 hover:text-white rounded-md transition-colors flex items-center gap-2"
                                            >
                                                <img
                                                    src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`}
                                                    srcSet={`https://flagcdn.com/w40/${c.code.toLowerCase()}.png 2x`}
                                                    alt={c.name}
                                                    className="w-5 h-auto shadow-sm rounded-[2px]"
                                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                />
                                                <span className="truncate">{c.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* LAYANAN (APLIKASI) */}
                        <div className="space-y-1.5 relative">
                            <label className="block text-[13px] font-semibold text-gray-600">Layanan (Aplikasi)</label>
                            <button
                                onClick={() => toggleDropdown('app')}
                                className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all hover:bg-gray-50"
                            >
                                <span className="truncate font-medium">{selectedService?.name || 'Pilih...'}</span>
                                <ChevronDown size={16} className="text-gray-400" />
                            </button>

                            {openDropdown === 'app' && (
                                <div className="absolute z-40 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl outline-none origin-top animate-in fade-in zoom-in-95 duration-100 max-h-72 overflow-hidden flex flex-col">
                                    <div className="p-2 border-b border-gray-100">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder="Cari layanan (Contoh: WhatsApp)..."
                                                value={appSearch}
                                                onChange={e => setAppSearch(e.target.value)}
                                                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                                            />
                                        </div>
                                    </div>
                                    <div className="overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-200">
                                        {services.filter(s => s.name.toLowerCase().includes(appSearch.toLowerCase())).map(s => (
                                            <button
                                                key={s.code}
                                                onClick={() => { setSelectedService(s); setOpenDropdown(null); setAppSearch(''); }}
                                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-emerald-500 hover:text-white rounded-md transition-colors"
                                            >
                                                {s.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* DESKRIPSI LAYANAN BOK */}
                        <div className="w-full bg-emerald-50/70 border border-emerald-200/60 rounded-lg p-4 text-sm text-emerald-800 flex flex-col gap-1 shadow-inner relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400 opacity-20 rounded-full blur-2xl pointer-events-none" />
                            <p className="font-semibold flex items-center gap-1.5 mb-1"><Info size={16} /> Deskripsi Layanan:</p>
                            <ul className="list-disc pl-5 opacity-90 space-y-1">
                                <li><strong>Layanan:</strong> {selectedService?.name || '-'} / <strong>Negara:</strong> {activeCountryObj?.name || '-'}</li>
                                <li>Gunakan nomor untuk registrasi/verifikasi satu kali.</li>
                                <li>Nomor hanya berlaku selama 5 menit. Uang otomatis kembali (*refund*) jika SMS tidak masuk.</li>
                                {priceData && typeof priceData.count !== 'undefined' && !priceData.error && (
                                    <li className={`font-semibold ${priceData.count > 0 ? 'text-emerald-700' : 'text-red-500'}`}>
                                        Stok Nomor Tersedia: {priceData.count} Server
                                    </li>
                                )}
                            </ul>
                        </div>

                        {/* LINK/TARGET (OPERATOR) */}
                        <div className="space-y-1.5 relative">
                            <label className="block text-[13px] font-semibold text-gray-600">Operator/Provider (Opsional)</label>
                            <button
                                disabled={operatorList.length <= 1}
                                onClick={() => toggleDropdown('operator')}
                                className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all
                                    ${operatorList.length <= 1 ? 'bg-gray-100 cursor-not-allowed opacity-80' : 'hover:bg-gray-50'}`}
                            >
                                <span className="truncate capitalize">{selectedOperator === 'any' ? 'Semua Operator Secara Acak' : selectedOperator}</span>
                                {operatorList.length > 1 && <ChevronDown size={16} className="text-gray-400" />}
                            </button>

                            {openDropdown === 'operator' && operatorList.length > 1 && (
                                <div className="absolute z-30 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-xl outline-none origin-top animate-in fade-in zoom-in-95 duration-100 max-h-56 overflow-hidden flex flex-col">
                                    <div className="overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-gray-200">
                                        {operatorList.map(op => (
                                            <button
                                                key={op}
                                                onClick={() => { setSelectedOperator(op); setOpenDropdown(null); }}
                                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-emerald-500 hover:text-white rounded-md transition-colors capitalize"
                                            >
                                                {op === 'any' ? 'Semua Operator Secara Acak' : op}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* BIAYA */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="block text-[13px] font-semibold text-gray-600">Biaya Total</label>
                                {priceData?.tierName && priceData?.originalPriceIdr && (
                                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full ring-1 ring-emerald-200">
                                        Member {priceData.tierName}
                                    </span>
                                )}
                            </div>

                            <div className="flex w-full">
                                <span className="inline-flex items-center px-4 bg-gray-50 border border-r-0 border-gray-300 rounded-l-lg text-sm font-semibold text-gray-500 shrink-0">
                                    Rp
                                </span>
                                <div className={`flex-1 relative w-full px-4 py-2.5 border border-gray-300 rounded-r-lg text-sm bg-gray-50 flex items-center gap-2 overflow-hidden ${priceData?.error ? 'text-red-500 font-semibold' : 'text-gray-900'}`}>
                                    {isLoadingPrice ? (
                                        <span className="text-gray-500">Memuat harga...</span>
                                    ) : priceData?.error ? (
                                        <span>Stok Kosong / Error</span>
                                    ) : priceData?.userPriceIdr ? (
                                        <div className="flex items-center gap-2 truncate">
                                            {priceData.originalPriceIdr && (
                                                <span className="text-xs text-gray-400 line-through font-medium">
                                                    {priceData.originalPriceIdr.toLocaleString('id-ID')}
                                                </span>
                                            )}
                                            <span className={`font-bold ${priceData.originalPriceIdr ? 'text-lg text-emerald-600' : 'text-gray-900'}`}>
                                                {priceData.userPriceIdr.toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 font-medium">-</span>
                                    )}
                                    {isLoadingPrice && <RefreshCcw size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
                                </div>
                            </div>

                            {/* ERROR MESSAGE RENDERER */}
                            {priceData?.error && (
                                <p className="text-red-500 text-xs font-medium flex items-center gap-1 mt-1">
                                    <AlertCircle size={12} /> {priceData.error}
                                </p>
                            )}
                        </div>

                        {/* SUBMIT BUTTON */}
                        <div className="pt-2">
                            <button
                                onClick={handleOrder}
                                disabled={isOrdering || !priceData || !!priceData.error || isLoadingPrice}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-lg shadow-sm focus:outline-none focus:ring-4 focus:ring-emerald-500/30 transition-all text-sm flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 group"
                            >
                                {isOrdering ? (
                                    <><RefreshCcw size={18} className="animate-spin" /> Sedang Memproses Order...</>
                                ) : (
                                    <>Sewa Nomor <ShoppingCart size={16} className="ml-1 opacity-70 group-hover:scale-110 transition-transform" /></>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
