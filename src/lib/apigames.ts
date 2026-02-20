
import crypto from 'crypto';
import prisma from '@/lib/prisma';

interface APIGamesConfig {
    merchantId: string;
    secretKey: string;
}

export async function getAPIGamesConfig(): Promise<APIGamesConfig | null> {
    const merchant = await prisma.siteContent.findUnique({ where: { slug: 'apigames_merchant_id' } });
    const secret = await prisma.siteContent.findUnique({ where: { slug: 'apigames_secret_key' } });

    if (!merchant?.content || !secret?.content) return null;

    return {
        merchantId: merchant.content,
        secretKey: secret.content
    };
}

export async function createAPIGamesOrder(
    config: APIGamesConfig,
    data: {
        code: string;
        target: string;
        refId: string; // Must be UNIQUE
        serverId?: string;
    }
) {
    const { merchantId, secretKey } = config;
    const { code, target, refId, serverId = '' } = data;

    // Signature formula for Transaction: md5(merchant_id:secret_key:ref_id)
    const signature = crypto.createHash('md5')
        .update(`${merchantId}:${secretKey}:${refId}`)
        .digest('hex');

    const payload = {
        ref_id: refId,
        merchant_id: merchantId,
        produk: code,
        tujuan: target,
        server_id: serverId,
        signature: signature
    };

    try {
        const response = await fetch('https://v1.apigames.id/v2/transaksi', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const resJson = await response.json();
        const responseData = resJson.data;

        // Map status
        // APIGames returns: "Pending", "Proses", "Sukses", "Gagal", "Validasi Provider"
        // We map to our internal providerStatus
        let status = 'PENDING';
        if (resJson.status === 1) {
            const apiStatus = responseData?.status?.toLowerCase();
            if (apiStatus === 'sukses') status = 'SUCCESS';
            else if (apiStatus === 'gagal') status = 'FAILED';
            else status = 'PROCESSING'; // Pending, Proses, Validasi Provider -> PROCESSING
        } else {
            status = 'FAILED';
        }

        return {
            success: resJson.status === 1,
            status: status,
            sn: responseData?.sn || '',
            message: responseData?.message || resJson.error_msg || 'Unknown error',
            trxId: responseData?.trx_id || '',
            raw: resJson
        };

    } catch (error: any) {
        console.error('APIGames Error:', error);
        return {
            success: false,
            status: 'FAILED',
            message: error.message || 'Connection Error',
            raw: null
        };
    }
}
