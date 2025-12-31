# Alur User Mengirim Keluhan
## Flowchart Detail Proses Keluhan

---

## 1. Flowchart Utama

```mermaid
flowchart TD
    Start([🎯 User Membuka Aplikasi]) --> A[💬 Mengetik Pesan di Chat]
    A --> B{🤖 Intent Detection}
    
    B -->|Keluhan| C[📋 Classification]
    B -->|Informasi| RAG[📚 RAG System]
    
    C --> D[🔍 Named Entity Recognition]
    D --> E[😊 Sentiment Analysis]
    E --> F[💬 Generate Empathetic Response]
    F --> G[💾 Simpan Tiket ke Database]
    
    G --> H{⚙️ Auto-Forward Enabled?}
    
    H -->|Ya| I{📇 Ada Kontak Aktif?}
    H -->|Tidak| M[✅ Tampilkan Konfirmasi Tiket]
    
    I -->|Ya| J[📤 Forward ke Pihak Terkait]
    I -->|Tidak| M
    
    J --> K[📝 Log Hasil Pengiriman]
    K --> L[🔔 Notifikasi Real-time ke Admin]
    L --> M
    
    M --> N([🎉 Selesai])
    
    RAG --> O[🔎 Semantic Search Dokumen]
    O --> P[💡 Generate Jawaban]
    P --> N

    style Start fill:#e8f5e9
    style N fill:#e8f5e9
    style B fill:#fff3e0
    style C fill:#fce4ec
    style D fill:#fce4ec
    style E fill:#fce4ec
    style H fill:#e3f2fd
    style J fill:#f3e5f5
```

---

## 2. Detail Proses Intent Detection

```mermaid
flowchart LR
    subgraph Input
        A[Pesan User]
    end
    
    subgraph "AI Processing"
        B[Intent Detection Model]
        C{Hasil Klasifikasi}
    end
    
    subgraph Output
        D[keluhan]
        E[informasi]
    end
    
    A --> B
    B --> C
    C -->|Keluhan/Komplain| D
    C -->|Pertanyaan| E
    
    style D fill:#ffcdd2
    style E fill:#c8e6c9
```

**Prompt yang digunakan:**
```
Klasifikasikan pesan berikut sebagai "keluhan" atau "informasi".
- "keluhan": jika user menyampaikan masalah, komplain, atau ketidakpuasan
- "informasi": jika user bertanya atau meminta informasi

Pesan: "{message}"
Jawab hanya dengan satu kata: "keluhan" atau "informasi"
```

---

## 3. Detail Proses Classification

```mermaid
flowchart TD
    A[Pesan Keluhan] --> B[Classification Model]
    B --> C{Kategori}
    
    C --> D[fasilitas]
    C --> E[akademik]
    C --> F[keuangan]
    C --> G[pelayanan]
    C --> H[kebersihan]
    C --> I[keamanan]
    C --> J[it_sistem]
    C --> K[lainnya]
    
    style D fill:#e3f2fd
    style E fill:#e8f5e9
    style F fill:#fff3e0
    style G fill:#fce4ec
    style H fill:#f3e5f5
    style I fill:#ffcdd2
    style J fill:#b3e5fc
    style K fill:#d7ccc8
```

**Kategori dan Deskripsi:**

| Kategori | Deskripsi | Contoh Keluhan |
|----------|-----------|----------------|
| `fasilitas` | Masalah infrastruktur fisik | "AC di ruang kuliah rusak" |
| `akademik` | Masalah perkuliahan | "Jadwal ujian bentrok" |
| `keuangan` | Masalah pembayaran | "Tagihan UKT salah" |
| `pelayanan` | Kualitas layanan | "Staff tidak ramah" |
| `kebersihan` | Kebersihan lingkungan | "Toilet sangat kotor" |
| `keamanan` | Masalah keamanan | "Motor hilang di parkiran" |
| `it_sistem` | Masalah teknologi | "Portal akademik error" |
| `lainnya` | Kategori umum | Keluhan lain-lain |

---

## 4. Detail Proses Named Entity Recognition (NER)

