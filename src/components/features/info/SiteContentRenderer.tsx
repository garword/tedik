'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, MessageCircle } from "lucide-react";
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

// Accordion Component for FAQS
const FaqAccordion = ({ faqs }: { faqs: { q: string, a: string }[] }) => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    if (!faqs || faqs.length === 0) return null;

    return (
        <div className="mt-10 space-y-3">
            <h4 className="font-bold text-gray-900 text-lg mb-4 flex items-center dark:text-white">
                <MessageCircle className="w-5 h-5 mr-2 text-emerald-500" />
                Pertanyaan Umum (FAQ)
            </h4>
            <div className="space-y-3">
                {faqs.map((faq, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 overflow-hidden transition-all duration-300 hover:border-emerald-300 dark:hover:border-emerald-500">
                        <button
                            onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
                            className="w-full flex items-center justify-between p-4 sm:p-5 text-left bg-gray-50/50 dark:bg-slate-800/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-colors"
                        >
                            <span className="font-bold text-gray-800 dark:text-gray-100 text-[15px] pr-4">
                                {faq.q}
                            </span>
                            <div className={cn("p-1.5 rounded-full transition-transform duration-300 flex-shrink-0", openIndex === idx ? "bg-emerald-100 text-emerald-600 rotate-180 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-gray-500")}>
                                <ChevronDown className="w-4 h-4" />
                            </div>
                        </button>
                        <AnimatePresence>
                            {openIndex === idx && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="p-4 sm:p-5 pt-0 text-[15px] text-gray-600 dark:text-gray-300 leading-relaxed border-t border-dashed border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 whitespace-pre-wrap">
                                        {faq.a}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default function SiteContentRenderer({ rawContent }: { rawContent: string }) {
    const { mainHtml, faqs } = useMemo(() => {
        let mainHtml = rawContent || '';
        let faqs: { q: string, a: string }[] = [];
        try {
            if (rawContent && rawContent.trim().startsWith('{') && rawContent.includes('"faqs"')) {
                const parsed = JSON.parse(rawContent);
                mainHtml = parsed.main || '';
                if (Array.isArray(parsed.faqs)) {
                    faqs = parsed.faqs;
                }
            }
        } catch (e) {
            // Keep default string
        }
        return { mainHtml, faqs };
    }, [rawContent]);

    return (
        <div>
            <div
                className="prose prose-emerald max-w-none text-gray-600 dark:text-gray-300 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: mainHtml }}
            />

            <FaqAccordion faqs={faqs} />
        </div>
    );
}
