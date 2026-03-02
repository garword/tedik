'use client';

import { useState, useEffect } from 'react';
import { Megaphone, Plus, Search, Edit2, Trash2, CheckCircle2, XCircle, Pin, Calendar, Info, AlertTriangle, PartyPopper, OctagonAlert } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface Announcement {
    id: string;
    title: string;
    content: string;
    type: 'info' | 'warning' | 'promo' | 'urgent';
    isActive: boolean;
    isPinned: boolean;
    startDate: string | null;
    endDate: string | null;
    sortOrder: number;
    createdAt: string;
}

export default function AnnouncementsAdmin() {
    const { showToast } = useToast();
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Partial<Announcement>>({
        type: 'info',
        isActive: true,
        isPinned: false,
        sortOrder: 0,
    });

    useEffect(() => {
        fetchAnnouncements();
    }, []);

    const fetchAnnouncements = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/announcements');
            const data = await res.json();
            if (res.ok) {
                setAnnouncements(data);
            } else {
                showToast(data.error || 'Failed to fetch announcements', 'error');
            }
        } catch (error) {
            showToast('Error connecting to server', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (announcement?: Announcement) => {
        if (announcement) {
            setEditingId(announcement.id);
            setFormData({
                ...announcement,
                startDate: announcement.startDate ? new Date(announcement.startDate).toISOString().slice(0, 16) : '',
                endDate: announcement.endDate ? new Date(announcement.endDate).toISOString().slice(0, 16) : '',
            });
        } else {
            setEditingId(null);
            setFormData({
                title: '',
                content: '',
                type: 'info',
                isActive: true,
                isPinned: false,
                startDate: '',
                endDate: '',
                sortOrder: 0,
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.content) {
            showToast('Title and content are required', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            const url = editingId ? `/api/admin/announcements/${editingId}` : '/api/admin/announcements';
            const method = editingId ? 'PUT' : 'POST';

            const payload = {
                ...formData,
                startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
                endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                showToast(`Announcement ${editingId ? 'updated' : 'created'} successfully`, 'success');
                setIsModalOpen(false);
                fetchAnnouncements();
            } else {
                const data = await res.json();
                showToast(data.error || 'Failed to save announcement', 'error');
            }
        } catch (error) {
            showToast('Error saving announcement', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, title: string) => {
        if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

        try {
            const res = await fetch(`/api/admin/announcements/${id}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                showToast('Announcement deleted', 'success');
                fetchAnnouncements();
            } else {
                const data = await res.json();
                showToast(data.error || 'Failed to delete announcement', 'error');
            }
        } catch (error) {
            showToast('Error deleting announcement', 'error');
        }
    };

    const getTypeConfig = (type: string) => {
        switch (type) {
            case 'info': return { icon: <Info size={16} />, color: 'bg-blue-100 text-blue-700 border-blue-200' };
            case 'warning': return { icon: <AlertTriangle size={16} />, color: 'bg-amber-100 text-amber-700 border-amber-200' };
            case 'promo': return { icon: <PartyPopper size={16} />, color: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200' };
            case 'urgent': return { icon: <OctagonAlert size={16} />, color: 'bg-red-100 text-red-700 border-red-200' };
            default: return { icon: <Info size={16} />, color: 'bg-gray-100 text-gray-700 border-gray-200' };
        }
    };

    const filteredData = announcements.filter(a =>
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.content.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatWIB = (dateString: string | null) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short' }) + ' WIB';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                        <Megaphone size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Pengumuman</h1>
                        <p className="text-sm text-gray-500">Kelola pop-up pengumuman dan informasi website</p>
                    </div>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition font-medium whitespace-nowrap"
                >
                    <Plus size={18} />
                    Buat Pengumuman
                </button>
            </div>

            {/* Filter */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                <Search size={20} className="text-gray-400" />
                <input
                    type="text"
                    placeholder="Cari pengumuman..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-sm"
                />
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100 text-sm font-semibold text-gray-500">
                                <th className="p-4 rounded-tl-xl whitespace-nowrap">Judul</th>
                                <th className="p-4 whitespace-nowrap text-center">Tipe</th>
                                <th className="p-4 whitespace-nowrap text-center">Status</th>
                                <th className="p-4 whitespace-nowrap">Jadwal Tayang (WIB)</th>
                                <th className="p-4 rounded-tr-xl whitespace-nowrap text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">Memuat data...</td>
                                </tr>
                            ) : filteredData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-gray-500">Tidak ada pengumuman ditemukan</td>
                                </tr>
                            ) : (
                                filteredData.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                {item.isPinned && <Pin size={14} className="text-gray-400 fill-gray-400 -rotate-45 shrink-0" />}
                                                <div>
                                                    <div className="font-semibold text-gray-900">{item.title}</div>
                                                    <div className="text-xs text-gray-500 w-48 truncate">{item.content.replace(/<[^>]+>/g, '')}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-center">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 border ${getTypeConfig(item.type).color}`}>
                                                    {getTypeConfig(item.type).icon}
                                                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                {item.isActive ? 'Aktif' : 'Nonaktif'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-xs text-gray-600">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={12} className="text-gray-400" />
                                                    <span className="text-gray-500">Mulai:</span> {formatWIB(item.startDate)}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar size={12} className="text-gray-400" />
                                                    <span className="text-gray-500">Berakhir:</span> {formatWIB(item.endDate)}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(item)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id, item.title)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
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

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-5">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Judul Pengumuman</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title || ''}
                                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                        placeholder="Contoh: Pemeliharaan Sistem / Promo Lebaran"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Tipe Pesan</label>
                                        <select
                                            value={formData.type || 'info'}
                                            onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                                        >
                                            <option value="info">Info (Biru)</option>
                                            <option value="warning">Warning (Kuning)</option>
                                            <option value="urgent">Urgent (Merah)</option>
                                            <option value="promo">Promo (Ungu)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1">Prioritas (Urutan)</label>
                                        <input
                                            type="number"
                                            value={formData.sortOrder || 0}
                                            onChange={e => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Isi Pesan (Mendukung HTML)</label>
                                    <textarea
                                        required
                                        rows={4}
                                        value={formData.content || ''}
                                        onChange={e => setFormData({ ...formData, content: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                                        placeholder="<p>Sistem akan mengalami pemeliharaan pada...</p>"
                                    ></textarea>
                                    <p className="text-[10px] text-gray-400 mt-1">Gunakan tag HTML sederhana seperti &lt;b&gt;, &lt;br&gt;, atau biarkan sebagai teks biasa.</p>
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-gray-900">Penjadwalan (WIB)</h3>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Mulai Tayang (Opsional)</label>
                                        <input
                                            type="datetime-local"
                                            value={formData.startDate?.toString() || ''}
                                            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-700"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500 mb-1">Otomatis Berakhir (Opsional)</label>
                                        <input
                                            type="datetime-local"
                                            value={formData.endDate?.toString() || ''}
                                            onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-gray-700"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-gray-900">Pengaturan Tampilan</h3>

                                    <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                                        <div className={`w-10 h-5 rounded-full transition-colors flex items-center px-1 ${formData.isActive ? 'bg-green-500' : 'bg-gray-200'}`}>
                                            <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${formData.isActive ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={formData.isActive || false}
                                            onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                                        />
                                        <div>
                                            <div className="text-sm font-semibold text-gray-800">Aktifkan Pesan</div>
                                            <div className="text-[10px] text-gray-500">Munculkan di website jika penjadwalan sesuai.</div>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50 transition">
                                        <div className={`w-10 h-5 rounded-full transition-colors flex items-center px-1 ${formData.isPinned ? 'bg-indigo-500' : 'bg-gray-200'}`}>
                                            <div className={`w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${formData.isPinned ? 'translate-x-5' : 'translate-x-0'}`} />
                                        </div>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={formData.isPinned || false}
                                            onChange={e => setFormData({ ...formData, isPinned: e.target.checked })}
                                        />
                                        <div>
                                            <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-800">
                                                <Pin size={12} className="text-indigo-600 fill-indigo-100" /> Pinned
                                            </div>
                                            <div className="text-[10px] text-gray-500">Memaksa user membaca (tidak bisa diclose & tampil teratas).</div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-200 rounded-xl transition"
                            >
                                Batal
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSubmitting}
                                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition flex items-center gap-2 shadow-sm"
                            >
                                {isSubmitting ? 'Menyimpan...' : 'Simpan Pengumuman'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
