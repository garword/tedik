import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Ambil ImgBB Key dari Database
        const imgbbConfig = await prisma.siteContent.findUnique({
            where: { slug: 'imgbb_api_key' }
        });

        const apiKey = imgbbConfig?.content;
        if (!apiKey) {
            return NextResponse.json({
                error: 'ImgBB API Key belum diatur di Pengaturan Admin (Menu Layanan & API)'
            }, { status: 400 });
        }

        const formData = await req.formData();
        const file = formData.get('image') as File;

        if (!file) {
            return NextResponse.json({ error: 'Tidak ada file gambar yang diunggah' }, { status: 400 });
        }

        // Convert file ke Base64 untuk dikirim ke ImgBB API
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Image = buffer.toString('base64');

        // FormData ke ImgBB
        const imgbbFormData = new FormData();
        imgbbFormData.append('image', base64Image);

        // Upload ke ImgBB
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: 'POST',
            body: imgbbFormData,
        });

        const result = await response.json();

        if (result.success) {
            return NextResponse.json({
                success: true,
                url: result.data.url, // URL gambar asli
                mediumUrl: result.data.medium?.url, // Opsional: ukuran medium
                thumbUrl: result.data.thumb?.url, // Opsional: thumbnail
                deleteUrl: result.data.delete_url // URL untuk menghapus gambar nanti
            });
        } else {
            return NextResponse.json({
                error: `Gagal mengupload ke ImgBB: ${result.error?.message || 'Unknown error'}`
            }, { status: 400 });
        }

    } catch (error: any) {
        console.error('Upload Error:', error);
        return NextResponse.json({ error: error.message || 'Terjadi kesalahan sistem' }, { status: 500 });
    }
}
