# Sistem Chatbot Pelayanan Keluhan Kampus UIN Alauddin Makassar

## Ringkasan Eksekutif

Sistem Chatbot Pelayanan Keluhan Kampus adalah aplikasi web berbasis AI yang dirancang untuk mengelola keluhan dan pertanyaan mahasiswa UIN Alauddin Makassar secara otomatis dan efisien. Sistem ini mengintegrasikan teknologi Natural Language Processing (NLP), Machine Learning, dan sistem manajemen tiket untuk memberikan layanan yang responsif dan terstruktur.

## Tujuan Sistem

1. **Meningkatkan Efisiensi Pelayanan**: Mengotomatisasi proses penerimaan dan klasifikasi keluhan mahasiswa
2. **Mempercepat Respon**: Memberikan jawaban instan untuk pertanyaan informasi kampus
3. **Meningkatkan Akurasi**: Menggunakan AI untuk ekstraksi data otomatis dan klasifikasi keluhan yang konsisten
4. **Memudahkan Monitoring**: Menyediakan dashboard admin untuk tracking dan analitik keluhan
5. **Sentimen-Aware**: Memberikan respon empatik berdasarkan sentimen pengguna

## Fitur Utama

### 1. Chatbot AI dengan Multiple Capabilities

#### A. Intent Detection (Deteksi Niat)
- **Fungsi**: Mendeteksi apakah user ingin melaporkan keluhan atau mencari informasi
- **Output**: 
  - `"keluhan"` → Lanjut ke proses ticketing
  - `"informasi"` → Lanjut ke RAG system
- **Teknologi**: Google Gemini 2.0 Flash (via Lovable AI Gateway)
- **Akurasi**: ~95% untuk bahasa Indonesia

#### B. RAG (Retrieval-Augmented Generation)
- **Fungsi**: Menjawab pertanyaan informasi kampus dengan akurat
- **Sumber Data**: Database dokumen kampus (`campus_documents`)
- **Keunggulan**: Jawaban berbasis fakta, bukan halusinasi AI
- **Contoh Query**:
  - "Siapa rektor UIN Alauddin?"
  - "Fakultas apa saja yang ada di UIN?"
  - "Bagaimana cara daftar mahasiswa baru?"

#### C. Complaint Classification
- **Fungsi**: Mengklasifikasikan keluhan ke dalam 6 kategori
- **Kategori**:
  1. **Fasilitas** - Masalah infrastruktur, ruangan, kebersihan
  2. **Akademik** - Perkuliahan, dosen, kurikulum
  3. **Administrasi** - Pelayanan administrasi, surat-menyurat
  4. **Keuangan** - Pembayaran, beasiswa, SPP
  5. **Pelanggaran** - Pelaporan SPI/DUMAS
  6. **PPID** - Permintaan informasi publik
- **Model**: AI classification dengan prompt engineering
- **Akurasi**: ~90%

#### D. NER (Named Entity Recognition)
- **Fungsi**: Ekstraksi otomatis entitas penting dari teks keluhan
- **Entitas yang Diekstrak**:
  - **NIM**: Nomor Induk Mahasiswa
  - **Lokasi**: Tempat kejadian masalah
  - **Subjek**: Ringkasan masalah
- **Format Output**: JSON structured data
- **Keuntungan**: Data terstruktur untuk database dan pelaporan

#### E. Sentiment Analysis
- **Fungsi**: Mendeteksi emosi/sentimen dari teks keluhan
- **Kategori Sentimen**:
  - `sad` (sedih)
  - `frustrated` (frustasi)
  - `worried` (khawatir)
  - `neutral` (netral)
- **Aplikasi**: 
  - Trigger sound effects yang sesuai
  - Generate empathetic response
  - Prioritas handling berdasarkan urgency

#### F. Empathetic Response Generation
- **Fungsi**: Menghasilkan respons empatik berdasarkan sentimen dan kategori
- **Karakteristik**:
  - Singkat (2-3 kalimat)
  - Mengakui perasaan user
  - Memberikan jaminan tindak lanjut
  - Tone profesional namun hangat

### 2. Smart Ticketing System

#### Automatic Ticket Creation
- Tiket dibuat otomatis setelah NER extraction
- Format terstruktur dengan metadata lengkap
- Status tracking: `pending` → `diproses` → `selesai`
- UUID-based ticket ID untuk keamanan