```mermaid
flowchart TD
    A["Pesan: 'Saya Ani, NIM 60200121xxx,
    AC di Gedung A lantai 3 rusak
    sudah 2 minggu tidak diperbaiki'"]
    
    A --> B[NER Model]
    
    B --> C[Extract NIM]
    B --> D[Extract Lokasi]
    B --> E[Extract Subjek]
    
    C --> F["nim: '60200121xxx'"]
    D --> G["lokasi: 'Gedung A lantai 3'"]
    E --> H["subjek: 'AC rusak 2 minggu'"]
    
    style A fill:#e8f5e9
    style F fill:#fff3e0
    style G fill:#fff3e0
    style H fill:#fff3e0
```

**Prompt NER:**
```
Ekstrak informasi berikut dari pesan keluhan:
1. NIM (Nomor Induk Mahasiswa) - format: 8-15 digit
2. Lokasi kejadian
3. Ringkasan subjek keluhan (maksimal 10 kata)

Pesan: "{message}"

Format output JSON:
{"nim": "...", "lokasi": "...", "subjek": "..."}
```

---

## 5. Detail Proses Sentiment Analysis

```mermaid
flowchart LR
    A[Pesan Keluhan] --> B[Sentiment Model]
    B --> C{Sentiment}
    
    C --> D[😤 frustrated]
    C --> E[😢 sad]
    C --> F[😰 worried]
    C --> G[😐 neutral]
    
    D --> H[Respons Tegas & Empati]
    E --> I[Respons Menghibur]
    F --> J[Respons Menenangkan]
    G --> K[Respons Standar]
    
    style D fill:#ffcdd2
    style E fill:#bbdefb
    style F fill:#fff9c4
    style G fill:#e0e0e0
```

**Respons Empatik Berdasarkan Sentiment:**

| Sentiment | Karakteristik | Contoh Respons |
|-----------|---------------|----------------|
| `frustrated` | Marah, kecewa berat | "Kami sangat memahami kekesalan Anda. Masalah ini akan kami prioritaskan." |
| `sad` | Sedih, kecewa | "Kami turut prihatin dengan situasi ini. Kami akan berusaha membantu." |
| `worried` | Khawatir, cemas | "Kami memahami kekhawatiran Anda. Tenang, masalah ini akan kami tangani." |
| `neutral` | Netral, biasa | "Terima kasih telah melaporkan. Kami akan segera menindaklanjuti." |

---

## 6. Proses Penyimpanan Tiket

```mermaid
sequenceDiagram
    participant UI as Chat Interface
    participant SB as Supabase Client
    participant DB as Database
    
    UI->>SB: Insert ticket data
    Note over UI,SB: {nim, kategori, lokasi,<br/>subjek, deskripsi, status: 'pending'}
    
    SB->>DB: INSERT INTO tickets
    DB-->>SB: Return ticket_id
    SB-->>UI: ticket created
    
    UI->>UI: Show success message
    UI->>UI: Play confetti animation 🎉
```

**Data yang Disimpan:**
```typescript
{
  nim: string,           // Dari NER
  kategori: string,      // Dari Classification
  lokasi: string,        // Dari NER
  subjek: string,        // Dari NER
  deskripsi: string,     // Pesan asli user
  status: 'pending',     // Default status
  is_anonymous: boolean, // Flag anonim
  auto_forwarded: false  // Akan diupdate jika di-forward
}
```

---

## 7. Proses Auto-Forward

```mermaid
flowchart TD
    A[Tiket Baru Dibuat] --> B{Auto-Forward ON?}
    
    B -->|Tidak| END1[Selesai - Manual Forward]
    B -->|Ya| C[Ambil Setting dari DB]
    
    C --> D[Cari Kontak Aktif untuk Kategori]
    D --> E{Ada Kontak?}
    
    E -->|Tidak| F[Log: Tidak ada kontak]
    E -->|Ya| G[Invoke forward-ticket Function]
    
    G --> H{Tipe Kontak}
    
    H -->|WhatsApp| I[Kirim via Fonnte API]
    H -->|Email| J[Kirim via Resend API]
    
    I --> K{Berhasil?}
    J --> K
    
    K -->|Ya| L[Log: Success ✅]
    K -->|Tidak| M[Log: Failed ❌]
    
    L --> N[Update ticket.auto_forwarded = true]
    M --> O[Notify Admin of Failure]
    
    F --> END2[Selesai]
    N --> END2
    O --> END2

    style B fill:#fff3e0
    style E fill:#e3f2fd
    style K fill:#e8f5e9
    style L fill:#c8e6c9
    style M fill:#ffcdd2
```

