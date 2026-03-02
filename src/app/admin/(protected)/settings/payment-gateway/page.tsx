'use client';

import { useState, useEffect } from 'react';
import { Settings, CreditCard, Loader2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/context/ToastContext';

export default function PaymentGatewayOverview() {
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [activeGateway, setActiveGateway] = useState('pakasir');

    // Status setup untuk masing-masing gateway
    const [gatewaysStatus, setGatewaysStatus] = useState({
        pakasir: false,
        duitku: false
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch active gateway
                const activeRes = await fetch('/api/admin/settings/payment-gateway/active');
                const activeData = await activeRes.json();
                if (activeData.activeGateway) setActiveGateway(activeData.activeGateway);

                // Fetch Pakasir status
                const pakasirRes = await fetch('/api/admin/settings/payment-gateway/pakasir');
                const pakasirData = await pakasirRes.json();

                // Fetch Duitku status
                const duitkuRes = await fetch('/api/admin/settings/payment-gateway/duitku');
                const duitkuData = await duitkuRes.json();

                setGatewaysStatus({
                    pakasir: pakasirData.isActive === true,
                    duitku: duitkuData.isActive === true
                });

            } catch (error) {
                console.error('Error fetching gateway data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSetActive = async (gateway: 'pakasir' | 'duitku') => {
        if (!gatewaysStatus[gateway]) {
            showToast(`Gateway ${gateway.toUpperCase()} belum diaktifkan/dikonfigurasi dengan benar.`, 'error');
            return;
        }

        try {
            const res = await fetch('/api/admin/settings/payment-gateway/active', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ activeGateway: gateway })
            });

            if (res.ok) {
                setActiveGateway(gateway);
                showToast(`Payment Gateway aktif diubah ke ${gateway.toUpperCase()}`, 'success');
            } else {
                showToast('Gagal merubah gateway aktif', 'error');
            }
        } catch (error) {
            showToast('Terjadi kesalahan', 'error');
        }
    };

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold flex items-center gap-3 text-gray-800">
                    <CreditCard className="w-8 h-8 text-indigo-600" />
                    Payment Gateways
                </h1>
                <p className="text-sm text-gray-500">
                    Pilih dan konfigurasikan sistem pembayaran untuk website Anda
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Pakasir Card */}
                <div className={`bg-white rounded-2xl border-2 transition-all p-6 relative overflow-hidden flex flex-col ${activeGateway === 'pakasir' ? 'border-indigo-500 shadow-lg shadow-indigo-100' : 'border-gray-100 shadow-sm hover:border-gray-300'}`}>
                    {activeGateway === 'pakasir' && (
                        <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                            Active
                        </div>
                    )}

                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                                {/* Pakasir Logo placeholder */}
                                <span className="text-blue-600 font-extrabold text-xl">P</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Pak Kasir</h2>
                                <div className="flex items-center gap-1.5 mt-1">
                                    {gatewaysStatus.pakasir ? (
                                        <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /><span className="text-xs font-semibold text-emerald-600">Configured & Ready</span></>
                                    ) : (
                                        <><XCircle className="w-3.5 h-3.5 text-amber-500" /><span className="text-xs font-semibold text-amber-600">Needs Setup</span></>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-6 flex-1">
                        Sistem pembayaran otomatis menggunakan QRIS Dinamis. Ideal untuk transaksi cepat dan minim biaya potongan.
                    </p>

                    <div className="flex items-center gap-3 mt-auto">
                        <button
                            onClick={() => handleSetActive('pakasir')}
                            disabled={activeGateway === 'pakasir' || !gatewaysStatus.pakasir}
                            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${activeGateway === 'pakasir'
                                    ? 'bg-indigo-50 text-indigo-600 cursor-default'
                                    : !gatewaysStatus.pakasir
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-white border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 focus:ring-4 focus:ring-indigo-100'
                                }`}
                        >
                            {activeGateway === 'pakasir' ? 'Sedang Digunakan' : 'Gunakan Gateway Ini'}
                        </button>

                        <Link href="/admin/settings/payment-gateway/pakasir" className="w-12 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all border border-gray-200">
                            <Settings className="w-5 h-5" />
                        </Link>
                    </div>
                </div>

                {/* Duitku Card */}
                <div className={`bg-white rounded-2xl border-2 transition-all p-6 relative overflow-hidden flex flex-col ${activeGateway === 'duitku' ? 'border-indigo-500 shadow-lg shadow-indigo-100' : 'border-gray-100 shadow-sm hover:border-gray-300'}`}>
                    {activeGateway === 'duitku' && (
                        <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                            Active
                        </div>
                    )}

                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
                                {/* Duitku Logo placeholder */}
                                <span className="text-red-500 font-extrabold text-xl">D</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900">Duitku</h2>
                                <div className="flex items-center gap-1.5 mt-1">
                                    {gatewaysStatus.duitku ? (
                                        <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /><span className="text-xs font-semibold text-emerald-600">Configured & Ready</span></>
                                    ) : (
                                        <><XCircle className="w-3.5 h-3.5 text-amber-500" /><span className="text-xs font-semibold text-amber-600">Needs Setup</span></>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <p className="text-sm text-gray-600 mb-6 flex-1">
                        Third-party payment gateway terkemuka di Indonesia. Mendukung pembayaran menggunakan Virtual Account, E-Wallet, dan QRIS.
                    </p>

                    <div className="flex items-center gap-3 mt-auto">
                        <button
                            onClick={() => handleSetActive('duitku')}
                            disabled={activeGateway === 'duitku' || !gatewaysStatus.duitku}
                            className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${activeGateway === 'duitku'
                                    ? 'bg-indigo-50 text-indigo-600 cursor-default'
                                    : !gatewaysStatus.duitku
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-white border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50 focus:ring-4 focus:ring-indigo-100'
                                }`}
                        >
                            {activeGateway === 'duitku' ? 'Sedang Digunakan' : 'Gunakan Gateway Ini'}
                        </button>

                        <Link href="/admin/settings/payment-gateway/duitku" className="w-12 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-all border border-gray-200">
                            <Settings className="w-5 h-5" />
                        </Link>
                    </div>
                </div>

            </div>

        </div>
    );
}