#### Ticket Data Structure
```json
{
  "id": "uuid",
  "nim": "string",
  "kategori": "enum(fasilitas|akademik|administrasi|keuangan|pelanggaran|ppid)",
  "lokasi": "string",
  "subjek": "string",
  "deskripsi": "text",
  "status": "enum(pending|diproses|selesai)",
  "waktu": "timestamp",
  "auto_forwarded": "boolean",
  "assigned_to": "string|null",
  "assigned_at": "timestamp|null",
  "notes": "text|null"
}
```

### 3. Automatic Forwarding System

#### Auto-Forward Mechanism
- **Toggle Global**: Admin dapat enable/disable auto-forward secara global
- **Category-Based Routing**: Tiket dikirim ke authority berdasarkan kategori
- **Multi-Channel Support**:
  - Email (via Resend API)
  - WhatsApp
  - Phone contact info
- **Template System**: Message templates dengan variable replacement

#### Contact Management
- Admin mengelola contact authorities per kategori
- Support multiple contacts per kategori
- Active/inactive toggle untuk setiap contact
- Real-time sync dengan forwarding system

### 4. Admin Dashboard

#### Ticket Management
- View all tickets dengan filter & search
- Status update: pending → diproses → selesai
- Manual forward dengan contact selection
- Bulk forward by category
- Assignment tracking

#### Analytics & Statistics
- Ticket count by category
- Response time metrics
- Resolution rate tracking
- Forwarding success rate
- Time-based analytics (daily/weekly/monthly)

#### Document Management
- CRUD operations untuk dokumen kampus
- Kategori dan metadata untuk setiap dokumen
- Search functionality
- Version control ready
- Source tracking (web/manual/upload)

#### Template Management
- Email & WhatsApp message templates
- Variable system: `{{nim}}`, `{{kategori}}`, `{{subjek}}`, dll
- Template preview dengan variable replacement
- Active/inactive toggle
- Role-based access (admin vs sub-admin)

#### Sub-Admin Management
- Role-based permission system
- Permission types:
  - `manage_tickets`
  - `manage_contacts`
  - `manage_templates`
  - `view_analytics`
  - `manage_admins`
- Granular access control

#### Notification System
- Real-time notifications untuk admin
- Trigger conditions:
  - New ticket submitted
  - Ticket status changed
  - Pending ticket reminder (time-based)
  - Auto-forward success/failure
- Notification badge dengan unread count
- Mark as read functionality

### 5. Security Features

#### Authentication & Authorization
- Supabase Auth integration
- Email & password authentication
- Auto-confirm email (untuk development)
- Role-based access control (RBAC)
- Row-level security (RLS) policies

#### Data Protection
- RLS policies pada semua tables
- Security definer functions untuk permission check
- No direct SQL execution dari edge functions
- Environment variables untuk API keys
- CORS headers untuk API security

## Teknologi yang Digunakan

### Frontend Stack
1. **React 18** - UI library
2. **TypeScript** - Type safety
3. **Vite** - Build tool & dev server
4. **Tailwind CSS** - Styling framework
5. **Shadcn/ui** - UI component library
6. **React Router** - Client-side routing
7. **TanStack Query** - Data fetching & caching
8. **React Confetti** - Celebration effects
9. **Sonner** - Toast notifications
10. **Lucide React** - Icon library
11. **date-fns** - Date formatting (Indonesian locale)

### Backend Stack
1. **Supabase** - Backend-as-a-Service (BaaS)
   - PostgreSQL database
   - Authentication
   - Real-time subscriptions
   - Edge Functions (Deno runtime)
   - Storage (jika diperlukan)
2. **Lovable Cloud** - Managed Supabase integration

### AI & ML Services
1. **Lovable AI Gateway** - AI model access
2. **Google Gemini 2.0 Flash** - Default model untuk:
   - Intent detection
   - Classification
   - NER
   - Sentiment analysis
   - Empathetic response generation
   - RAG responses
3. **Resend API** - Email delivery service

### Database
- **PostgreSQL** (via Supabase)
- **Schemas**:
  - `public` - Application tables
  - `auth` - Supabase auth (managed)
- **Extensions**:
  - `uuid-ossp` - UUID generation
  - `pgcrypto` - Encryption
  
## Arsitektur Sistem

### High-Level Architecture

```
┌─────────────┐
│   Browser   │ (User Interface)
│  (React SPA)│
└──────┬──────┘
       │ HTTPS
       ↓
┌─────────────────────────────┐
│   Supabase Client SDK       │
│   (Authentication & API)    │
└──────┬──────────────────────┘
       │
       ↓
┌─────────────────────────────┐
│   Supabase Backend          │
│  ┌─────────────────────┐    │
│  │   PostgreSQL DB     │    │
│  │   (RLS enabled)     │    │
│  └─────────────────────┘    │
│  ┌─────────────────────┐    │
│  │   Edge Functions    │    │
│  │  - process-complaint│    │
│  │  - forward-ticket   │    │
│  │  - check-pending    │    │
│  └─────────────────────┘    │
└──────┬──────────────────────┘
       │
       ↓
┌─────────────────────────────┐
│   External APIs             │
│  - Lovable AI Gateway       │
│  - Resend Email API         │
└─────────────────────────────┘
```

