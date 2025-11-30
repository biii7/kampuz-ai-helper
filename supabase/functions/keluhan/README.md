# API Keluhan - Endpoint Penerimaan Keluhan

## URL Endpoint
```
POST https://hqmkzfejbsgjbhadetst.supabase.co/functions/v1/keluhan
```

## Headers
```
Content-Type: application/json
```

## Request Body
```json
{
  "nim": "string (required)",
  "kategori": "string (required) - fasilitas/akademik/administrasi/keuangan/pelanggaran/ppid",
  "lokasi": "string (required)",
  "subjek": "string (required)",
  "deskripsi": "string (required)"
}
```

## Response Success
```json
{
  "success": true,
  "ticket_id": "uuid",
  "results": [
    { "type": "whatsapp", "status": "success" },
    { "type": "email", "status": "success" }
  ]
}
```

## Response dengan Error Pengiriman
```json
{
  "success": true,
  "ticket_id": "uuid",
  "results": [
    { "type": "whatsapp", "status": "failed", "reason": "error message" },
    { "type": "email", "status": "success" }
  ],
  "errors": [
    { "type": "whatsapp", "reason": "error details" }
  ]
}
```

## Environment Variables
Konfigurasi melalui Supabase Secrets:
- `FONNTE_API_KEY` - API key dari Fonnte untuk WhatsApp
- `ADMIN_WA` - Nomor WhatsApp admin (format: 628123456789)
- `ADMIN_EMAIL` - Email admin untuk notifikasi
- `RESEND_API_KEY` - API key dari Resend untuk email

## Alur Kerja
1. API menerima data keluhan via POST
2. Membuat ticket baru di database dengan status "pending"
3. Mengirim notifikasi ke admin via:
   - WhatsApp (menggunakan Fonnte API)
   - Email (menggunakan Resend API)
4. Mencatat hasil pengiriman di tabel `forwarding_logs`
5. Jika pengiriman gagal, notifikasi dikirim ke semua admin via sistem notifikasi internal

## Contoh cURL
```bash
curl -X POST https://hqmkzfejbsgjbhadetst.supabase.co/functions/v1/keluhan \
  -H "Content-Type: application/json" \
  -d '{
    "nim": "60200121001",
    "kategori": "fasilitas",
    "lokasi": "Gedung A Lantai 2",
    "subjek": "AC Rusak",
    "deskripsi": "AC di ruang kelas 201 tidak dingin sudah 3 hari"
  }'
```
