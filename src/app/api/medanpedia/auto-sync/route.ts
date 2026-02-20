import { NextRequest, NextResponse } from 'next/server';
import { getSystemConfig, setSystemConfig } from '@/lib/config';
import { syncMedanPediaCatalog } from '@/lib/medanpedia';

export const dynamic = 'force-dynamic';
// Set max duration for Vercel
export const maxDuration = 60;

export async function GET(req: NextRequest) {
    try {
        const LAST_SYNC_KEY = 'medanpedia_last_sync';
        // Cooldown period: 1 hour (3600000 ms)
        const COOLDOWN_MS = 3600000;

        const lastSyncTimestampStr = await getSystemConfig(LAST_SYNC_KEY);
        const lastSyncTimestamp = lastSyncTimestampStr ? parseInt(lastSyncTimestampStr, 10) : 0;
        const now = Date.now();

        // Check if 1 hour has passed since the last sync
        if (now - lastSyncTimestamp < COOLDOWN_MS) {
            return NextResponse.json({
                success: true,
                synced: false,
                message: 'Skipped sync, 1 hour cooldown active.',
                timeLeftSeconds: Math.floor((COOLDOWN_MS - (now - lastSyncTimestamp)) / 1000)
            });
        }

        // Lock the timestamp IMMEDIATELY to prevent concurrent duplicate syncs from multiple visitors
        await setSystemConfig(LAST_SYNC_KEY, now.toString(), false, 'Timestamp of the last successful Medanpedia Auto-Sync (in ms)');

        // Run the heavy sync operation in the background
        const result = await syncMedanPediaCatalog();

        return NextResponse.json({
            success: true,
            synced: true,
            data: result
        });

    } catch (error: any) {
        console.error('Medanpedia Auto-Sync Error:', error);
        return NextResponse.json({ success: false, synced: false, error: error.message }, { status: 500 });
    }
}