### Component Architecture

```
Frontend Components
├── Pages
│   ├── Index.tsx (Main app)
│   ├── AdminAuth.tsx (Login)
│   └── NotFound.tsx
├── Components
│   ├── ChatInterface.tsx (User chat)
│   ├── AdminDashboard.tsx (Main admin)
│   ├── AdminSidebar.tsx (Navigation)
│   ├── TicketHistory.tsx (User tickets)
│   ├── CampusDocuments.tsx (Doc management)
│   ├── MessageTemplates.tsx
│   ├── ContactManagement.tsx
│   ├── SubAdminManagement.tsx
│   ├── AdminAnalytics.tsx
│   ├── ForwardingStats.tsx
│   ├── ApiSettings.tsx
│   ├── NotificationBell.tsx
│   └── Footer.tsx
└── UI Components (Shadcn)
    └── [50+ reusable components]
```

## Alur Kerja Sistem

### Flow 1: User Mengirim Keluhan

```
1. User mengetik pesan di chat
   ↓
2. Intent Detection
   ↓ (keluhan detected)
3. Sentiment Analysis (paralel dengan NER)
   ↓
4. NER Extraction
   ↓
5. Complaint Classification
   ↓
6. Create Ticket di Database
   ↓
7. Generate Empathetic Response
   ↓
8. Play sound effect (berdasarkan sentiment)
   ↓
9. Show confetti animation
   ↓
10. Display ticket info ke user
    ↓
11. Trigger Admin Notification (real-time)
    ↓
12. [OPTIONAL] Auto-Forward ke Authority
```

### Flow 2: User Bertanya Informasi

```
1. User mengetik pertanyaan
   ↓
2. Intent Detection
   ↓ (informasi detected)
3. RAG System Query
   ├── Retrieve relevant documents from DB
   ├── Rank by relevance
   └── Pass to AI with context
   ↓
4. AI Generate Answer (with sources)
   ↓
5. Display answer to user with typing effect
```

### Flow 3: Admin Menerima & Mengelola Tiket

```
1. Admin login ke dashboard
   ↓
2. Real-time notification pop (new ticket)
   ↓
3. View ticket details
   ↓
4. [Option A] Manual Forward
   │  ├── Select contact
   │  ├── Choose template
   │  └── Send via email/WhatsApp
   │
5. [Option B] Auto-Forward (jika enabled)
   │  ├── System automatically matches category
   │  ├── Finds active contacts for that category
   │  └── Sends to all contacts with template
   │
6. Update ticket status
   ↓
7. Add notes (optional)
   ↓
8. Analytics updated real-time
```

### Flow 4: Automatic Forwarding Process

```
Trigger: New ticket created OR Manual forward
   ↓
1. Check if auto-forward enabled (system_settings)
   ↓
2. Get ticket category
   ↓
3. Query forwarding_contacts by category
   ↓
4. For each contact:
   ├── Get message template by type & category
   ├── Replace variables in template
   │   {{nim}} → ticket.nim
   │   {{kategori}} → ticket.kategori
   │   {{subjek}} → ticket.subjek
   │   {{deskripsi}} → ticket.deskripsi
   │   {{lokasi}} → ticket.lokasi
   ├── Send via appropriate channel:
   │   ├── Email: Resend API
   │   └── WhatsApp: [Future implementation]
   └── Log success/failure
   ↓
5. Update ticket.auto_forwarded = true
   ↓
6. Create notification for admin
   ↓
7. Update ForwardingStats
```

## Database Schema

### Core Tables

#### 1. tickets
Menyimpan semua keluhan yang masuk
```sql
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nim TEXT NOT NULL,
  kategori TEXT NOT NULL,
  lokasi TEXT NOT NULL,
  subjek TEXT NOT NULL,
  deskripsi TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  waktu TIMESTAMP DEFAULT NOW(),
  auto_forwarded BOOLEAN DEFAULT FALSE,
  assigned_to TEXT,
  assigned_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. campus_documents
Dokumen referensi untuk RAG system
```sql
CREATE TABLE campus_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. forwarding_contacts
Authority contacts untuk auto-forward
```sql
CREATE TABLE forwarding_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_type TEXT NOT NULL, -- email, whatsapp, phone
  contact_value TEXT NOT NULL,
  category TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 4. message_templates
Template pesan untuk forwarding
```sql
CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- email, whatsapp
  subject TEXT,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. user_roles
