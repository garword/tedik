'use client';

import { useState, useEffect, useRef } from 'react';

import {
    MessageCircle,
    Search,
    Copy,
    CheckCircle,
    Clock,
    Tag,
    ExternalLink,
    Send,
    Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function AdminTicketsPage() {
    const [tickets, setTickets] = useState<any[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [replyMessage, setReplyMessage] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({});

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetchTickets();
    }, [statusFilter]);

    useEffect(() => {
        if (selectedTicket) {
            fetchTicketDetail(selectedTicket.id);
        }
    }, [selectedTicket?.id]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [selectedTicket?.messages]);

    const fetchTickets = async () => {
        setIsLoading(true);
        try {
            const url = statusFilter ? `/api/admin/tickets?status=${statusFilter}` : '/api/admin/tickets';
            const res = await fetch(url);
            const data = await res.json();
            if (data.success) {
                setTickets(data.tickets);
            }
        } catch (error) {
            console.error('Failed to fetch tickets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTicketDetail = async (id: string, silently = false) => {
        try {
            const res = await fetch(`/api/admin/tickets/${id}`);
            const data = await res.json();
            if (data.success) {
                setSelectedTicket(data.ticket);
                if (!silently) {
                    // Update main list silently if status changed
                    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: data.ticket.status } : t));
                }
            }
        } catch (error) {
            console.error('Failed to fetch ticket detail:', error);
        }
    };

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyMessage.trim() || !selectedTicket) return;

        setIsSending(true);
        try {
            const res = await fetch(`/api/tickets/${selectedTicket.id}/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: replyMessage })
            });
            const data = await res.json();
            if (data.success) {
                setReplyMessage('');
                await fetchTicketDetail(selectedTicket.id, true);
                fetchTickets(); // Refresh list to update latest message
            }
        } catch (error) {
            console.error('Failed to send reply:', error);
        } finally {
            setIsSending(false);
        }
    };

    const handleUpdateStatus = async (newStatus: string) => {
        if (!selectedTicket) return;
        try {
            const res = await fetch(`/api/admin/tickets/${selectedTicket.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            const data = await res.json();
            if (data.success) {
                fetchTicketDetail(selectedTicket.id);
                fetchTickets();
            }
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const handleCopy = (text: string, key: string) => {
        navigator.clipboard.writeText(text);
        setCopiedStates(prev => ({ ...prev, [key]: true }));
        setTimeout(() => {
            setCopiedStates(prev => ({ ...prev, [key]: false }));
        }, 2000);
    };

    const filteredTickets = tickets.filter(t => {
        const query = searchTerm.toLowerCase();
        return (
            t.subject.toLowerCase().includes(query) ||
            t.providerTrxId?.toLowerCase().includes(query) ||
            t.user?.name?.toLowerCase().includes(query)
        );
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Kelola Tiket SMM</h1>
                    <p className="text-sm text-gray-500">Keluhan dan laporan kendala pesanan dari pengguna.</p>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)] min-h-[600px]">

                {/* LIFT SIDE: Ticket List */}
                <div className="w-full lg:w-1/3 flex flex-col bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 space-y-3 shrink-0">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Cari tiket, ID, atau nama..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        </div>
                        <div className="flex gap-2 text-xs overflow-x-auto pb-1 hide-scrollbar">
                            <button onClick={() => setStatusFilter('')} className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${!statusFilter ? 'bg-indigo-600 text-white font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Semua</button>
                            <button onClick={() => setStatusFilter('OPEN')} className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${statusFilter === 'OPEN' ? 'bg-indigo-600 text-white font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Baru (Open)</button>
                            <button onClick={() => setStatusFilter('IN_PROGRESS')} className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${statusFilter === 'IN_PROGRESS' ? 'bg-indigo-600 text-white font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Diproses</button>
                            <button onClick={() => setStatusFilter('WAITING_USER')} className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${statusFilter === 'WAITING_USER' ? 'bg-indigo-600 text-white font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Menunggu User</button>
                            <button onClick={() => setStatusFilter('RESOLVED')} className={`px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${statusFilter === 'RESOLVED' ? 'bg-indigo-600 text-white font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>Selesai</button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {isLoading ? (
                            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
                        ) : filteredTickets.length > 0 ? (
                            filteredTickets.map(ticket => (
                                <div
                                    key={ticket.id}
                                    onClick={() => setSelectedTicket(ticket)}
                                    className={`p-3 rounded-xl border transition-all cursor-pointer ${selectedTicket?.id === ticket.id
                                        ? 'bg-indigo-50 border-indigo-200 shadow-[0_0_0_1px_rgba(99,102,241,0.2)]'
                                        : 'bg-white border-gray-100 hover:bg-gray-50 hover:border-gray-200'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="font-bold text-gray-900 text-sm truncate pr-2">{ticket.user?.name || 'User'}</span>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${ticket.status === 'OPEN' ? 'bg-green-100 text-green-700' :
                                            ticket.status === 'WAITING_USER' ? 'bg-orange-100 text-orange-700' :
                                                ticket.status === 'RESOLVED' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-700'
                                            }`}>
                                            {ticket.status}
                                        </span>
                                    </div>
                                    <p className="text-xs font-medium text-gray-800 line-clamp-1 mb-1">{ticket.subject}</p>
                                    <div className="flex justify-between items-center text-[10px] text-gray-500">
                                        <span>ID: {ticket.providerTrxId || 'N/A'}</span>
                                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {format(new Date(ticket.updatedAt), 'dd MMM HH:mm', { locale: id })}</span>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-10 text-gray-400 text-sm">Tidak ada tiket ditemukan.</div>
                        )}
                    </div>
                </div>

                {/* RIGHT SIDE: Ticket Detail & Chat */}
                <div className="w-full lg:w-2/3 flex flex-col bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                    {selectedTicket ? (
                        <>
                            {/* Ticket Detail Header */}
                            <div className="p-5 border-b border-gray-100 bg-gray-50shrink-0 z-10">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h2 className="text-lg font-bold text-gray-900">{selectedTicket.subject}</h2>
                                        <p className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                            <span>Dari: <b>{selectedTicket.user?.name}</b> ({selectedTicket.user?.email})</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={selectedTicket.status}
                                            onChange={(e) => handleUpdateStatus(e.target.value)}
                                            className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        >
                                            <option value="OPEN">Open (Baru)</option>
                                            <option value="IN_PROGRESS">In Progress (Diproses)</option>
                                            <option value="WAITING_USER">Waiting User</option>
                                            <option value="RESOLVED">Resolved (Selesai)</option>
                                            <option value="CLOSED">Closed</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Smart Copy Panel for Admin Workflow */}
                                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Tag className="w-4 h-4 text-indigo-600" />
                                        <h3 className="text-sm font-bold text-indigo-900">Informasi Pesanan Lengkap</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                        <div className="space-y-1">
                                            <span className="text-xs font-semibold text-indigo-800">Layanan & Target</span>
                                            <div className="bg-white px-3 py-2 rounded-lg border border-indigo-100 text-sm text-gray-700 truncate select-all" title={selectedTicket.orderItem?.productName}>
                                                <div className="font-medium truncate">{selectedTicket.orderItem?.productName || '-'}</div>
                                                <div className="text-xs text-indigo-600 truncate mt-0.5">{selectedTicket.orderItem?.target || '-'}</div>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <span className="text-xs font-semibold text-indigo-800">ID Provider (MedanPedia)</span>
                                            <div className="flex gap-2">
                                                <div className="flex-1 bg-white px-3 py-2 rounded-lg border border-indigo-100 font-mono text-sm font-bold text-gray-900 flex items-center justify-between">
                                                    <span>{selectedTicket.providerTrxId || 'Tidak Ada ID'}</span>
                                                    {selectedTicket.providerTrxId && (
                                                        <button
                                                            onClick={() => handleCopy(selectedTicket.providerTrxId, 'id')}
                                                            className="text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 p-1.5 rounded-md transition-colors"
                                                            title="Copy ID Provider"
                                                        >
                                                            {copiedStates['id'] ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* FIRST USER MESSAGE QUICK COPY */}
                                        {selectedTicket.messages && selectedTicket.messages.length > 0 && selectedTicket.messages[0].sender.role === 'USER' && (
                                            <div className="md:col-span-2 space-y-1 mt-2">
                                                <div className="flex justify-between items-end">
                                                    <span className="text-xs font-semibold text-indigo-800">Isi Keluhan Pelanggan Pertama</span>
                                                    <button
                                                        onClick={() => handleCopy(selectedTicket.messages[0].message, 'firstMsg')}
                                                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-white border border-indigo-200 hover:bg-indigo-100 px-2 py-1 rounded transition-colors flex gap-1 items-center shadow-sm"
                                                    >
                                                        {copiedStates['firstMsg'] ? <><CheckCircle className="w-3 h-3 text-green-600" /> Tersalin</> : <><Copy className="w-3 h-3" /> Salin Teks Keluhan</>}
                                                    </button>
                                                </div>
                                                <div className="bg-white p-3 rounded-lg border border-indigo-100 text-sm text-gray-700 italic border-l-4 border-l-indigo-400">
                                                    "{selectedTicket.messages[0].message}"
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-3 text-xs text-indigo-600/80 flex items-center gap-1">
                                        <ExternalLink className="w-3 h-3" />
                                        Gunakan data di atas untuk membuat tiket di <a href="https://medanpedia.co.id/ticket" target="_blank" rel="noreferrer" className="font-bold underline">MedanPedia</a>
                                    </div>
                                </div>
                            </div>

                            {/* Chat Thread */}
                            <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ backgroundColor: '#F9FAFB' }}>
                                {selectedTicket.messages?.map((msg: any, i: number) => {
                                    const isAdmin = msg.sender.role === 'ADMIN';
                                    return (
                                        <div key={i} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${isAdmin
                                                ? 'bg-indigo-600 text-white rounded-tr-sm'
                                                : 'bg-white text-gray-800 border border-gray-200 rounded-tl-sm'
                                                }`}>
                                                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                                                <div className={`text-[10px] mt-2 flex justify-end ${isAdmin ? 'text-indigo-200' : 'text-gray-400'}`}>
                                                    {format(new Date(msg.createdAt), 'dd MMM yyyy HH:mm', { locale: id })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Reply Input */}
                            <div className="p-4 bg-white border-t border-gray-100">
                                <form onSubmit={handleReply} className="flex gap-2">
                                    <textarea
                                        value={replyMessage}
                                        onChange={(e) => setReplyMessage(e.target.value)}
                                        placeholder="Ketik balasan untuk pengguna (atau *paste* balasan CS MedanPedia)..."
                                        className="flex-1 resize-none bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors max-h-32 min-h-[50px]"
                                        rows={2}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleReply(e);
                                            }
                                        }}
                                        disabled={isSending}
                                    />
                                    <button
                                        type="submit"
                                        disabled={isSending || !replyMessage.trim()}
                                        className="px-5 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                    >
                                        {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4 ml-1" /> Kirim</>}
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-60">
                            <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                            <h3 className="text-lg font-bold text-gray-700">Pilih Tiket</h3>
                            <p className="text-sm text-gray-500 max-w-sm mt-2">Pilih tiket dari daftar di sebelah kiri untuk melihat detail percakapan dan membalas pesan pengguna.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