---

## 8. Format Pesan Forward

### 8.1 Format WhatsApp

```
🎫 *TIKET KELUHAN BARU*
━━━━━━━━━━━━━━━━━━━━

📋 *Kategori:* {kategori}
📍 *Lokasi:* {lokasi}
👤 *NIM:* {nim}

📝 *Subjek:*
{subjek}

📄 *Deskripsi:*
{deskripsi}

━━━━━━━━━━━━━━━━━━━━
⏰ {waktu}
🔗 Single Gateway UIN Alauddin
```

### 8.2 Format Email

```html
Subject: [Tiket #{id}] Keluhan Baru - {kategori}

<h2>🎫 Tiket Keluhan Baru</h2>

<table>
  <tr><td><b>Kategori:</b></td><td>{kategori}</td></tr>
  <tr><td><b>Lokasi:</b></td><td>{lokasi}</td></tr>
  <tr><td><b>NIM:</b></td><td>{nim}</td></tr>
  <tr><td><b>Waktu:</b></td><td>{waktu}</td></tr>
</table>

<h3>Subjek</h3>
<p>{subjek}</p>

<h3>Deskripsi</h3>
<p>{deskripsi}</p>

<hr>
<p><i>Dikirim otomatis oleh Single Gateway UIN Alauddin Makassar</i></p>
```

---

## 9. Diagram State Tiket

```mermaid
stateDiagram-v2
    [*] --> pending: Tiket Dibuat
    
    pending --> in_progress: Admin Proses
    pending --> forwarded: Auto-Forward
    
    in_progress --> forwarded: Forward Manual
    in_progress --> resolved: Selesai
    
    forwarded --> in_progress: Admin Follow-up
    forwarded --> resolved: Selesai
    
    resolved --> [*]
    
    note right of pending
        Status awal semua tiket baru
    end note
    
    note right of forwarded
        Sudah diteruskan ke 
        pihak terkait
    end note
    
    note right of resolved
        Masalah telah 
        diselesaikan
    end note
```

---

## 10. Error Handling

```mermaid
flowchart TD
    A[Proses Keluhan] --> B{Error Terjadi?}
    
    B -->|Tidak| C[✅ Success]
    B -->|Ya| D{Jenis Error}
    
    D -->|AI Processing| E[Gunakan Default Values]
    D -->|Database| F[Retry 3x]
    D -->|Forwarding| G[Log Error + Notify Admin]
    
    E --> H[Lanjutkan Proses]
    F --> I{Berhasil?}
    G --> J[Tiket Tetap Tersimpan]
    
    I -->|Ya| C
    I -->|Tidak| K[Show Error Toast]
    
    H --> C
    J --> C
    K --> L[User Diminta Coba Lagi]

    style C fill:#c8e6c9
    style K fill:#ffcdd2
    style L fill:#ffcdd2
```

**Default Values jika AI Gagal:**
- `kategori`: "lainnya"
- `nim`: "tidak terdeteksi"
- `lokasi`: "tidak disebutkan"
- `subjek`: 50 karakter pertama dari pesan

---

## 11. Ringkasan Alur

```mermaid
journey
    title Perjalanan User Mengirim Keluhan
    section Mulai
      Buka aplikasi: 5: User
      Ketik keluhan: 5: User
    section Proses AI
      Intent Detection: 4: System
      Classification: 4: System
      NER Extraction: 4: System
      Sentiment Analysis: 4: System
    section Simpan & Forward
      Simpan tiket: 5: System
      Auto-forward: 4: System
      Log pengiriman: 5: System
    section Selesai
      Lihat konfirmasi: 5: User
      Terima notifikasi: 5: Admin
```

---

*Dokumentasi Alur Keluhan untuk Sistem Chatbot Pelayanan Keluhan Kampus*
