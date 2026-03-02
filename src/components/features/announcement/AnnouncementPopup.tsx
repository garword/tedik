'use client';

import { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface Announcement {
    id: string;
    title: string;
    content: string;
    type: 'info' | 'warning' | 'promo' | 'urgent';
    isPinned: boolean;
    createdAt: string;
}

export default function AnnouncementPopup() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isVisible, setIsVisible] = useState(false);
    const [hasHydrated, setHasHydrated] = useState(false);

    useEffect(() => {
        setHasHydrated(true);
        const fetchAnnouncements = async () => {
            try {
                const res = await fetch('/api/announcements');
                if (!res.ok) return;

                const data: Announcement[] = await res.json();

                // Cek Session Storage
                const isDismissed = sessionStorage.getItem('announcementDismissed');

                if (data.length > 0 && !isDismissed) {
                    setAnnouncements(data);
                    setIsVisible(true);
                }
            } catch (error) {
                console.error('Failed to parse announcements', error);
            }
        };

        fetchAnnouncements();
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        // Simpan ke session storage agar tidak muncul lagi HANYA pada sesi tab ini
        // (Akan muncul lagi jika tab ditutup lalu dibuka lagi, atau Anda bisa pakai sessionStorage)
        // User minta setiap refresh muncul lagi: 
        // Jika setiap F5 muncul lagi, kita JANGAN simpan kemana-mana, state isVisible saja cukup.
        // Tapi umumnya pop-up seperti "Baca Dulu" itu mengganggu jika tiap klik home pindah halaman balik lg muncul.
        // Karena di page.tsx, tiap kembali ke home dari profile akan muncul.
        // Mari kita simpan di state sementara (memory) saja sesuai permintaan (refresh F5 hilang).
        // React state `isVisible` sudah mengatasi itu. Refresh = state reset = fetch lagi = muncul.
    };

    if (!hasHydrated || !isVisible || announcements.length === 0) return null;

    const getTypeConfig = (type: string) => {
        switch (type) {
            case 'info': return { bg: 'bg-blue-500', text: 'Info' };
            case 'warning': return { bg: 'bg-amber-500', text: 'Peringatan' };
            case 'promo': return { bg: 'bg-fuchsia-500', text: 'Promo' };
            case 'urgent': return { bg: 'bg-rose-500', text: 'Penting' };
            default: return { bg: 'bg-blue-500', text: 'Pengumuman' };
        }
    };

    const formatDateString = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        }).replace(/\./g, ':');
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 min-h-[100dvh] z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/50 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="relative w-full max-h-[85vh] sm:max-h-[80vh] sm:max-w-xl bg-white rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                    >
                        {/* Header Modal */}
                        <div className="flex justify-between items-center px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-100 bg-white z-10 sticky top-0">
                            <h2 className="text-base sm:text-lg font-bold text-gray-800">Baca dulu!</h2>
                            <button
                                onClick={handleClose}
                                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* List Pengumuman (Scrollable Content) */}
                        <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-gray-50/50 space-y-4">
                            {announcements.map((ann) => {
                                const typeConfig = getTypeConfig(ann.type);
                                return (
                                    <div key={ann.id} className="bg-white border text-left border-gray-200 rounded-xl p-4 sm:p-5 shadow-sm">

                                        {/* Meta: Badge & Date */}
                                        <div className="flex flex-wrap items-center gap-2 mb-3">
                                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold text-white shadow-sm ${typeConfig.bg}`}>
                                                {typeConfig.text}
                                            </span>
                                            <span className="text-[11px] sm:text-xs font-medium text-gray-500">
                                                {formatDateString(ann.createdAt)}
                                            </span>
                                            {ann.isPinned && (
                                                <span className="text-[11px] sm:text-xs font-medium text-amber-600 flex items-center gap-1">
                                                    📌 Pinned
                                                </span>
                                            )}
                                        </div>

                                        {/* Title */}
                                        <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-2 leading-snug">
                                            {ann.title}
                                        </h3>

                                        {/* HTML Content */}
                                        <div
                                            className="prose prose-sm max-w-none text-gray-600 leading-relaxed
                                            prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5
                                            prose-headings:text-gray-800 prose-headings:font-semibold
                                            prose-a:text-blue-600 marker:text-gray-400"
                                            dangerouslySetInnerHTML={{ __html: ann.content }}
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Footer Modal */}
                        <div className="p-4 sm:p-5 border-t border-gray-100 bg-white sticky bottom-0 z-10">
                            <button
                                onClick={handleClose}
                                className="w-full flex justify-center items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-3 px-4 rounded-xl font-bold transition-all active:scale-[0.98] shadow-md shadow-emerald-500/20"
                            >
                                <Check className="w-5 h-5" />
                                Saya Sudah Membaca
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