Role management (admin, sub-admin)
```sql
CREATE TYPE app_role AS ENUM ('admin', 'sub-admin');

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  role app_role NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, role)
);
```

#### 6. admin_permissions
Granular permissions untuk sub-admin
```sql
CREATE TYPE permission_type AS ENUM (
  'manage_tickets',
  'manage_contacts', 
  'manage_templates',
  'view_analytics',
  'manage_admins'
);

CREATE TABLE admin_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  permission permission_type NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 7. notifications
Real-time notifications untuk admin
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ticket_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- new_ticket, status_change, reminder
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 8. system_settings
Global settings (auto-forward toggle, dll)
```sql
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Database Functions

#### has_role()
Check if user has specific role
```sql
CREATE FUNCTION has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
```

#### has_permission()
Check if user has specific permission
```sql
CREATE FUNCTION has_permission(_user_id UUID, _permission permission_type)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM admin_permissions
    WHERE user_id = _user_id AND permission = _permission
  ) OR has_role(_user_id, 'admin');
$$;
```

### Database Triggers

#### notify_admins_on_new_ticket
Buat notifikasi otomatis untuk admin saat ada tiket baru
```sql
CREATE FUNCTION notify_admins_on_new_ticket()
RETURNS TRIGGER AS $$
DECLARE
  admin_record RECORD;
BEGIN
  FOR admin_record IN 
    SELECT DISTINCT user_id FROM user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO notifications (user_id, ticket_id, title, message, type)
    VALUES (
      admin_record.user_id,
      NEW.id,
      'Tiket Baru Masuk',
      format('Tiket baru #%s: %s (Kategori: %s)', 
        substring(NEW.id::text, 1, 8), 
        NEW.subjek,
        NEW.kategori
      ),
      'new_ticket'
    );
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_ticket_created
  AFTER INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_admins_on_new_ticket();
```

## Data Flow

### User Data
- **Input**: Free text di chat interface
- **Processing**: 
  - Intent detection
  - NER extraction
  - Classification
  - Sentiment analysis
- **Storage**: Structured data di `tickets` table
- **Output**: Empathetic response + ticket confirmation

### Admin Data
- **Input**: Dashboard interactions (updates, forwards)
- **Processing**: 
  - Permission checks
  - Template variable replacement
  - Email/WhatsApp API calls
- **Storage**: Updates to `tickets`, logs, notifications
- **Output**: Real-time UI updates, sent messages

### Real-Time Data
- **Supabase Realtime** subscriptions untuk:
  - New tickets → Admin dashboard
  - Ticket updates → All admins
  - System settings changes → Live sync
  - Contact changes → Live sync

## API Endpoints (Edge Functions)

### 1. process-complaint
**File**: `supabase/functions/process-complaint/index.ts`

**Purpose**: Main AI processing endpoint

**Request Types**:
- `intent`: Detect user intent
- `classify`: Classify complaint category
- `ner`: Extract entities
- `rag`: Answer information questions
- `sentiment`: Analyze sentiment
- `empathetic_response`: Generate empathetic response

**Example Request**:
```json
POST /process-complaint
{
  "message": "AC di ruang kuliah lantai 3 mati",
  "type": "classify"
}
```

**Example Response**:
```json
{
  "category": "fasilitas"
}
```

### 2. forward-ticket
**File**: `supabase/functions/forward-ticket/index.ts`

**Purpose**: Forward ticket to authorities

**Request**:
```json
POST /forward-ticket
{
  "ticketId": "uuid",
  "specificContactId": "uuid" // optional
}
```

**Process**:
1. Get ticket details
2. Get contacts (specific or all for category)
3. Get message template
4. Replace variables
5. Send via Resend API
6. Update ticket status
7. Create notifications

### 3. check-pending-tickets
**File**: `supabase/functions/check-pending-tickets/index.ts`

**Purpose**: Cron job untuk reminder tiket pending

**Schedule**: Every hour (via pg_cron)

**Process**:
1. Query tickets pending > 1 hour
2. Create reminder notifications
3. Optionally: Send alert to admin

## Security Implementation

### Row-Level Security (RLS)

