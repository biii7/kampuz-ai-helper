# Dokumentasi Sistem Chatbot Pelayanan Keluhan Kampus
## Single Gateway UIN Alauddin Makassar

---

## 1. Gambaran Umum Sistem

Sistem **Single Gateway** adalah platform chatbot berbasis AI yang dirancang untuk menangani keluhan dan permintaan informasi mahasiswa UIN Alauddin Makassar secara terpusat. Sistem ini mengintegrasikan berbagai teknologi modern untuk memberikan pengalaman pengguna yang optimal.

### 1.1 Tujuan Sistem

```mermaid
mindmap
  root((Single Gateway))
    Pelayanan Keluhan
      Klasifikasi Otomatis
      Forwarding ke Pihak Terkait
      Tracking Status
    Informasi Kampus
      RAG System
      Semantic Search
      Caching
    Manajemen Admin
      Dashboard Analytics
      Kelola Kontak
      Kelola Dokumen
    Notifikasi
      WhatsApp
      Email
      Real-time
```

### 1.2 Fitur Utama

| No | Fitur | Deskripsi |
|----|-------|-----------|
| 1 | **Intent Detection** | Mendeteksi apakah pesan user adalah keluhan atau permintaan informasi |
| 2 | **Complaint Classification** | Mengklasifikasikan keluhan ke kategori yang sesuai |
| 3 | **Named Entity Recognition (NER)** | Mengekstrak informasi penting (NIM, lokasi, subjek) dari keluhan |
| 4 | **Sentiment Analysis** | Menganalisis sentimen user untuk respons yang empatik |
| 5 | **RAG System** | Menjawab pertanyaan berdasarkan dokumen kampus |
| 6 | **Auto-Forward** | Meneruskan tiket secara otomatis ke pihak terkait |
| 7 | **Real-time Notifications** | Notifikasi real-time untuk admin |
| 8 | **Multi-channel Delivery** | Pengiriman via WhatsApp dan Email |

---

## 2. Arsitektur High-Level

```mermaid
graph TB
    subgraph "👤 Users"
        U1[Mahasiswa]
        U2[Admin]
    end

    subgraph "🖥️ Frontend - React + Vite"
        FE1[Chat Interface]
        FE2[Admin Dashboard]
        FE3[Document Manager]
    end

    subgraph "☁️ Backend - Lovable Cloud"
        subgraph "Database"
            DB1[(tickets)]
            DB2[(campus_documents)]
            DB3[(forwarding_contacts)]
            DB4[(forwarding_logs)]
            DB5[(system_settings)]
        end
        
        subgraph "Edge Functions"
            EF1[process-complaint]
            EF2[keluhan]
            EF3[forward-ticket]
            EF4[generate-embeddings]
        end
        
        subgraph "Services"
            AUTH[Authentication]
            RLS[Row-Level Security]
            RT[Realtime]
        end
    end

    subgraph "🤖 AI Services"
        AI1[Intent Detection]
        AI2[Classification]
        AI3[NER]
        AI4[Sentiment Analysis]
        AI5[RAG/Embeddings]
    end

    subgraph "📧 External Services"
        EXT1[Fonnte - WhatsApp API]
        EXT2[Resend - Email API]
    end

    U1 --> FE1
    U2 --> FE2
    FE1 --> EF1
    FE1 --> EF2
    FE2 --> DB1
    FE2 --> DB3
    FE3 --> DB2
    EF1 --> AI1
    EF1 --> AI2
    EF1 --> AI3
    EF1 --> AI4
    EF1 --> AI5
    EF2 --> DB1
    EF3 --> EXT1
    EF3 --> EXT2
    EF3 --> DB4
    DB2 --> EF4
    EF4 --> AI5

    style U1 fill:#e1f5fe
    style U2 fill:#fff3e0
    style FE1 fill:#e8f5e9
    style FE2 fill:#e8f5e9
    style AI1 fill:#fce4ec
    style AI2 fill:#fce4ec
    style EXT1 fill:#f3e5f5
    style EXT2 fill:#f3e5f5
```

---

## 3. Komponen Utama

### 3.1 Frontend Components

