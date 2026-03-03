
import { NextResponse } from 'next/server';

// ⛔ ENDPOINT INI DINONAKTIFKAN KARENA ALASAN KEAMANAN
// Jika perlu debug, gunakan terminal langsung di server
export async function GET() {
    return NextResponse.json({ error: 'Endpoint ini dinonaktifkan.' }, { status: 403 });
}
