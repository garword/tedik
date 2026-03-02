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

/**
 * ==========================================
 * VAK-SMS & OTP BACKGROUND AUTO-CATCHER
 * 10-Second High-Concurrency Looping
 * ==========================================
 */
let isCheckingOTP = false;
let otpCheckInterval = null;

async function checkPendingOTP() {
    if (isCheckingOTP) return;
    isCheckingOTP = true;

    try {
        const configRes = await turso.execute({ sql: "SELECT content FROM SiteContent WHERE slug = 'vaksms_api_key'", args: [] });
        const apiKey = configRes.rows[0]?.content;

        if (!apiKey) {
            isCheckingOTP = false;
            return;
        }

        const pendingRes = await turso.execute({
            sql: `SELECT id, userId, apiIdNum, phoneNumber, userPrice, createdAt FROM VirtualNumberOrder WHERE status = 'WAITING'`,
            args: []
        });

        const pendingOrders = pendingRes.rows;
        if (pendingOrders.length === 0) {
            isCheckingOTP = false;
            return;
        }

        const now = Date.now();
        const MIN_5_IN_MS = 5 * 60 * 1000;

        const batchSize = 20;
        for (let i = 0; i < pendingOrders.length; i += batchSize) {
            const chunk = pendingOrders.slice(i, i + batchSize);

            for (const order of chunk) {
                // Konversi tanggal ke milliseconds yang akurat untuk perbandingan
                const orderDate = new Date(order.createdAt).getTime();
                const isExpired = (now - orderDate) >= MIN_5_IN_MS;

                if (isExpired) {
                    // --- EXPIRED (Gagal Dapat SMS dalam 5 Menit -> Auto Refund) ---
                    console.log(`[OTP] Cancelling expired order ${order.id}`);
                    try {
                        await axios.get(`https://moresms.net/api/setStatus/?apiKey=${apiKey}&status=end&idNum=${order.apiIdNum}`);
                    } catch (e) { /* Abaikan error VAK jika koneksi terputus */ }

                    const userRes = await turso.execute({ sql: "SELECT balance FROM User WHERE id = ?", args: [order.userId] });
                    const currentBalance = Number(userRes.rows[0]?.balance || 0);
                    const newBalance = currentBalance + Number(order.userPrice);
                    const refId = `CANCEL-${order.id}`;

                    // Generate random Hash ID untuk WalletTransaction (Meniru CUID style yang unik)
                    const trxId = crypto.randomBytes(12).toString('hex');

                    await turso.batch([
                        {
                            sql: `UPDATE User SET balance = ? WHERE id = ?`,
                            args: [newBalance, order.userId]
                        },
                        {
                            sql: `UPDATE VirtualNumberOrder SET status = 'CANCELLED', updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
                            args: [order.id]
                        },
                        {
                            sql: `INSERT INTO WalletTransaction (id, userId, type, amount, balanceBefore, balanceAfter, referenceId, description, status, createdAt)
                                  VALUES (?, ?, 'CREDIT', ?, ?, ?, ?, ?, 'SUCCESS', CURRENT_TIMESTAMP)`,
                            args: [trxId, order.userId, Number(order.userPrice), currentBalance, newBalance, refId, `Refund Otomatis Timeout OTP (${order.phoneNumber})`]
                        }
                    ], 'write');
                } else {
                    // --- ORDER MASIH HIDUP (Minta Kode OTP ke Satelit VAK-SMS) ---
                    try {
                        const statusRes = await axios.get(`https://moresms.net/api/getSmsCode/?apiKey=${apiKey}&idNum=${order.apiIdNum}`);
                        const apiData = statusRes.data;

                        // Jika apiData JSON mengembalikan 'smsCode'
                        if (apiData.smsCode) {
                            console.log(`[OTP] SMS Found for ${order.id}: ${apiData.smsCode}`);
                            await turso.execute({
                                sql: `UPDATE VirtualNumberOrder SET status = 'SUCCESS', smsCode = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
                                args: [apiData.smsCode, order.id]
                            });
                        }
                    } catch (e) {
                        // Rate limit terjadi? Abaikan, sirkuit akan me-restart looping
                    }
                }

                // --- ANTI-DDOS BAN PROTECTION (Jeda 50ms per panggilan API VAK-SMS) ---
                await new Promise(resolve => setTimeout(resolve, 50));
            }
        }
    } catch (error) {
        console.error(`[OTP LOOP ERROR]:`, error.message);
    } finally {
        isCheckingOTP = false;
    }
}

function startOTPLoop() {
    if (otpCheckInterval) clearInterval(otpCheckInterval);
    console.log(`[OTP DAEMON] Starting 10-Second High-Frequency Poller...`);
    otpCheckInterval = setInterval(checkPendingOTP, 10 * 1000);
}

// ENDPOINT /vps-cron/otp-ping UNTUK CRON-JOB.ORG
app.get('/vps-cron/otp-ping', requireSecret, (req, res) => {
    // Sebagai penjaga alarm jika sewaktu-waktu PM2 di VPS nyangkut.
    console.log(`[PING] Received wake-up call for OTP Loop from Cron-job.org...`);
    startOTPLoop();
    res.status(200).json({ status: `OTP Poller is running and actively guarding 5-minute transactions.` });
});

// START LOOP PERTAMA KALI SAAT VPS BOOT
startOTPLoop();
