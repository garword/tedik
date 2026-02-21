import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function POST(req: NextRequest) {
    const session = await getSession();
    // if (!session || session.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { apiKey } = body;

        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'API Key is required.' });
        }

        const url = `https://moresms.net/api/getBalance/?apiKey=${apiKey}`;
        const response = await fetch(url, { headers: { 'Accept': 'application/json' } });
        const data = await response.json();

        if (data.error) {
            return NextResponse.json({ success: false, error: data.error });
        }

        if (data.balance !== undefined) {
            return NextResponse.json({
                success: true,
                balance: data.balance,
                memberName: 'VAK-SMS Account'
            });
        }

        return NextResponse.json({ success: false, error: 'Format respons tidak dikenali.' });

    } catch (error: any) {
        console.error('[VAK-SMS Test Error]:', error);
        return NextResponse.json({ success: false, error: error.message });
    }
}
