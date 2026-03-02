# Dokumentasi API Duitku Payment Gateway

## Overview
Duitku adalah **third-party payment gateway API** yang memungkinkan penerimaan pembayaran online dari berbagai metode pembayaran (VA, QRIS, E-wallet, Kartu Kredit, dll) melalui satu API.

## Credentials

| Item | Keterangan |
|------|-----------|
| **Merchant Code** | Kode proyek dari dashboard merchant Duitku (contoh: `DXXXX`) |
| **API Key** | Kode otentikasi API, didapat dari merchant portal bersama merchant code |

## Environment URLs

| Endpoint | Sandbox | Production |
|----------|---------|------------|
| Get Payment Method | `https://sandbox.duitku.com/webapi/api/merchant/paymentmethod/getpaymentmethod` | `https://passport.duitku.com/webapi/api/merchant/paymentmethod/getpaymentmethod` |
| Request Transaksi | `https://sandbox.duitku.com/webapi/api/merchant/v2/inquiry` | `https://passport.duitku.com/webapi/api/merchant/v2/inquiry` |
| Cek Transaksi | `https://sandbox.duitku.com/webapi/api/merchant/transactionStatus` | `https://passport.duitku.com/webapi/api/merchant/transactionStatus` |

## Integration Flow

```
1. [Optional] Get Payment Method → Daftar metode pembayaran aktif
2. Request Transaksi (inquiry) → Buat pembayaran, dapat paymentUrl/vaNumber/qrString
3. Redirect pelanggan ke paymentUrl ATAU tampilkan VA/QR sendiri
4. Callback (webhook) → Duitku kirim HTTP POST ke callbackUrl saat pembayaran berhasil/gagal
5. [Optional] Cek Transaksi → Verifikasi status pembayaran
```

---

## 1. Get Payment Method (Optional)
**Method:** `POST` | **Content-Type:** `application/json`

### Signature
```
SHA256(merchantCode + amount + datetime + apiKey)
```

### Request Body
```json
{
    "merchantcode": "DXXXX",
    "amount": 10000,
    "datetime": "2022-01-25 16:23:08",
    "signature": "<sha256_hash>"
}
```

### Response
```json
{
    "paymentFee": [
        {
            "paymentMethod": "VA",
            "paymentName": "MAYBANK VA",
            "paymentImage": "https://images.duitku.com/hotlink-ok/VA.PNG",
            "totalFee": "0"
        }
    ],
    "responseCode": "00",
    "responseMessage": "SUCCESS"
}
```

---

## 2. Request Transaksi (Inquiry)
**Method:** `POST` | **Content-Type:** `application/json`

### Signature
```
MD5(merchantCode + merchantOrderId + paymentAmount + apiKey)
```

### Request Body (Key Fields)
```json
{
    "merchantCode": "DXXXX",
    "paymentAmount": 40000,
    "paymentMethod": "SP",
    "merchantOrderId": "INV-RW-123456-ABCD",
    "productDetails": "Pembayaran order",
    "email": "user@example.com",
    "customerVaName": "John Doe",
    "callbackUrl": "https://yourdomain.com/api/webhooks/duitku",
    "returnUrl": "https://yourdomain.com/orders",
    "signature": "<md5_hash>",
    "expiryPeriod": 60
}
```

### Response
```json
{
    "merchantCode": "DXXXX",
    "reference": "DXXXXCX80TZJ85Q70QCI",
    "paymentUrl": "https://sandbox.duitku.com/topup/...",
    "vaNumber": "7007014001444348",
    "qrString": "00020101021226...",
    "amount": "40000",
    "statusCode": "00",
    "statusMessage": "SUCCESS"
}
```

> **Penting:** Simpan `reference` untuk tracking transaksi. `paymentUrl` untuk redirect, `vaNumber`/`qrString` untuk tampilan sendiri.

---

## 3. Callback (Webhook)
**Method:** `HTTP POST` | **Content-Type:** `x-www-form-urlencoded`

### Signature Verification
```
MD5(merchantCode + amount + merchantOrderId + apiKey)
```

### Key Parameters
| Parameter | Keterangan |
|-----------|-----------|
| `merchantCode` | Kode proyek |
| `amount` | Nominal transaksi |
| `merchantOrderId` | ID order dari merchant |
| `resultCode` | `00` = Success, `01` = Failed |
| `reference` | Referensi dari Duitku |
| `signature` | Hash MD5 untuk validasi |

### Requirements
- **Port:** 80 atau 443
- **URL:** Harus public (bukan localhost)
- **Response:** HTTP 200 OK
- Server Duitku retry max 5 kali jika belum dapat HTTP 200

### IP Whitelist
- **Production:** `182.23.85.8, 182.23.85.9, 182.23.85.10, 182.23.85.13, 182.23.85.14, 103.177.101.184-186, 103.177.101.189-190`
- **Sandbox:** `182.23.85.11, 182.23.85.12, 103.177.101.187, 103.177.101.188`

---

## 4. Cek Transaksi
**Method:** `POST` | **Content-Type:** `application/json`

### Signature
```
MD5(merchantCode + merchantOrderId + apiKey)
```

### Response
| Field | Keterangan |
|-------|-----------|
| `statusCode` | `00` = Success, `01` = Pending, `02` = Canceled |
| `amount` | Nominal |
| `fee` | Biaya transaksi |

---

## 5. Redirect
Setelah pembayaran selesai/dibatalkan, pelanggan diarahkan ke `returnUrl` dengan query params:
```
GET: returnUrl?merchantOrderId=xxx&resultCode=00&reference=xxx
```
> **JANGAN** gunakan `resultCode` dari redirect untuk update status — gunakan **callback** saja.

---

## Metode Pembayaran (Payment Codes)

### Virtual Account
`BC` (BCA), `M2` (Mandiri), `VA` (Maybank), `I1` (BNI), `B1` (CIMB), `BT` (Permata), `BR` (BRIVA), `BV` (BSI), `DM` (Danamon), dll.

### E-Wallet
`OV` (OVO), `SA` (ShopeePay Apps), `DA` (DANA), `LF`/`LA` (LinkAja), `SL` (ShopeePay Account Link), `OL` (OVO Account Link)

### QRIS
`SP` (ShopeePay), `NQ` (Nobu), `GQ` (Gudang Voucher), `SQ` (Nusapay)

### Kartu Kredit
`VC` (Visa/Master/JCB)

### Lainnya
`FT` (Alfamart/Pos), `IR` (Indomaret), `JP` (Jenius Pay), `DN` (Indodana), `AT` (ATOME)

---

## Sandbox Testing

### Kartu Kredit (3D Secure)
| Tipe | Nomor | Exp | CVV |
|------|-------|-----|-----|
| VISA | `4000 0000 0000 0044` | `03/33` | `123` |
| MASTERCARD | `5500 0000 0000 0004` | `03/33` | `123` |

---

## Status Codes (HTTP)
| Code | Keterangan |
|------|-----------|
| `200` | Success |
| `400` | Bad Request (minimum payment, missing field, dll) |
| `401` | Wrong signature |
| `404` | Merchant/Payment channel not found |
| `409` | Amount mismatch dengan itemDetails |
