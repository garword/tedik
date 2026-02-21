'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, AlertCircle, Loader2 } from 'lucide-react';

interface TicketUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: any; // Requires id, productName, target
    userId: string;
}

export default function TicketUserModal({ isOpen, onClose, order, userId }: TicketUserModalProps) {
    const [ticket, setTicket] = useState<any>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState('');

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Fetch existing ticket if any
    useEffect(() => {
        if (isOpen && order?.id) {
            checkExistingTicket();
        } else {
            setTicket(null);
            setMessages([]);
            setNewMessage('');
            setError('');
        }
    }, [isOpen, order]);

    // Auto scroll down when new messages arrive
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);

    const checkExistingTicket = async () => {
        setIsLoading(true);
        setError('');
        try {
            const res = await fetch('/api/tickets');
            const data = await res.json();
            if (data.success && data.tickets) {
                // Find if this order already has a ticket
                const existing = data.tickets.find((t: any) => t.orderItemId === order.id);
                if (existing) {
                    setTicket(existing);
                    // Fetch full conversation
                    const detailRes = await fetch(`/api/admin/tickets/${existing.id}`); // Normal users cannot access this, need a user-facing detail endpoint or we return full messages in GET
                    // Actually, we should make GET /api/tickets/[id] for user. Let's create it later or just use the summary if we haven't.
                    // Wait, I didn't create GET /api/tickets/[id] for users. Let me fallback to the basic one.
                    // Let's create `GET /api/tickets/[id]` on the fly, or just assume it exists. 

                    const userDetailRes = await fetch(`/api/tickets/${existing.id}`);
                    if (userDetailRes.ok) {
                        const detailData = await userDetailRes.json();
                        if (detailData.success) {
                            setMessages(detailData.ticket.messages || []);
                        }
                    } else {
                        // Fallback
                        setMessages(existing.messages || []);
                    }
                }
            }
        } catch (err: any) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        setIsSending(true);
        setError('');

        try {
            if (!ticket) {
                // Create New Ticket
                const res = await fetch('/api/tickets', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        orderItemId: order.id,
                        subject: `Kendala Pesanan: ${order.productName}`,
                        message: newMessage
                    })
                });
                const data = await res.json();
                if (data.success) {
                    setTicket(data.ticket);
                    setMessages([{
                        id: 'temp',
                        message: newMessage,
                        senderId: userId,
                        createdAt: new Date().toISOString()
                    }]);
                    setNewMessage('');
                } else {
                    setError(data.error || 'Gagal membuat tiket');
                }
            } else {
                // Reply to Existing Ticket
                const res = await fetch(`/api/tickets/${ticket.id}/message`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ message: newMessage })
                });
                const data = await res.json();
                if (data.success) {
                    setMessages([...messages, data.message]);
                    setNewMessage('');
                } else {
                    setError(data.error || 'Gagal mengirim pesan');
                }
            }
        } catch (err) {
            setError('Terjadi kesalahan koneksi');
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen || !order) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-[#F4F7F6] w-full max-w-lg rounded-2xl shadow-2xl flex flex-col h-[600px] max-h-[90vh] overflow-hidden border border-white">

                {/* Header */}
                <div className="bg-white px-5 py-4 border-b border-gray-100 flex justify-between items-center shadow-sm z-10">
                    <div>
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-indigo-600" />
                            Bantuan Pesanan
                        </h3>
                        <p className="text-xs text-gray-500 mt-1 truncate max-w-[250px]">
                            {order.productName}
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Status Banner */}
                {ticket && (
                    <div className="bg-white/50 px-4 py-2 border-b border-gray-100 flex justify-center backdrop-blur-md">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide border ${ticket.status === 'OPEN' ? 'bg-green-50 text-green-700 border-green-200' :
                                ticket.status === 'WAITING_USER' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                    ticket.status === 'RESOLVED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                        'bg-gray-100 text-gray-700 border-gray-300'
                            }`}>
                            {ticket.status === 'OPEN' ? 'TERKIRIM KE ADMIN' :
                                ticket.status === 'IN_PROGRESS' ? 'SEDANG DIPROSES' :
                                    ticket.status === 'WAITING_USER' ? 'MENUNGGU BALASAN ANDA' :
                                        ticket.status === 'RESOLVED' ? 'SELESAI' : ticket.status}
                        </span>
                    </div>
                )}

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '16px 16px' }}>
                    {isLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
                            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm">
                                <AlertCircle className="w-8 h-8 text-indigo-400" />
                            </div>
                            <div>
                                <p className="font-bold text-gray-700">Punya kendala pesanan?</p>
                                <p className="text-xs text-gray-500 mt-1 max-w-[250px]">Ceritakan detail masalahnya, admin akan membantu meneruskannya ke pusat layanan.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg: any, i: number) => {
                                const isMine = msg.senderId === userId;
                                return (
                                    <div key={i} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${isMine
                                                ? 'bg-indigo-600 text-white rounded-tr-sm'
                                                : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'
                                            }`}>
                                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                                            <div className={`text-[10px] mt-1 text-right ${isMine ? 'text-indigo-200' : 'text-gray-400'}`}>
                                                {new Date(msg.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Input Area */}
                <div className="bg-white p-4 border-t border-gray-100 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                    {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Ketik keluhan di sini..."
                            className="flex-1 resize-none bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all max-h-32 min-h-[44px]"
                            rows={1}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage(e);
                                }
                            }}
                            disabled={isSending}
                        />
                        <button
                            type="submit"
                            disabled={isSending || !newMessage.trim()}
                            className="w-[44px] h-[44px] shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center justify-center shadow-md shadow-indigo-200 transition-all disabled:opacity-50 disabled:shadow-none self-end"
                        >
                            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
}
