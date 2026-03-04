'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { MessageCircle, X, ChevronDown, Send, HelpCircle, ArrowLeft, Loader2, Clock, Check, CheckCheck } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp, faTelegram } from '@fortawesome/free-brands-svg-icons';

interface Faq {
    id: string;
    question: string;
    answer: string;
}

interface HelpCenterWidgetProps {
    whatsapp: string;
    telegram: string;
    faqs: Faq[];
}

interface ChatMessage {
    id: string;
    sender: 'bot' | 'user';
    text: string;
    isHtml?: boolean;
    timestamp: Date;
    status?: 'sending' | 'sent' | 'delivered' | 'read';
}

export default function HelpCenterWidget({ whatsapp, telegram, faqs }: HelpCenterWidgetProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeView, setActiveView] = useState<'home' | 'whatsapp' | 'telegram'>('home');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isBotTyping, setIsBotTyping] = useState(false);
    const [customInputMode, setCustomInputMode] = useState(false);

    // Kept for custom input form
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom when message changes or view opens
    useEffect(() => {
        if ((activeView === 'whatsapp' || activeView === 'telegram') && chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [activeView, messages, isSending, isBotTyping, customInputMode]);

    // Reset view when modal is closed
    useEffect(() => {
        // Dispatch event for other components (like SalesNotification) to know CS widget state
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('toggleCsWidget', { detail: { isOpen } }));
        }

        if (!isOpen) {
            setTimeout(() => {
                setActiveView('home');
                setMessages([]);
                setCustomInputMode(false);
                setMessage('');
                setIsSending(false);
            }, 300); // Reset after closing animation
        } else {
            // Lock body scroll
            document.body.style.overflow = 'hidden';
            document.body.style.touchAction = 'none'; // Prevent pull-to-refresh & background drag
        }

        return () => {
            document.body.style.overflow = '';
            document.body.style.touchAction = '';
        };
    }, [isOpen]);

    const initChat = () => {
        setMessages([
            {
                id: 'welcome',
                sender: 'bot',
                text: 'Halo! 👋\nAda yang bisa kami bantu hari ini? Silakan pilih topik pertanyaan di bawah ini.',
                timestamp: new Date()
            }
        ]);
        setCustomInputMode(false);
        setMessage('');
    };

    const handleWhatsapp = () => {
        initChat();
        setActiveView('whatsapp');
    };

    const handleTelegram = () => {
        initChat();
        setActiveView('telegram');
    };

    const goHome = () => {
        setActiveView('home');
    };

    const handleFaqClick = (faq: Faq) => {
        // Add user message
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            sender: 'user',
            text: faq.question,
            timestamp: new Date(),
            status: 'read' // Instant read for predefined
        };
        setMessages(prev => [...prev, userMsg]);

        setIsBotTyping(true);

        setTimeout(() => {
            const botMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                sender: 'bot',
                text: faq.answer,
                isHtml: true,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMsg]);
            setIsBotTyping(false);
        }, 1500);
    };

    const handleOtherClick = () => {
        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            sender: 'user',
            text: 'Pertanyaan Lainnya',
            timestamp: new Date(),
            status: 'read'
        };
        setMessages(prev => [...prev, userMsg]);

        setIsBotTyping(true);

        setTimeout(() => {
            const botMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                sender: 'bot',
                text: 'Baik, silakan tulis pertanyaan Anda di bawah ini.\nCS Milo akan merespon pesan Anda secepatnya!',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMsg]);
            setIsBotTyping(false);
            setCustomInputMode(true);
        }, 1200);
    };

    const processCustomSend = (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!message.trim() || isSending) return;

        const newMsgId = Date.now().toString();
        const currentMsgText = message.trim();

        const newUserMsg: ChatMessage = {
            id: newMsgId,
            sender: 'user',
            text: currentMsgText,
            timestamp: new Date(),
            status: 'sending'
        };

        setMessages(prev => [...prev, newUserMsg]);
        setMessage(''); // Clear input
        setIsSending(true);

        const updateMsgStatus = (status: ChatMessage['status']) => {
            setMessages(prev => prev.map(m => m.id === newMsgId ? { ...m, status } : m));
        };

        // Stage 1: Sent (1 check)
        setTimeout(() => updateMsgStatus('sent'), 600);

        if (activeView === 'whatsapp') {
            // Stage 2: Delivered (2 gray checks)
            setTimeout(() => updateMsgStatus('delivered'), 1600);

            // Stage 3: Read (2 blue checks)
            setTimeout(() => updateMsgStatus('read'), 2600);

            // Stage 4: Open WhatsApp Tab
            setTimeout(() => {
                const encodedMessage = encodeURIComponent(currentMsgText);
                const targetNumber = whatsapp || "6281234567890";
                window.open(`https://wa.me/${targetNumber}?text=${encodedMessage}`, '_blank');
                completeSend();
            }, 4000);
        } else {
            // Stage 2: Read (2 green checks)
            setTimeout(() => updateMsgStatus('read'), 1800);

            // Stage 3: Open Telegram Tab
            setTimeout(() => {
                const encodedMessage = encodeURIComponent(currentMsgText);
                const targetUsername = telegram || "username_test";
                window.open(`https://t.me/${targetUsername}?text=${encodedMessage}`, '_blank');
                completeSend();
            }, 3000);
        }
    };

    const completeSend = () => {
        setIsSending(false);
        setIsOpen(false);
    };

    return (
        <>
            {/* Floating Button */}
            <motion.button
                onClick={() => setIsOpen(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={cn(
                    "fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-[60] p-4 rounded-full shadow-xl text-white transition-all duration-300",
                    "bg-gradient-to-br from-emerald-500 to-green-600 hover:shadow-emerald-500/40 border-2 border-white/20",
                    isOpen ? "opacity-0 pointer-events-none translate-y-10" : "opacity-100 translate-y-0"
                )}
            >
                <div className="relative flex items-center justify-center">
                    <MessageCircle className="w-7 h-7" strokeWidth={2.5} />
                    {/* Pulsing Dot */}
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-red-500 border-2 border-white"></span>
                    </span>
                </div>
            </motion.button>

            {/* Modal / Widget */}
            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Backdrop (Mobile) */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 sm:hidden"
                        />

                        {/* Widget Container */}
                        <motion.div
                            initial={{ opacity: 0, y: 50, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 50, scale: 0.95 }}
                            className={cn(
                                "fixed z-50 bg-white shadow-2xl overflow-hidden flex flex-col font-sans",
                                "bottom-4 left-4 right-4 h-[75vh] max-h-[600px] rounded-2xl border", // Mobile styles: floating slightly above bottom, padding around edges, fixed height
                                "sm:bottom-24 sm:right-6 sm:left-auto sm:top-auto sm:w-[400px] sm:h-[650px] sm:max-h-[calc(100vh-120px)] sm:border-gray-100/50" // Desktop styles
                            )}
                        >
                            {/* Header */}
                            {activeView === 'home' ? (
                                <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 p-5 text-white flex justify-between items-start shrink-0 relative overflow-hidden transition-all duration-300">
                                    <div className="absolute -right-4 -top-8 w-24 h-24 bg-white/10 rounded-full"></div>
                                    <div className="relative z-10 w-full">
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-2 mb-1">
                                                <div className="bg-white/20 p-1.5 rounded-lg">
                                                    <HelpCircle className="w-5 h-5 text-white" />
                                                </div>
                                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-700/50 text-emerald-50">Online</span>
                                            </div>
                                            <button onClick={() => setIsOpen(false)} className="p-2 -mr-2 -mt-2 text-white/80 hover:text-white hover:bg-black/10 rounded-full transition-colors">
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <h3 className="font-bold text-lg mt-2">Pusat Bantuan</h3>
                                        <p className="text-emerald-50 text-sm mt-0.5 max-w-[250px] leading-snug">
                                            Selesaikan masalah dengan cepat atau hubungi tim responsif kami.
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className={cn(
                                    "p-4 text-white flex justify-between items-center shrink-0 relative overflow-hidden transition-all duration-300 shadow-md z-10",
                                    activeView === 'whatsapp' ? "bg-[#00a884]" : "bg-[#2AABEE]"
                                )}>
                                    <div className="flex items-center gap-3">
                                        <button onClick={goHome} className="p-1 -ml-1 text-white hover:bg-white/20 rounded-full transition-colors">
                                            <ArrowLeft className="w-5 h-5" />
                                        </button>
                                        <div className="relative w-10 h-10 shrink-0 rounded-full bg-white shadow-sm border border-white/20 flex items-center justify-center overflow-hidden">
                                            <img
                                                src={`/avatar-milo.png?t=${Date.now()}`}
                                                alt="Milo CS"
                                                className="w-full h-full object-cover rounded-full"
                                            />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[15px] leading-tight flex items-center">
                                                Milo CS
                                                <div className={cn(
                                                    "w-3.5 h-3.5 rounded-full flex items-center justify-center ml-1.5 -mt-0.5 shadow-sm",
                                                    activeView === 'whatsapp' ? "bg-[#4080ff]" : "bg-white"
                                                )}>
                                                    <Check className={cn(
                                                        "w-2.5 h-2.5 stroke-[3.5]",
                                                        activeView === 'whatsapp' ? "text-white" : "text-[#2AABEE]"
                                                    )} />
                                                </div>
                                            </h3>
                                            <p className="text-[11px] font-medium tracking-wide opacity-90">
                                                {activeView === 'whatsapp' ? 'Sedang Aktif' : 'online'}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => setIsOpen(false)} className="p-2 -mr-2 text-white/80 hover:text-white hover:bg-black/10 rounded-full transition-colors">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            )}

                            {/* Content Areas */}
                            {activeView === 'home' ? (
                                <div className="flex-1 flex flex-col items-center p-6 sm:p-8 bg-gray-50/50 text-center relative overflow-y-auto w-full">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100 rounded-full blur-3xl opacity-50 translate-x-10 -translate-y-10"></div>
                                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-100 rounded-full blur-3xl opacity-50 -translate-x-10 translate-y-10"></div>

                                    <div className="w-24 h-24 bg-white rounded-full shadow-md flex items-center justify-center mb-6 relative z-10 p-1 mt-auto shrink-0">
                                        <div className="w-full h-full rounded-full overflow-hidden relative">
                                            <img
                                                src={`/avatar-milo.png?t=${Date.now()}`}
                                                alt="Milo CS"
                                                className="w-full h-full object-cover rounded-full"
                                            />
                                        </div>
                                        <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full"></div>
                                    </div>
                                    <h4 className="text-xl font-bold text-gray-800 mb-2 relative z-10">Halo! Saya Milo 👋</h4>
                                    <p className="text-sm text-gray-500 mb-8 max-w-[250px] relative z-10 leading-relaxed">
                                        Pilih platform di bawah ini untuk mulai ngobrol dan dapatkan bantuan cepat.
                                    </p>

                                    <div className="flex flex-col gap-3 w-full max-w-[260px] relative z-10 mb-auto shrink-0">
                                        <button
                                            onClick={handleWhatsapp}
                                            className="flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-emerald-50 border border-gray-100 hover:border-emerald-200 shadow-sm transition-all duration-200 group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-[#25d366]/10 flex items-center justify-center text-[#25d366]">
                                                    <FontAwesomeIcon icon={faWhatsapp} className="w-6 h-6" />
                                                </div>
                                                <span className="font-bold text-gray-700 text-[15px]">WhatsApp</span>
                                            </div>
                                            <div className="w-7 h-7 rounded-full bg-gray-50 group-hover:bg-[#25d366]/10 flex items-center justify-center transition-colors">
                                                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-[#25d366] -rotate-90" />
                                            </div>
                                        </button>
                                        <button
                                            onClick={handleTelegram}
                                            className="flex items-center justify-between p-4 rounded-2xl bg-white hover:bg-blue-50 border border-gray-100 hover:border-blue-200 shadow-sm transition-all duration-200 group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-[#229ED9]/10 flex items-center justify-center text-[#229ED9]">
                                                    <FontAwesomeIcon icon={faTelegram} className="w-6 h-6" />
                                                </div>
                                                <span className="font-bold text-gray-700 text-[15px]">Telegram</span>
                                            </div>
                                            <div className="w-7 h-7 rounded-full bg-gray-50 group-hover:bg-[#229ED9]/10 flex items-center justify-center transition-colors">
                                                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-[#229ED9] -rotate-90" />
                                            </div>
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {/* Content - Chat Area */}
                                    <div className={cn(
                                        "flex-1 relative overflow-hidden flex flex-col",
                                        activeView === 'whatsapp' ? "bg-[#efeae2]" : "bg-[#9ebbd1]"
                                    )}>
                                        {/* Doodle overlay */}
                                        <div
                                            className={cn(
                                                "absolute inset-0 z-0",
                                                activeView === 'whatsapp' ? "opacity-[0.08]" : "opacity-[0.15]"
                                            )}
                                            style={{
                                                backgroundImage: activeView === 'whatsapp'
                                                    ? 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")'
                                                    : 'url("https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg")',
                                                backgroundRepeat: 'repeat',
                                                backgroundSize: activeView === 'whatsapp' ? '300px' : '400px',
                                                backgroundPosition: 'center',
                                                mixBlendMode: activeView === 'telegram' ? 'overlay' : 'normal'
                                            }}
                                        />

                                        {/* Scrollable messages */}
                                        <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10 items-stretch">
                                            {/* Date Separator */}
                                            <div className="flex justify-center my-4">
                                                <span className={cn(
                                                    "text-[11px] font-bold px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-sm",
                                                    activeView === 'whatsapp'
                                                        ? "bg-[#e1e2de] text-[#54656f]"
                                                        : "bg-black/15 text-white/90 backdrop-blur-sm"
                                                )}>Hari ini</span>
                                            </div>

                                            {/* Messages */}
                                            {messages.map((msg) => (
                                                <motion.div
                                                    key={msg.id}
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    className={cn(
                                                        "flex",
                                                        msg.sender === 'user' ? "justify-end" : "justify-start"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "p-3 pt-2 shadow-sm max-w-[85%] sm:max-w-[75%] text-[14px] leading-relaxed relative",
                                                        msg.sender === 'user'
                                                            ? activeView === 'whatsapp'
                                                                ? "bg-[#dcf8c6] text-[#111b21] rounded-2xl rounded-tr-none border border-[#cbebb4]"
                                                                : "bg-[#efffde] text-black rounded-2xl rounded-br-sm shadow-sm"
                                                            : activeView === 'whatsapp'
                                                                ? "bg-white text-[#111b21] rounded-2xl rounded-tl-none border border-gray-100/50"
                                                                : "bg-white text-black rounded-2xl rounded-bl-sm shadow-sm"
                                                    )}>
                                                        {msg.isHtml ? (
                                                            <div
                                                                className="prose prose-sm max-w-none text-[14px] [&>p]:mb-1 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4 [&>p]:last:mb-0"
                                                                dangerouslySetInnerHTML={{ __html: msg.text }}
                                                            />
                                                        ) : (
                                                            <p className="whitespace-pre-wrap font-medium">{msg.text}</p>
                                                        )}

                                                        <div className={cn(
                                                            "text-[10px] float-right mt-1.5 ml-3 flex items-center gap-1 min-w-[50px] justify-end",
                                                            msg.sender === 'user'
                                                                ? activeView === 'whatsapp' ? "text-gray-500" : "text-[#4fa25d]"
                                                                : activeView === 'whatsapp' ? "text-gray-400" : "text-gray-400"
                                                        )}>
                                                            <span>{msg.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>

                                                            {msg.sender === 'user' && (
                                                                <>
                                                                    {/* WhatsApp Ticks */}
                                                                    {activeView === 'whatsapp' && (
                                                                        <>
                                                                            {msg.status === 'sending' && <Clock className="w-[11px] h-[11px] text-gray-400" />}
                                                                            {msg.status === 'sent' && <Check className="w-[14px] h-[14px] text-gray-400 -ml-0.5" />}
                                                                            {msg.status === 'delivered' && <CheckCheck className="w-[15px] h-[15px] text-gray-400 -ml-0.5" />}
                                                                            {msg.status === 'read' && <CheckCheck className="w-[15px] h-[15px] text-[#53bdeb] -ml-0.5" />}
                                                                        </>
                                                                    )}

                                                                    {/* Telegram Ticks */}
                                                                    {activeView === 'telegram' && (
                                                                        <>
                                                                            {msg.status === 'sending' && <Clock className="w-[11px] h-[11px] text-[#4fa25d]/70" />}
                                                                            {msg.status === 'sent' && <Check className="w-[14px] h-[14px] text-[#4fa25d] -ml-0.5" />}
                                                                            {msg.status === 'read' && <CheckCheck className="w-[15px] h-[15px] text-[#4fa25d] -ml-0.5" />}
                                                                        </>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}

                                            {/* Typing Indicator */}
                                            {isBotTyping && (
                                                <motion.div
                                                    initial={{ opacity: 0, x: -10, scale: 0.95 }}
                                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                                    className="flex justify-start"
                                                >
                                                    <div className={cn(
                                                        "bg-white p-3 shadow-sm relative flex gap-1.5 items-center h-10 w-16 justify-center",
                                                        activeView === 'whatsapp' ? "rounded-2xl rounded-tl-none border border-gray-100/50" : "rounded-2xl rounded-bl-sm"
                                                    )}>
                                                        <motion.div
                                                            animate={{ y: [0, -4, 0] }}
                                                            transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                                                            className={cn("w-2 h-2 rounded-full", activeView === 'whatsapp' ? "bg-gray-400" : "bg-blue-400")}
                                                        />
                                                        <motion.div
                                                            animate={{ y: [0, -4, 0] }}
                                                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                                                            className={cn("w-2 h-2 rounded-full", activeView === 'whatsapp' ? "bg-gray-400" : "bg-blue-400")}
                                                        />
                                                        <motion.div
                                                            animate={{ y: [0, -4, 0] }}
                                                            transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                                                            className={cn("w-2 h-2 rounded-full", activeView === 'whatsapp' ? "bg-gray-400" : "bg-blue-400")}
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}

                                            {/* Suggestions List */}
                                            {!customInputMode && !isBotTyping && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.2 }}
                                                    className="flex flex-col gap-2.5 mt-2 ml-2"
                                                >
                                                    {faqs && faqs.length > 0 && faqs.map(faq => (
                                                        <button
                                                            key={faq.id}
                                                            onClick={() => handleFaqClick(faq)}
                                                            className={cn(
                                                                "self-start text-left px-4 py-2.5 rounded-2xl rounded-tl-md text-[13px] shadow-sm transition-all font-medium border",
                                                                activeView === 'whatsapp'
                                                                    ? "bg-white/95 hover:bg-white text-emerald-700 border-emerald-500/20 hover:border-emerald-500/50 hover:shadow-emerald-500/10"
                                                                    : "bg-white/95 hover:bg-white text-blue-700 border-blue-500/20 hover:border-blue-500/50 hover:shadow-blue-500/10"
                                                            )}
                                                        >
                                                            {faq.question}
                                                        </button>
                                                    ))}
                                                    <button
                                                        onClick={handleOtherClick}
                                                        className="self-start text-left bg-white/90 hover:bg-white border border-gray-300 hover:border-gray-400 text-gray-700 px-4 py-2.5 rounded-2xl rounded-tl-md text-[13px] shadow-sm transition-all font-medium"
                                                    >
                                                        Pertanyaan / Kendala Lainnya
                                                    </button>
                                                </motion.div>
                                            )}

                                            {/* Auto-scroll anchor */}
                                            <div ref={chatEndRef} className="h-2 mt-auto shrink-0" />
                                        </div>

                                        {/* Footer - Input */}
                                        <div className={cn(
                                            "p-3 flex gap-2 shrink-0 z-20 transition-all duration-300",
                                            activeView === 'whatsapp'
                                                ? "bg-[#f0f2f5] border-t border-gray-200"
                                                : "bg-white border-t border-gray-100"
                                        )}>
                                            <form onSubmit={processCustomSend} className="flex-1 flex gap-2 items-end">
                                                <div className={cn(
                                                    "flex-1 bg-white rounded-[22px] flex items-center px-4 py-2.5 shadow-sm border transition-colors",
                                                    customInputMode ? "border-gray-100/50" : "border-transparent bg-gray-100 opacity-70 cursor-not-allowed"
                                                )}>
                                                    <input
                                                        type="text"
                                                        value={message}
                                                        onChange={e => setMessage(e.target.value)}
                                                        disabled={!customInputMode || isSending}
                                                        placeholder={customInputMode ? "Ketik pesan Anda..." : "Pilih opsi di atas..."}
                                                        className="w-full bg-transparent border-none outline-none text-[15px] placeholder:text-[#8696a0] disabled:cursor-not-allowed"
                                                        autoComplete="off"
                                                    />
                                                </div>
                                                <button
                                                    type="submit"
                                                    disabled={!message.trim() || !customInputMode || isSending}
                                                    className={cn(
                                                        "w-[42px] h-[42px] shrink-0 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm",
                                                        message.trim() && customInputMode && !isSending
                                                            ? activeView === 'whatsapp'
                                                                ? "bg-[#00a884] text-white hover:bg-[#008f6f]"
                                                                : "bg-[#2AABEE] text-white hover:bg-[#229ED9]"
                                                            : "bg-[#e5e7eb] text-[#8696a0] cursor-not-allowed"
                                                    )}
                                                >
                                                    {isSending ? (
                                                        <Loader2 className="w-5 h-5 animate-spin" />
                                                    ) : (
                                                        <Send className={cn(
                                                            "w-5 h-5 transition-all text-white",
                                                            message.trim() && customInputMode && !isSending ? "-ml-0.5" : "-ml-1"
                                                        )} />
                                                    )}
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