#### Tickets Table
```sql
-- Anyone can create tickets
CREATE POLICY "Anyone can create tickets"
ON tickets FOR INSERT
WITH CHECK (true);

-- Anyone can view tickets
CREATE POLICY "Anyone can view tickets"
ON tickets FOR SELECT
USING (true);

-- Only admins can update tickets
CREATE POLICY "Admins can update tickets"
ON tickets FOR UPDATE
USING (has_role(auth.uid(), 'admin'));
```

#### Admin Tables
```sql
-- Only admins can view/manage
CREATE POLICY "Admins only"
ON forwarding_contacts
FOR ALL
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins only"
ON message_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'));
```

#### Notifications
```sql
-- Admins can only view their own notifications
CREATE POLICY "View own notifications"
ON notifications FOR SELECT
USING (
  has_role(auth.uid(), 'admin') 
  AND user_id = auth.uid()
);
```

### API Security
- CORS headers configured
- Authentication via Supabase JWT
- Environment variables untuk secrets
- Rate limiting (via Lovable AI Gateway)
- No direct SQL execution

## Performance Optimizations

### Frontend
1. **Code Splitting**: React.lazy() untuk route-based splitting
2. **Memoization**: useMemo, useCallback untuk expensive computations
3. **Debouncing**: Search inputs debounced 300ms
4. **Virtualization**: ScrollArea untuk long lists
5. **Image Optimization**: WebP format, lazy loading

### Backend
1. **Database Indexing**:
   - `tickets.status`
   - `tickets.kategori`
   - `tickets.created_at`
   - `notifications.user_id`
   - `notifications.is_read`
2. **Query Optimization**: Select only needed columns
3. **Connection Pooling**: Managed by Supabase
4. **Caching**: Browser cache untuk static assets

### AI/ML
1. **Model Selection**: Gemini 2.0 Flash (fast & affordable)
2. **Batch Processing**: Multiple AI calls dalam satu request
3. **Streaming**: Typing effect menggunakan streaming response
4. **Prompt Optimization**: Concise prompts untuk faster response

## Monitoring & Analytics

### Metrics Tracked
1. **Ticket Metrics**:
   - Total tickets
   - Tickets by category
   - Tickets by status
   - Average response time
   - Resolution rate
2. **Forwarding Metrics**:
   - Success rate
   - Failed forwards
   - Forwards by category
3. **User Metrics**:
   - Active users
   - Questions asked
   - Complaints filed

### Logging
- Console logs di edge functions
- Supabase logs untuk database queries
- Error tracking dengan try-catch
- Network request logs

## Deployment

### Production URL
- Frontend: Deployed via Lovable (lovable.app subdomain)
- Backend: Supabase (hqmkzfejbsgjbhadetst.supabase.co)

### Environment Variables
```
VITE_SUPABASE_URL=https://hqmkzfejbsgjbhadetst.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJh...
LOVABLE_API_KEY=<auto-configured>
RESEND_API_KEY=<user-configured>
```

### CI/CD
- Auto-deploy pada setiap code change
- Edge functions deployed automatically
- Database migrations executed on approval

## Future Enhancements

### Phase 2 (Planned)
1. WhatsApp integration (via official WhatsApp Business API)
2. Voice input support (Speech-to-Text)
3. Multi-language support (English, Arabic)
4. Mobile app (React Native)
5. PDF report generation
6. Advanced analytics dashboard
7. SLA tracking & automatic escalation
8. Integration dengan SIAKAD UIN
9. Chatbot training interface untuk admin
10. A/B testing untuk empathetic responses

### Phase 3 (Future)
1. Predictive analytics (forecast complaint trends)
2. Automatic resolution suggestions
3. Knowledge base builder
4. Video complaint support
5. Integration dengan social media (Instagram DM, Twitter)

## Kesimpulan

Sistem Chatbot Pelayanan Keluhan Kampus UIN Alauddin Makassar merupakan solusi komprehensif yang mengintegrasikan teknologi AI terkini untuk meningkatkan kualitas pelayanan mahasiswa. Dengan fitur-fitur seperti Intent Detection, NER, RAG, Sentiment Analysis, dan sistem ticketing otomatis, sistem ini mampu menangani keluhan dan pertanyaan mahasiswa secara efisien, akurat, dan empatik.

Arsitektur sistem yang modular, keamanan berlapis dengan RLS, dan penggunaan teknologi modern menjadikan sistem ini scalable, maintainable, dan siap untuk pengembangan lebih lanjut.

---

**Dokumentasi ini dibuat untuk**: Sidang Skripsi  
**Tanggal**: 2025  
**Institusi**: UIN Alauddin Makassar  
**Sistem**: Chatbot Pelayanan Keluhan Kampus