```
src/
├── components/
│   ├── ChatInterface.tsx      # Interface chat utama
│   ├── AdminDashboard.tsx     # Dashboard admin
│   ├── AdminSidebar.tsx       # Navigasi admin
│   ├── ContactManagement.tsx  # Kelola kontak forwarding
│   ├── CampusDocuments.tsx    # Kelola dokumen kampus
│   ├── ForwardingLogs.tsx     # Log pengiriman
│   ├── ForwardingStats.tsx    # Statistik forwarding
│   ├── TicketDisplay.tsx      # Tampilan tiket
│   ├── TicketDetailDialog.tsx # Detail tiket
│   └── MessageTemplates.tsx   # Template pesan
├── pages/
│   ├── Index.tsx              # Halaman utama (chat)
│   ├── AdminAuth.tsx          # Login admin
│   └── NotFound.tsx           # 404 page
└── hooks/
    └── use-toast.ts           # Toast notifications
```

### 3.2 Edge Functions

```
supabase/functions/
├── process-complaint/         # Proses AI (intent, classify, NER, RAG)
├── keluhan/                   # Endpoint submit keluhan
├── forward-ticket/            # Forwarding ke WhatsApp/Email
├── generate-embeddings/       # Generate embeddings untuk RAG
├── parse-pdf-document/        # Parse dokumen PDF
└── check-pending-tickets/     # Cek tiket pending
```

---

## 4. Alur Data Utama

### 4.1 Alur Keluhan (Complaint Flow)

```mermaid
sequenceDiagram
    autonumber
    participant U as 👤 User
    participant CI as 💬 Chat Interface
    participant PC as ⚙️ process-complaint
    participant AI as 🤖 AI Models
    participant DB as 🗄️ Database
    participant FT as 📤 forward-ticket
    participant WA as 📱 WhatsApp
    participant EM as 📧 Email

    U->>CI: Mengetik pesan
    CI->>PC: Kirim pesan (type: intent)
    PC->>AI: Analisis intent
    AI-->>PC: "keluhan"
    
    CI->>PC: Klasifikasi (type: classify)
    PC->>AI: Kategorisasi
    AI-->>PC: kategori (akademik/fasilitas/dll)
    
    CI->>PC: Extract entity (type: ner)
    PC->>AI: Named Entity Recognition
    AI-->>PC: {nim, lokasi, subjek}
    
    CI->>PC: Analisis sentiment (type: sentiment)
    PC->>AI: Sentiment Analysis
    AI-->>PC: frustrated/sad/worried/neutral
    
    CI->>PC: Generate respons empatik
    PC->>AI: Empathetic Response
    AI-->>PC: Pesan empatik
    
    CI->>DB: Simpan tiket
    DB-->>CI: ticket_id
    
    alt Auto-Forward Enabled
        CI->>FT: Forward tiket
        FT->>DB: Ambil kontak kategori
        DB-->>FT: Daftar kontak
        
        par Kirim WhatsApp
            FT->>WA: Kirim pesan
            WA-->>FT: Status
        and Kirim Email
            FT->>EM: Kirim email
            EM-->>FT: Status
        end
        
        FT->>DB: Log hasil pengiriman
    end
    
    CI-->>U: Tampilkan respons + konfirmasi tiket
```

### 4.2 Alur Informasi (RAG Flow)

```mermaid
sequenceDiagram
    autonumber
    participant U as 👤 User
    participant CI as 💬 Chat Interface
    participant PC as ⚙️ process-complaint
    participant Cache as 📦 RAG Cache
    participant AI as 🤖 AI Models
    participant Docs as 📚 Documents

    U->>CI: Bertanya tentang kampus
    CI->>PC: Kirim pesan (type: intent)
    PC->>AI: Analisis intent
    AI-->>PC: "informasi"
    
    CI->>PC: RAG Query (type: rag)
    
    PC->>Cache: Cek cache
    
    alt Cache Hit
        Cache-->>PC: Jawaban tersimpan
        PC-->>CI: Gunakan jawaban cache
    else Cache Miss
        PC->>AI: Generate embedding pertanyaan
        AI-->>PC: Vector embedding
        
        PC->>Docs: Semantic search (match_documents)
        Docs-->>PC: Dokumen relevan
        
        PC->>AI: Generate jawaban dengan context
        AI-->>PC: Jawaban lengkap
        
        PC->>Cache: Simpan ke cache
    end
    
    CI-->>U: Tampilkan jawaban
```

---

## 5. Kategori Keluhan

Sistem mendukung 8 kategori keluhan utama:

```mermaid
pie showData
    title Kategori Keluhan
    "Fasilitas" : 20
    "Akademik" : 25
    "Keuangan" : 15
    "Pelayanan" : 15
    "Kebersihan" : 10
    "Keamanan" : 5
    "IT/Sistem" : 5
    "Lainnya" : 5
```

