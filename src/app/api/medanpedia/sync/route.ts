
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServices, getMedanPediaConfig } from '@/lib/medanpedia';

import { syncMedanPediaCatalog } from '@/lib/medanpedia';

export const dynamic = 'force-dynamic';
// Set max duration to avoid timeout during large sync
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const result = await syncMedanPediaCatalog();
        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Sync Error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
