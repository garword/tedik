'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import CharacterCount from '@tiptap/extension-character-count';
import {
    Bold, Italic, Underline as UnderlineIcon, Strikethrough,
    List, ListOrdered, AlignLeft, AlignCenter, AlignRight, AlignJustify,
    Link as LinkIcon, Image as ImageIcon, Heading1, Heading2, Quote, Undo, Redo,
    Loader2, ChevronDown, Check, X, Sparkles
} from 'lucide-react';
import { useCallback, useState, useRef, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
}

export default function RichTextEditor({ content, onChange }: RichTextEditorProps) {
    const { showToast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const [isHeadingMenuOpen, setIsHeadingMenuOpen] = useState(false);
    const headingMenuRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<any>(null);

    // Alt Text Modal State
    const [showAltModal, setShowAltModal] = useState(false);
    const [pendingImageUrl, setPendingImageUrl] = useState('');
    const [altText, setAltText] = useState('');
    const [imageTitle, setImageTitle] = useState('');

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (headingMenuRef.current && !headingMenuRef.current.contains(event.target as Node)) {
                setIsHeadingMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const getCurrentHeading = () => {
        if (!editor) return 'Normal';
        if (editor.isActive('heading', { level: 1 })) return 'Judul Utama';
        if (editor.isActive('heading', { level: 2 })) return 'Judul';
        if (editor.isActive('heading', { level: 3 })) return 'Subjudul';
        if (editor.isActive('heading', { level: 4 })) return 'Judul Kecil';
        return 'Normal';
    };

    const setHeading = (level: number | null) => {
        if (!editor) return;
        if (level === null) {
            editor.chain().focus().setParagraph().run();
        } else {
            editor.chain().focus().toggleHeading({ level: level as any }).run();
        }
        setIsHeadingMenuOpen(false);
    };

    // Konfigurasi TipTap
    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            Image.configure({
                HTMLAttributes: {
                    class: 'rounded-xl max-w-full h-auto my-4',
                },
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-emerald-600 underline cursor-pointer',
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            CharacterCount,
        ],
        content: content,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose-base lg:prose-lg prose-emerald focus:outline-none min-h-[1000px] w-full max-w-[21cm] mx-auto bg-white p-8 sm:p-12 md:p-16 shadow-md transition-shadow rounded-sm border border-gray-200 my-4 sm:my-8',
            },
            handleDrop: function (view, event, slice, moved) {
                if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
                    // Cek apakan file gambar
                    const file = event.dataTransfer.files[0];
                    if (file.type.startsWith('image/')) {
                        handleImageUpload(file);
                        return true; // Stop event default
                    }
                }
                return false;
            },
            handlePaste: function (view, event, slice) {
                const items = event.clipboardData?.items;
                if (!items) return false;

                let hasImage = false;
                for (let i = 0; i < items.length; i++) {
                    const item = items[i];
                    if (item.type.indexOf('image/') === 0) {
                        hasImage = true;
                        const file = item.getAsFile();
                        if (file) {
                            handleImageUpload(file); // Upload otomatis di latar belakang
                        }
                    }
                }

                if (hasImage) {
                    event.preventDefault();
                    return true;
                }

                return false;
            },
            transformPastedHTML(html) {
                // Mencegah Base64 raksasa masuk ke database, ubah menjadi File dan lempar ke API
                if (html.includes('<img') && html.includes('data:image/')) {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = html;

                    const images = tempDiv.querySelectorAll('img');
                    let imgCount = 0;

                    images.forEach((img) => {
                        const src = img.getAttribute('src');
                        if (src && src.startsWith('data:image/')) {
                            // Konversi Base64 ke File Object
                            try {
                                const arr = src.split(',');
                                const mimeMatch = arr[0].match(/:(.*?);/);
                                if (mimeMatch) {
                                    const mime = mimeMatch[1];
                                    const bstr = atob(arr[1]);
                                    let n = bstr.length;
                                    const u8arr = new Uint8Array(n);
                                    while (n--) {
                                        u8arr[n] = bstr.charCodeAt(n);
                                    }
                                    const file = new File([u8arr], `pasted-image-${Date.now()}-${imgCount}.png`, { type: mime });

                                    // Kirim kurir upload
                                    handleImageUpload(file);
                                    imgCount++;
                                }
                            } catch (error) {
                                console.error("Gagal parse base64 img", error);
                            }

                            // Hapus gambar base64 dari HTML hasil paste agar tidak memberatkan browser
                            img.remove();
                        }
                    });

                    if (imgCount > 0) {
                        showToast(`Sedang mengunggah ${imgCount} gambar sisipan ke ImgBB...`, 'info');
                    }

                    return tempDiv.innerHTML; // Kembalikan teks sisanya yang sudah bersih dari Base64
                }

                return html;
            }
        },
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
    });

    // Sinkronisasi editor instance ke ref agar bisa diakses dari dalam closures yang terperangkap (seperti editorProps)
    useEffect(() => {
        if (editor) {
            editorRef.current = editor;
        }
    }, [editor]);

    const handleImageUpload = async (file: File) => {
        if (!file.type.startsWith('image/')) {
            showToast('Hanya file gambar yang diizinkan', 'error');
            return;
        }

        setIsUploading(true);
        showToast('Mengunggah gambar ke Cloudflare R2...', 'info');

        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await fetch('/api/admin/blog/upload', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (res.ok && data.url) {
                // Show alt text modal instead of inserting directly
                setPendingImageUrl(data.url);
                setAltText('');
                setImageTitle('');
                setShowAltModal(true);
                showToast('Gambar berhasil diunggah! Silakan isi deskripsi SEO.', 'success');
            } else {
                showToast(data.error || 'Gagal mengunggah gambar', 'error');
            }
        } catch (error) {
            console.error('Upload error:', error);
            showToast('Koneksi terputus saat mengunggah', 'error');
        } finally {
            setIsUploading(false);
        }
    };

    const confirmImageInsert = () => {
        if (!editorRef.current || !pendingImageUrl) return;

        editorRef.current.chain().focus().setImage({
            src: pendingImageUrl,
            alt: altText || 'Gambar artikel blog',
            title: imageTitle || undefined,
        }).run();

        // Reset modal state
        setShowAltModal(false);
        setPendingImageUrl('');
        setAltText('');
        setImageTitle('');
    };

    const cancelImageInsert = () => {
        setShowAltModal(false);
        setPendingImageUrl('');
        setAltText('');
        setImageTitle('');
        showToast('Gambar dibatalkan (file tetap tersimpan di R2)', 'info');
    };

    const addImage = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async () => {
            if (input.files?.length) {
                await handleImageUpload(input.files[0]);
            }
        };
        input.click();
    }, [editor]);

    const setLink = useCallback(() => {
        const previousUrl = editor?.getAttributes('link').href;
        const url = window.prompt('URL', previousUrl);

        if (url === null) {
            return;
        }

        if (url === '') {
            editor?.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }

        editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }, [editor]);

    if (!editor) {
        return <div className="min-h-[400px] border border-gray-200 rounded-2xl flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-gray-400" /></div>;
    }

    const ToolbarButton = ({ onClick, isActive = false, disabled = false, icon: Icon, title }: any) => (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            title={title}
            className={`p-2 rounded-lg transition-colors ${isActive
                ? 'bg-emerald-100 text-emerald-700'
                : 'text-gray-600 hover:bg-gray-100'
                } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
            <Icon size={18} />
        </button>
    );

    return (
        <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col">

            {/* Toolbar Atas */}
            <div className="bg-gray-50 border-b border-gray-200 p-2 flex flex-wrap gap-1 sticky top-0 z-10">
                <div className="relative mr-2 flex flex-col justify-center" ref={headingMenuRef}>
                    <button
                        type="button"
                        onClick={() => setIsHeadingMenuOpen(!isHeadingMenuOpen)}
                        className="flex items-center justify-between space-x-2 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-colors min-w-[140px] text-gray-700"
                    >
                        <span className="text-sm font-medium">{getCurrentHeading()}</span>
                        <ChevronDown size={14} className="text-gray-500" />
                    </button>

                    {isHeadingMenuOpen && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setHeading(1)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between"
                            >
                                <span className="text-lg font-bold text-gray-900">Judul Utama</span>
                                {editor.isActive('heading', { level: 1 }) && <Check size={16} className="text-emerald-600" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => setHeading(2)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between"
                            >
                                <span className="text-base font-bold text-gray-800">Judul</span>
                                {editor.isActive('heading', { level: 2 }) && <Check size={16} className="text-emerald-600" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => setHeading(3)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between"
                            >
                                <span className="text-sm font-semibold text-gray-700">Subjudul</span>
                                {editor.isActive('heading', { level: 3 }) && <Check size={16} className="text-emerald-600" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => setHeading(4)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between"
                            >
                                <span className="text-xs font-semibold text-gray-600">Judul Kecil</span>
                                {editor.isActive('heading', { level: 4 }) && <Check size={16} className="text-emerald-600" />}
                            </button>
                            <div className="h-px bg-gray-100 my-1"></div>
                            <button
                                type="button"
                                onClick={() => setHeading(null)}
                                className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center justify-between"
                            >
                                <span className="text-sm text-gray-500">Paragraf Normal</span>
                                {!editor.isActive('heading') && <Check size={16} className="text-emerald-600" />}
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center space-x-1 mr-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                    <ToolbarButton
                        title="Bold (Ctrl+B)"
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        isActive={editor.isActive('bold')}
                        icon={Bold}
                    />
                    <ToolbarButton
                        title="Italic (Ctrl+I)"
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        isActive={editor.isActive('italic')}
                        icon={Italic}
                    />
                    <ToolbarButton
                        title="Underline (Ctrl+U)"
                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                        isActive={editor.isActive('underline')}
                        icon={UnderlineIcon}
                    />
                    <ToolbarButton
                        title="Strikethrough"
                        onClick={() => editor.chain().focus().toggleStrike().run()}
                        isActive={editor.isActive('strike')}
                        icon={Strikethrough}
                    />
                </div>

                <div className="flex items-center space-x-1 mr-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                    <ToolbarButton
                        title="Align Left"
                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                        isActive={editor.isActive({ textAlign: 'left' })}
                        icon={AlignLeft}
                    />
                    <ToolbarButton
                        title="Align Center"
                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                        isActive={editor.isActive({ textAlign: 'center' })}
                        icon={AlignCenter}
                    />
                    <ToolbarButton
                        title="Align Right"
                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                        isActive={editor.isActive({ textAlign: 'right' })}
                        icon={AlignRight}
                    />
                    <ToolbarButton
                        title="Justify"
                        onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                        isActive={editor.isActive({ textAlign: 'justify' })}
                        icon={AlignJustify}
                    />
                </div>

                <div className="flex items-center space-x-1 mr-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                    <ToolbarButton
                        title="Bullet List"
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        isActive={editor.isActive('bulletList')}
                        icon={List}
                    />
                    <ToolbarButton
                        title="Numbered List"
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        isActive={editor.isActive('orderedList')}
                        icon={ListOrdered}
                    />
                    <ToolbarButton
                        title="Blockquote"
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        isActive={editor.isActive('blockquote')}
                        icon={Quote}
                    />
                </div>

                <div className="flex items-center space-x-1 mr-2 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                    <ToolbarButton
                        title="Insert Link"
                        onClick={setLink}
                        isActive={editor.isActive('link')}
                        icon={LinkIcon}
                    />
                    <button
                        type="button"
                        onClick={addImage}
                        disabled={isUploading}
                        title="Insert Image (Bisa Drag & Drop)"
                        className="p-2 rounded-lg transition-colors text-emerald-600 hover:bg-emerald-50 relative"
                    >
                        {isUploading ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : <ImageIcon size={18} />}
                    </button>
                </div>

                <div className="flex-1"></div>

                <div className="flex items-center space-x-1 bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                    <ToolbarButton
                        title="Undo (Ctrl+Z)"
                        onClick={() => editor.chain().focus().undo().run()}
                        disabled={!editor.can().undo()}
                        icon={Undo}
                    />
                    <ToolbarButton
                        title="Redo (Ctrl+Y)"
                        onClick={() => editor.chain().focus().redo().run()}
                        disabled={!editor.can().redo()}
                        icon={Redo}
                    />
                </div>
            </div>

            {/* Area Editor Utama (Kanvas) */}
            <div className="flex-1 overflow-y-auto bg-[#F3F4F6] p-2 sm:p-6" onClick={() => editor.commands.focus()}>
                <EditorContent editor={editor} />
            </div>

            {/* Footer Status */}
            <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 text-xs font-medium text-gray-500 flex justify-between">
                <span>{editor.storage.characterCount?.words() || 0} Kata</span>
                <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                    Auto-save Ready
                </span>
            </div>

            {/* Alt Text SEO Modal */}
            {showAltModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) confirmImageInsert(); }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-white">
                                <Sparkles className="w-5 h-5" />
                                <h3 className="font-bold text-lg">Deskripsi Gambar (SEO)</h3>
                            </div>
                            <button onClick={cancelImageInsert} className="text-white/70 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Image Preview */}
                        <div className="px-6 pt-5">
                            <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                                <img src={pendingImageUrl} alt="Preview" className="w-full h-full object-contain" />
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className="px-6 py-5 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                    Alt Text <span className="text-emerald-600">(Wajib untuk SEO)</span>
                                </label>
                                <input
                                    type="text"
                                    value={altText}
                                    onChange={(e) => setAltText(e.target.value)}
                                    placeholder="Contoh: Panduan lengkap cara bermain Mobile Legends 2026"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                                    autoFocus
                                    onKeyDown={(e) => { if (e.key === 'Enter') confirmImageInsert(); }}
                                />
                                <p className="text-xs text-gray-500 mt-1.5">Deskripsikan gambar ini seolah-olah untuk pembaca tunanetra. Google menggunakan teks ini untuk memahami gambar Anda.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                                    Title <span className="text-gray-400 font-normal">(Opsional — Tooltip)</span>
                                </label>
                                <input
                                    type="text"
                                    value={imageTitle}
                                    onChange={(e) => setImageTitle(e.target.value)}
                                    placeholder="Contoh: Screenshot gameplay ML 2026"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-sm"
                                    onKeyDown={(e) => { if (e.key === 'Enter') confirmImageInsert(); }}
                                />
                                <p className="text-xs text-gray-500 mt-1.5">Teks ini muncul saat pengunjung mengarahkan kursor ke gambar.</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="px-6 pb-5 flex gap-3">
                            <button
                                onClick={cancelImageInsert}
                                className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors text-sm"
                            >
                                Batalkan
                            </button>
                            <button
                                onClick={confirmImageInsert}
                                className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-600/20 text-sm flex items-center justify-center gap-2"
                            >
                                <ImageIcon className="w-4 h-4" />
                                Sisipkan Gambar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