| Kategori | Deskripsi | Contoh |
|----------|-----------|--------|
| **fasilitas** | Masalah infrastruktur fisik | AC rusak, toilet bocor |
| **akademik** | Masalah perkuliahan | Jadwal bentrok, nilai salah |
| **keuangan** | Masalah pembayaran | UKT, beasiswa |
| **pelayanan** | Kualitas layanan staf | Antrian lama, staf tidak ramah |
| **kebersihan** | Kebersihan lingkungan | Sampah menumpuk |
| **keamanan** | Masalah keamanan | Kehilangan barang |
| **it_sistem** | Masalah teknologi | Portal error, WiFi lambat |
| **lainnya** | Kategori umum | Masalah lain-lain |

---

## 6. Status Tiket

```mermaid
stateDiagram-v2
    [*] --> pending: Tiket Dibuat
    pending --> in_progress: Admin Memproses
    pending --> forwarded: Auto-Forward
    in_progress --> resolved: Selesai
    in_progress --> forwarded: Diteruskan Manual
    forwarded --> resolved: Selesai
    resolved --> [*]
    
    note right of pending: Status awal tiket
    note right of forwarded: Sudah dikirim ke pihak terkait
    note right of resolved: Masalah terselesaikan
```

---

## 7. Keamanan Sistem

### 7.1 Row-Level Security (RLS)

Setiap tabel memiliki kebijakan RLS yang ketat:

```mermaid
graph LR
    subgraph "Public Access"
        A[Anyone] -->|INSERT| T1[tickets]
        A -->|SELECT| T2[campus_documents]
    end
    
    subgraph "Admin Only"
        B[Admin] -->|FULL ACCESS| T1
        B -->|FULL ACCESS| T3[forwarding_contacts]
        B -->|FULL ACCESS| T4[system_settings]
        B -->|SELECT| T5[forwarding_logs]
    end
    
    subgraph "System Only"
        C[System] -->|INSERT| T5
        C -->|INSERT/UPDATE| T6[rag_cache]
    end

    style A fill:#e8f5e9
    style B fill:#fff3e0
    style C fill:#e3f2fd
```

### 7.2 Authentication Flow

```mermaid
sequenceDiagram
    participant U as Admin
    participant FE as Frontend
    participant Auth as Auth Service
    participant DB as Database

    U->>FE: Login (email, password)
    FE->>Auth: signInWithPassword()
    Auth-->>FE: Session token
    FE->>DB: Check user_roles
    DB-->>FE: role: 'admin'
    FE-->>U: Redirect to Dashboard
```

---

## 8. Integrasi External

### 8.1 Fonnte (WhatsApp API)

```mermaid
graph LR
    A[forward-ticket] -->|POST| B[Fonnte API]
    B -->|Send| C[WhatsApp]
    C -->|Deliver| D[📱 Recipient]
    
    style B fill:#25D366
    style C fill:#25D366
```

**Endpoint:** `https://api.fonnte.com/send`

### 8.2 Resend (Email API)

```mermaid
graph LR
    A[forward-ticket] -->|POST| B[Resend API]
    B -->|Send| C[Email Server]
    C -->|Deliver| D[📧 Recipient]
    
    style B fill:#6366f1
```

**Endpoint:** `https://api.resend.com/emails`

---

## 9. Referensi Dokumen Lain

| Dokumen | Deskripsi |
|---------|-----------|
| [DIAGRAM_DATABASE.md](./DIAGRAM_DATABASE.md) | ERD dan struktur database |
| [ALUR_USER_KELUHAN.md](./ALUR_USER_KELUHAN.md) | Flowchart alur keluhan |
| [ALUR_USER_INFORMASI.md](./ALUR_USER_INFORMASI.md) | Flowchart alur RAG |
| [ALUR_ADMIN.md](./ALUR_ADMIN.md) | Flowchart alur admin |
| [SEQUENCE_DIAGRAM.md](./SEQUENCE_DIAGRAM.md) | Sequence diagram detail |
| [FITUR_KEAMANAN.md](./FITUR_KEAMANAN.md) | Dokumentasi keamanan |
| [API_REFERENCE.md](./API_REFERENCE.md) | Referensi API |

---

*Dokumentasi ini dibuat untuk keperluan skripsi/thesis tentang Sistem Chatbot Pelayanan Keluhan Kampus UIN Alauddin Makassar.*
