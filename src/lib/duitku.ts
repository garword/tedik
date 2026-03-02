import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import prisma from '@/lib/prisma';

// Helper function untuk generate MD5 hash
const generateMD5 = (stringToHash: string) => {
    return crypto.createHash('md5').update(stringToHash).digest('hex');
};

/**
 * Mendapatkan konfigurasi Duitku yang tersimpan di database.
 */
export async function getDuitkuConfig() {
    return await prisma.paymentGatewayConfig.findUnique({
        where: { name: 'duitku' }
    });
}

/**
 * Membuat transaksi baru di Duitku (Inquiry)
 * Menggunakan endpoint V2 Inquiry
 */
export async function createDuitkuTransaction(config: any, params: {
    orderId: string;
    amount: number;
    email?: string;
    customerVaName?: string;
    callbackUrl: string;
    returnUrl: string;
}) {
    // merchantCode disimpan di field 'slug' pada schema (karena struktur yang sama dengan Pakasir)
    const merchantCode = config.slug;
    const apiKey = config.apiKey;
    const paymentAmount = Math.round(params.amount);

    // Formula Signature Duitku (Inquiry): MD5(merchantCode + merchantOrderId + paymentAmount + apiKey)
    const signatureRaw = `${merchantCode}${params.orderId}${paymentAmount}${apiKey}`;
    const signature = generateMD5(signatureRaw);

    // URL sesuai environment (Sandbox atau Production)
    const apiUrl = config.mode === 'PRODUCTION'
        ? 'https://passport.duitku.com/webapi/api/merchant/v2/inquiry'
        : 'https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry';

    // Payload request inquiry
    // Di sini kita defaultkan menggunakan paymentMethod 'SP' (ShopeePay QRIS)
    // agar flow QRIS sama dengan Pak Kasir. Bisa diperluas jika ingin select metode lain.
    const payload = {
        merchantCode: merchantCode,
        paymentAmount: paymentAmount,
        paymentMethod: 'SP', // Default ke ShopeePay QRIS
        merchantOrderId: params.orderId,
        productDetails: `Pembayaran Pesanan ${params.orderId}`,
        email: params.email || 'customer@example.com',
        customerVaName: params.customerVaName || 'Customer',
        callbackUrl: params.callbackUrl,
        returnUrl: params.returnUrl,
        signature: signature,
        expiryPeriod: 60 // Expire dalam 60 menit
    };

    console.log('[Duitku] Request Inquiry:', JSON.stringify(payload, null, 2));

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        const data = await response.json();
        console.log('[Duitku] Response Inquiry:', JSON.stringify(data, null, 2));

        return data; // Mengembalikan object yang berisi reference, qrString, dll.
    } catch (error) {
        console.error('[Duitku] Fetch Error:', error);
        return { error: 'Fetch failed' };
    }
}

/**
 * Melakukan verifikasi transaksi manual (Check Transaction Status)
 */
export async function checkDuitkuTransaction(config: any, orderId: string) {
    const merchantCode = config.slug;
    const apiKey = config.apiKey;

    // Formula Signature: MD5(merchantCode + merchantOrderId + apiKey)
    const signatureRaw = `${merchantCode}${orderId}${apiKey}`;
    const signature = generateMD5(signatureRaw);

    const apiUrl = config.mode === 'PRODUCTION'
        ? 'https://passport.duitku.com/webapi/api/merchant/transactionStatus'
        : 'https://sandbox.duitku.com/webapi/api/merchant/transactionStatus';

    const payload = new URLSearchParams({
        merchantCode: merchantCode,
        merchantOrderId: orderId,
        signature: signature
    });

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: payload.toString(),
        });

        return await response.json();
    } catch (error) {
        console.error('[Duitku] Check Transaction Error:', error);
        return { error: 'Fetch failed' };
    }
}

/**
 * Validasi Callback Webhook dari Duitku
 * Mengembalikan true jika valid, false jika beda signature
 */
export function verifyDuitkuCallback(config: any, params: {
    amount: string;
    merchantOrderId: string;
    signature: string;
}) {
    const merchantCode = config.slug;
    const apiKey = config.apiKey;

    // Formula Signature Webhook: MD5(merchantcode + amount + merchantOrderId + apiKey)
    const expectedSignatureRaw = `${merchantCode}${params.amount}${params.merchantOrderId}${apiKey}`;
    const expectedSignature = generateMD5(expectedSignatureRaw);

    return params.signature === expectedSignature;
}
