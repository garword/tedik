require('dotenv').config({ path: '../../.env' });
const express = require('express');
const { createClient } = require('@libsql/client');
const axios = require('axios');
const crypto = require('crypto');

const app = express();
const PORT = process.env.VPS_CRON_PORT || 8080;

// Initialize Turso Client (Direct SQL)
const turso = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

// Helper: MD5 for Digiflazz signature
const md5 = (data) => crypto.createHash('md5').update(data).digest('hex');

// Authentication Middleware
const requireSecret = (req, res, next) => {
    const secret = req.query.secret;
    const envSecret = process.env.CRON_SECRET || 'supersecret123';
    if (secret !== envSecret) {
        return res.status(403).json({ error: 'Unauthorized. Invalid secret.' });
    }
    next();
};

// Start Server
app.listen(PORT, () => {
    console.log(`VPS Cron Micro-Server is running on port ${PORT}`);
    console.log(`Waiting for Cloudflare Triggers...`);
});

/**
 * ==========================================
 * SYNC LOGIC: DIGIFLAZZ (PREPAID)
 * ==========================================
 */
async function syncDigiflazz() {
    const username = process.env.DIGIFLAZZ_USERNAME;
    const apiKey = process.env.DIGIFLAZZ_API_KEY;

    if (!username || !apiKey) {
        console.error('[SYNC ERROR] Digiflazz credentials not configured.');
        return;
    }

    try {
        console.log(`[SYNC INIT] Digiflazz Prepaid...`);

        const sign = md5(username + apiKey + 'pricelist');
        const apiRes = await axios.post('https://api.digiflazz.com/v1/price-list', {
            cmd: 'prepaid',
            username,
            sign
        });

        const providerData = apiRes.data.data;
        if (!providerData || !Array.isArray(providerData)) throw new Error('Invalid Provider Response');

        console.log(`[SYNC] Pulled ${providerData.length} items from Digiflazz API.`);

        const dbRes = await turso.execute({
            sql: `SELECT variantId, providerSku, providerPrice, providerStatus FROM VariantProvider WHERE providerCode = 'DIGIFLAZZ'`,
            args: []
        });

        const dbProviders = dbRes.rows;
        let updateCount = 0;
        let batchSql = [];

        dbProviders.forEach(dbItem => {
            const apiItem = providerData.find(p => p.buyer_sku === dbItem.providerSku);
            if (!apiItem) return;

            const isApiNormal = apiItem.seller_product_status === true;
            const apiPrice = Number(apiItem.price);

            const isPriceChanged = Number(dbItem.providerPrice) !== apiPrice;
            const isStatusChanged = Boolean(dbItem.providerStatus) !== isApiNormal;

            if (isPriceChanged || isStatusChanged) {
                batchSql.push({
                    sql: `UPDATE VariantProvider SET providerPrice = ?, providerStatus = ?, lastUpdated = CURRENT_TIMESTAMP WHERE providerCode = 'DIGIFLAZZ' AND providerSku = ?`,
                    args: [apiPrice, isApiNormal ? 1 : 0, dbItem.providerSku]
                });
                updateCount++;
            }
        });

        if (batchSql.length > 0) {
            console.log(`[SYNC EXEC] Committing ${batchSql.length} changes to DB for Digiflazz...`);
            const chunkSize = 50;
            for (let i = 0; i < batchSql.length; i += chunkSize) {
                const chunk = batchSql.slice(i, i + chunkSize);
                await turso.batch(chunk, 'write');
            }
        }

        console.log(`[SYNC SUCCESS] Digiflazz finished. ${updateCount} rows updated.`);
    } catch (error) {
        console.error(`[SYNC ERROR] Digiflazz Failed:`, error.message);
    }
}

/**
 * ==========================================
 * SYNC LOGIC: TOKOVOUCHER
 * ==========================================
 */
async function syncTokovoucher() {
    const memberCode = process.env.TOKOVOUCHER_MEMBER_CODE;
    const signature = process.env.TOKOVOUCHER_SIGNATURE;

    if (!memberCode || !signature) {
        console.error('[SYNC ERROR] TokoVoucher credentials not configured.');
        return;
    }

    try {
        console.log(`[SYNC INIT] TokoVoucher...`);

        const apiRes = await axios.get(`https://api.tokovoucher.id/v1/produk?member_code=${memberCode}&signature=${signature}`);

        const providerData = apiRes.data.data;
        if (!providerData || !Array.isArray(providerData)) throw new Error('Invalid Provider Response');

        console.log(`[SYNC] Pulled ${providerData.length} items from TokoVoucher API.`);

        const dbRes = await turso.execute({
            sql: `SELECT variantId, providerSku, providerPrice, providerStatus FROM VariantProvider WHERE providerCode = 'TOKOVOUCHER'`,
            args: []
        });

        const dbProviders = dbRes.rows;
        let updateCount = 0;
        let batchSql = [];

        dbProviders.forEach(dbItem => {
            const apiItem = providerData.find(p => p.code === dbItem.providerSku);
            if (!apiItem) return;

            const isApiNormal = apiItem.status === 'normal' || apiItem.status === 1 || apiItem.status === true;
            const apiPrice = Number(apiItem.price);

            const isPriceChanged = Number(dbItem.providerPrice) !== apiPrice;
            const isStatusChanged = Boolean(dbItem.providerStatus) !== isApiNormal;

            if (isPriceChanged || isStatusChanged) {
                batchSql.push({
                    sql: `UPDATE VariantProvider SET providerPrice = ?, providerStatus = ?, lastUpdated = CURRENT_TIMESTAMP WHERE providerCode = 'TOKOVOUCHER' AND providerSku = ?`,
                    args: [apiPrice, isApiNormal ? 1 : 0, dbItem.providerSku]
                });
                updateCount++;
            }
        });

        if (batchSql.length > 0) {
            console.log(`[SYNC EXEC] Committing ${batchSql.length} changes to DB for TokoVoucher...`);
            const chunkSize = 50;
            for (let i = 0; i < batchSql.length; i += chunkSize) {
                const chunk = batchSql.slice(i, i + chunkSize);
                await turso.batch(chunk, 'write');
            }
        }

        console.log(`[SYNC SUCCESS] Tokovoucher finished. ${updateCount} rows updated.`);

    } catch (error) {
        console.error(`[SYNC ERROR] TokoVoucher Failed:`, error.message);
    }
}

/**
 * ==========================================
 * CRON ENDPOINT: UNIFIED SYNC ALL
 * URL: /vps-cron/sync-all?secret=XXX
 * ==========================================
 */
app.get('/vps-cron/sync-all', requireSecret, async (req, res) => {
    // 1. Send Immediate Response to cron-job.org to prevent Timeout
    res.status(200).json({ status: `Sequential Sync for ALL Providers started in background.` });

    // 2. Process synchronously in the background (one after another)
    // to prevent Memory Spikes / RAM Exhaustion on the 1GB VPS.
    (async () => {
        console.log('--- STARTING SEQUENTIAL UNIFIED SYNC ---');
        await syncDigiflazz();
        await syncTokovoucher();
        console.log('--- FINISHED SEQUENTIAL UNIFIED SYNC ---');
    })();
});
