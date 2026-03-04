import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { uploadToR2 } from '@/lib/r2';

export async function POST(req: NextRequest) {
    console.log('--- UPLOAD ROUTE HIT ---');
    console.log('Headers:', Object.fromEntries(req.headers));
    const session = await getSession();
    console.log('Session result:', session);

    if (!session || session.role !== 'ADMIN') {
        console.log('Unauthorized triggered. Session is either null or not ADMIN.');
        return NextResponse.json({ error: 'Unauthorized', debug_session: session }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get('image') as File;

        if (!file) {
            return NextResponse.json({ error: 'Tidak ada file gambar yang diunggah' }, { status: 400 });
        }

        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'Format file ditolak. Harus berupa gambar.' }, { status: 400 });
        }

        // Upload to Cloudflare R2
        const url = await uploadToR2(file);

        return NextResponse.json({
            success: true,
            url: url,
        });

    } catch (error: any) {
        console.error('Upload Error:', error);
        return NextResponse.json({
            error: error.message || 'Terjadi kesalahan saat mengunggah gambar'
        }, { status: 500 });
    }
}
