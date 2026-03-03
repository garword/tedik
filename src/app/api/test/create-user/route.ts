
import { NextResponse } from 'next/server';

// ⛔ ENDPOINT INI DINONAKTIFKAN KARENA ALASAN KEAMANAN
// Endpoint ini membuat user baru dan mengembalikan password plaintext — SANGAT BERBAHAYA di produksi
export async function GET() {
    return NextResponse.json({ error: 'Endpoint ini dinonaktifkan.' }, { status: 403 });
}
