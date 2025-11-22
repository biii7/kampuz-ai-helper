# Arsitektur Sistem - Chatbot Pelayanan Keluhan Kampus

## 1. Overview Arsitektur

Sistem ini menggunakan arsitektur **Client-Server dengan AI-Powered Backend**, yang terdiri dari tiga layer utama:

1. **Presentation Layer** (Frontend - React SPA)
2. **Application Layer** (Backend - Supabase + Edge Functions)
3. **Data Layer** (PostgreSQL Database)

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                        │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   User Web   │  │  Admin Web   │  │   Mobile     │          │
│  │  Interface   │  │  Dashboard   │  │  (Future)    │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                   │
│         └──────────────────┴──────────────────┘                  │
│                           │                                       │
│                    React Application                              │
│                    (Vite + TypeScript)                            │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTPS / WebSocket
                            │
┌───────────────────────────┴─────────────────────────────────────┐
│                      APPLICATION LAYER                           │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              Supabase Client SDK                          │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐        │  │
│  │  │    Auth    │  │  Realtime  │  │  Storage   │        │  │
│  │  └────────────┘  └────────────┘  └────────────┘        │  │
│  └──────────────────────────────────────────────────────────┘  │
│                            │                                     │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │              Supabase Edge Functions (Deno)               │ │
│  │                                                             │ │
│  │  ┌──────────────────┐  ┌──────────────────┐              │ │
│  │  │ process-complaint│  │  forward-ticket  │              │ │
│  │  │  - intent        │  │  - email send    │              │ │
│  │  │  - classify      │  │  - whatsapp      │              │ │
│  │  │  - ner           │  │  - logging       │              │ │
│  │  │  - sentiment     │  │                  │              │ │
│  │  │  - rag           │  │                  │              │ │
│  │  │  - empathy       │  │                  │              │ │
│  │  └──────────────────┘  └──────────────────┘              │ │
│  │                                                             │ │
│  │  ┌──────────────────┐                                     │ │
│  │  │check-pending-tkt │                                     │ │
│  │  │  - cron job      │                                     │ │
│  │  │  - reminders     │                                     │ │
│  │  └──────────────────┘                                     │ │
│  └───────────────────────────────────────────────────────────┘ │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
            ┌────────────────┴────────────────┐
            │                                  │
            ↓                                  ↓
┌───────────────────────┐        ┌────────────────────────┐
│   External AI API     │        │   External Services    │
│                       │        │                        │
│  Lovable AI Gateway   │        │  - Resend Email API    │
│  - Gemini 2.0 Flash   │        │  - WhatsApp API        │
│  - GPT-5              │        │  - SMS Gateway         │
│  - Image Gen          │        │                        │
└───────────────────────┘        └────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          DATA LAYER                              │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                PostgreSQL Database                        │  │
│  │                                                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │  │
│  │  │ tickets  │  │ campus_  │  │ forward_ │  │  user_  │ │  │
│  │  │          │  │documents │  │ contacts │  │  roles  │ │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │  │
│  │                                                            │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │  │
│  │  │ message_ │  │ admin_   │  │ notific_ │  │ system_ │ │  │
│  │  │templates │  │permissions│  │ ations  │  │settings │ │  │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │  │
│  │                                                            │  │
│  │  ┌──────────────────────────────────────────────────┐   │  │
│  │  │  Row-Level Security (RLS) Policies               │   │  │
│  │  │  - Role-based access control                     │   │  │
│  │  │  - User isolation                                 │   │  │
│  │  └──────────────────────────────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Component Architecture

### 2.1 Frontend Architecture

```
src/
├── pages/                    # Route-level components
│   ├── Index.tsx            # Main app (hero, chat, tickets, admin)
│   ├── AdminAuth.tsx        # Admin login
│   └── NotFound.tsx         # 404 page
│
├── components/              # Feature components
│   ├── ChatInterface.tsx           # User chatbot UI
│   ├── TicketHistory.tsx           # User ticket list
│   ├── AdminDashboard.tsx          # Main admin container
│   ├── AdminSidebar.tsx            # Admin navigation
│   ├── CampusDocuments.tsx         # Document CRUD
│   ├── MessageTemplates.tsx        # Template management
│   ├── ContactManagement.tsx       # Contact CRUD
│   ├── SubAdminManagement.tsx      # Role & permissions
│   ├── AdminAnalytics.tsx          # Charts & metrics
│   ├── ForwardingStats.tsx         # Forwarding metrics
│   ├── ApiSettings.tsx             # API key config
│   ├── NotificationBell.tsx        # Real-time notifications
│   ├── TicketDisplay.tsx           # Ticket card display
│   ├── NavLink.tsx                 # Active route highlight
│   └── Footer.tsx                  # Site footer
│
├── components/ui/           # Shadcn/ui components (50+ files)
│   ├── button.tsx
│   ├── input.tsx
│   ├── dialog.tsx
│   ├── sidebar.tsx
│   └── ... (accordion, alert, badge, card, etc.)
│
├── integrations/supabase/   # Supabase integration
│   ├── client.ts            # Supabase client instance
│   └── types.ts             # Auto-generated DB types
│
├── hooks/                   # Custom React hooks
│   ├── use-mobile.tsx       # Responsive detection
│   └── use-toast.ts         # Toast notifications
│
├── lib/                     # Utilities
│   └── utils.ts             # Helper functions (cn, etc.)
│
├── utils/                   # App-specific utilities
│   └── soundEffects.ts      # Sound effect triggers
│
├── App.tsx                  # Root component
├── main.tsx                 # React entry point
└── index.css                # Global styles + design system
```

### 2.2 Backend Architecture

```
supabase/
├── functions/                        # Edge Functions (Deno)
│   ├── process-complaint/
│   │   └── index.ts                 # AI processing endpoint
│   │       ├── intent detection
│   │       ├── classification
│   │       ├── NER extraction
│   │       ├── sentiment analysis
│   │       ├── RAG (information)
│   │       └── empathetic response
│   │
│   ├── forward-ticket/
│   │   └── index.ts                 # Ticket forwarding
│   │       ├── template variable replacement
│   │       ├── email sending (Resend)
│   │       ├── WhatsApp (future)
│   │       └── notification creation
│   │
│   └── check-pending-tickets/
│       └── index.ts                 # Cron job for reminders
│           └── pending ticket alerts
│
├── migrations/                       # Database migrations
│   └── (auto-generated SQL files)
│
└── config.toml                      # Supabase config
    ├── project_id
    ├── [auth] settings
    └── [functions] definitions
```

## 3. Data Flow Architecture

### 3.1 User Complaint Submission Flow

```
┌─────────┐
│  User   │
└────┬────┘
     │ 1. Types complaint
     ↓
┌────────────────┐
│ ChatInterface  │
└────┬───────────┘
     │ 2. Submit message
     ↓
┌─────────────────────────────┐
│ supabase.functions.invoke   │
│ ('process-complaint')       │
└────┬────────────────────────┘
     │ 3. Edge Function
     ↓
┌──────────────────────────────────────┐
│  INTENT DETECTION                    │
│  AI: "keluhan" or "informasi"?       │
└────┬─────────────────────────────────┘
     │
     ├─── [informasi] ────┐
     │                     ↓
     │            ┌────────────────┐
     │            │  RAG SYSTEM    │
     │            │  - Query docs  │
     │            │  - AI answer   │
     │            └───┬────────────┘
     │                │
     │                ↓
     │            [Return answer]
     │
     └─── [keluhan] ────┐
                         ↓
              ┌────────────────────┐
              │  PARALLEL AI CALLS │
              │                    │
              │  ┌──────────────┐ │
              │  │ SENTIMENT    │ │
              │  │ ANALYSIS     │ │
              │  └──────────────┘ │
              │                    │
              │  ┌──────────────┐ │
              │  │ NER          │ │
              │  │ EXTRACTION   │ │
              │  └──────────────┘ │
              │                    │
              │  ┌──────────────┐ │
              │  │ COMPLAINT    │ │
              │  │ CLASSIFICATION│ │
              │  └──────────────┘ │
              └────┬───────────────┘
                   │ 4. Combine results
                   ↓
              ┌────────────────────┐
              │  CREATE TICKET     │
              │  in Database       │
              └────┬───────────────┘
                   │ 5. Trigger
                   ↓
              ┌────────────────────┐
              │  DATABASE TRIGGER  │
              │  notify_admins()   │
              └────┬───────────────┘
                   │
                   ├─────────────────┐
                   │                 │
                   ↓                 ↓
         ┌───────────────┐   ┌──────────────┐
         │ NOTIFICATION  │   │ REALTIME     │
         │ INSERT        │   │ BROADCAST    │
         └───────────────┘   └──┬───────────┘
                                │
                                ↓
                         ┌──────────────┐
                         │ Admin sees   │
                         │ notification │
                         └──────────────┘
```

### 3.2 Auto-Forward Flow

```
┌──────────────────┐
│ New Ticket       │
│ or Manual Fwd    │
└────┬─────────────┘
     │
     ↓
┌──────────────────────────────┐
│ Check auto_forward_enabled   │
│ (system_settings table)      │
└────┬─────────────────────────┘
     │
     ├── [disabled] → Manual Forward UI
     │
     └── [enabled] ──┐
                     ↓
              ┌──────────────────┐
              │ Get ticket       │
              │ category         │
              └────┬─────────────┘
                   │
                   ↓
              ┌──────────────────────┐
              │ Query contacts       │
              │ WHERE                │
              │  category = :cat     │
              │  AND is_active=true  │
              └────┬─────────────────┘
                   │
                   ↓ (for each contact)
              ┌──────────────────────┐
              │ Get template         │
              │ WHERE type = contact │
              │  AND category = :cat │
              └────┬─────────────────┘
                   │
                   ↓
              ┌──────────────────────┐
              │ Replace variables    │
              │  {{nim}}             │
              │  {{kategori}}        │
              │  {{subjek}}          │
              │  {{deskripsi}}       │
              │  {{lokasi}}          │
              └────┬─────────────────┘
                   │
                   ↓
              ┌──────────────────────┐
              │ Send message         │
              │  - Email: Resend API │
              │  - WhatsApp: Future  │
              └────┬─────────────────┘
                   │
                   ├── [success] ──┐
                   │                │
                   └── [error] ────┤
                                   │
                                   ↓
                          ┌─────────────────┐
                          │ Update ticket   │
                          │ auto_forwarded  │
                          │ = true          │
                          └────┬────────────┘
                               │
                               ↓
                          ┌─────────────────┐
                          │ Create admin    │
                          │ notification    │
                          └────┬────────────┘
                               │
                               ↓
                          ┌─────────────────┐
                          │ Update stats    │
                          │ (ForwardingStats)│
                          └─────────────────┘
```

### 3.3 Real-Time Notification Flow

```
┌─────────────────┐
│ Database Event  │
│ (INSERT/UPDATE) │
└────┬────────────┘
     │
     ↓
┌─────────────────────────────┐
│ PostgreSQL Trigger          │
│ - on_ticket_created         │
│ - on_ticket_updated         │
└────┬────────────────────────┘
     │
     ↓
┌─────────────────────────────┐
│ INSERT INTO notifications   │
│ VALUES (...)                │
└────┬────────────────────────┘
     │
     ↓
┌─────────────────────────────┐
│ Supabase Realtime           │
│ Publication                 │
└────┬────────────────────────┘
     │
     ↓
┌─────────────────────────────┐
│ supabase.channel()          │
│ .on('postgres_changes')     │
│ .subscribe()                │
└────┬────────────────────────┘
     │
     ↓
┌─────────────────────────────┐
│ React Component             │
│ (NotificationBell)          │
│ - Update unread count       │
│ - Show toast                │
│ - Play sound (optional)     │
└─────────────────────────────┘
```

## 4. Security Architecture

### 4.1 Authentication Flow

```
┌────────────┐
│   User     │
└─────┬──────┘
      │ 1. Email/Password
      ↓
┌──────────────────────┐
│ Supabase Auth        │
│ - Email verification │
│ - JWT token          │
└─────┬────────────────┘
      │ 2. JWT
      ↓
┌──────────────────────┐
│ Client stores JWT    │
│ (localStorage)       │
└─────┬────────────────┘
      │ 3. Include in headers
      ↓
┌──────────────────────┐
│ API Request          │
│ Authorization:       │
│  Bearer <JWT>        │
└─────┬────────────────┘
      │ 4. Verify
      ↓
┌──────────────────────┐
│ Supabase validates   │
│ - Token signature    │
│ - Expiration         │
│ - User exists        │
└─────┬────────────────┘
      │ 5. auth.uid()
      ↓
┌──────────────────────┐
│ RLS Policy           │
│ has_role(auth.uid(), │
│   'admin')           │
└──────────────────────┘
```

### 4.2 Row-Level Security Architecture

```sql
-- SECURITY PATTERN 1: Role-Based Access
-- Tables: forwarding_contacts, message_templates, system_settings

User Request
     ↓
[Check JWT]
     ↓
[Extract user_id from JWT]
     ↓
[RLS Policy: has_role(auth.uid(), 'admin')]
     ↓
[Query user_roles table]
     ↓
┌─ [user has 'admin' role?] ──┐
│                              │
YES → Grant Access        NO → Deny
│                              │
↓                              ↓
Return Data               Return Empty/Error


-- SECURITY PATTERN 2: User Isolation
-- Tables: notifications

User Request
     ↓
[Check JWT]
     ↓
[Extract user_id from JWT]
     ↓
[RLS Policy: user_id = auth.uid()]
     ↓
[Filter: WHERE user_id = auth.uid()]
     ↓
Return only user's own data


-- SECURITY PATTERN 3: Public Read
-- Tables: tickets, campus_documents

User Request
     ↓
[RLS Policy: true]
     ↓
Return all data (no restriction)
```

### 4.3 Permission System Architecture

```
┌──────────────────────────────────────────────────┐
│            PERMISSION HIERARCHY                   │
│                                                   │
│  ┌──────────────┐                                │
│  │    ADMIN     │  (Full Access)                 │
│  │  (user_roles)│                                │
│  └──────┬───────┘                                │
│         │                                         │
│         │ has ALL permissions by default         │
│         │                                         │
│         ↓                                         │
│  ┌──────────────────────────────────────┐       │
│  │  - manage_tickets                     │       │
│  │  - manage_contacts                    │       │
│  │  - manage_templates                   │       │
│  │  - view_analytics                     │       │
│  │  - manage_admins                      │       │
│  └──────────────────────────────────────┘       │
│                                                   │
│  ┌──────────────┐                                │
│  │  SUB-ADMIN   │  (Limited Access)              │
│  │  (user_roles)│                                │
│  └──────┬───────┘                                │
│         │                                         │
│         │ has ONLY granted permissions           │
│         │                                         │
│         ↓                                         │
│  ┌──────────────────────────────────────┐       │
│  │  admin_permissions table             │       │
│  │  ┌────────────────────────────────┐ │       │
│  │  │ user_id | permission           │ │       │
│  │  ├────────────────────────────────┤ │       │
│  │  │ uuid-1  | manage_templates     │ │       │
│  │  │ uuid-1  | view_analytics       │ │       │
│  │  └────────────────────────────────┘ │       │
│  └──────────────────────────────────────┘       │
│                                                   │
└──────────────────────────────────────────────────┘

Permission Check Function:

has_permission(user_id, permission) {
  // First check: Is user an admin?
  if (has_role(user_id, 'admin')) {
    return true;  // Admins have all permissions
  }
  
  // Second check: Does user have specific permission?
  return EXISTS (
    SELECT 1 FROM admin_permissions
    WHERE user_id = :user_id
    AND permission = :permission
  );
}
```

## 5. AI Processing Architecture

### 5.1 AI Pipeline

```
User Input: "AC di ruang kuliah lantai 3 mati"
     │
     ↓
┌────────────────────────────────────────┐
│  STEP 1: INTENT DETECTION              │
│                                         │
│  Prompt: "Klasifikasikan apakah ini    │
│           keluhan atau informasi"      │
│                                         │
│  Model: google/gemini-2.5-flash        │
│                                         │
│  Output: "keluhan"                     │
└────┬───────────────────────────────────┘
     │
     ↓
┌────────────────────────────────────────┐
│  STEP 2: PARALLEL PROCESSING           │
│                                         │
│  ┌──────────────────────────────────┐ │
│  │  2A. SENTIMENT ANALYSIS          │ │
│  │  Prompt: "Deteksi sentimen"      │ │
│  │  Output: "frustrated"            │ │
│  └──────────────────────────────────┘ │
│                                         │
│  ┌──────────────────────────────────┐ │
│  │  2B. NER EXTRACTION              │ │
│  │  Prompt: "Ekstrak NIM, lokasi,   │ │
│  │           subjek"                │ │
│  │  Output: {                        │ │
│  │    "nim": "60200121001",         │ │
│  │    "lokasi": "Ruang kuliah lt 3",│ │
│  │    "subjek": "AC mati"           │ │
│  │  }                                │ │
│  └──────────────────────────────────┘ │
│                                         │
│  ┌──────────────────────────────────┐ │
│  │  2C. CLASSIFICATION              │ │
│  │  Prompt: "Klasifikasi ke salah   │ │
│  │           satu dari 6 kategori"  │ │
│  │  Output: "fasilitas"             │ │
│  └──────────────────────────────────┘ │
└────┬───────────────────────────────────┘
     │
     ↓
┌────────────────────────────────────────┐
│  STEP 3: COMBINE RESULTS               │
│                                         │
│  ticketData = {                        │
│    nim: "60200121001",                 │
│    kategori: "fasilitas",              │
│    lokasi: "Ruang kuliah lt 3",        │
│    subjek: "AC mati",                  │
│    deskripsi: "AC di ruang...",        │
│    sentiment: "frustrated"             │
│  }                                      │
└────┬───────────────────────────────────┘
     │
     ↓
┌────────────────────────────────────────┐
│  STEP 4: CREATE TICKET IN DB           │
│                                         │
│  INSERT INTO tickets (...)             │
│  VALUES (...)                          │
└────┬───────────────────────────────────┘
     │
     ↓
┌────────────────────────────────────────┐
│  STEP 5: EMPATHETIC RESPONSE           │
│                                         │
│  Prompt: "Generate empathetic response │
│           considering sentiment and    │
│           category"                    │
│                                         │
│  Input: {                               │
│    sentiment: "frustrated",            │
│    kategori: "fasilitas"               │
│  }                                      │
│                                         │
│  Output: "Kami memahami bahwa AC yang  │
│           mati pasti sangat mengganggu │
│           kenyamanan belajar. Keluhan  │
│           Anda sudah kami terima..."   │
└────┬───────────────────────────────────┘
     │
     ↓
┌────────────────────────────────────────┐
│  STEP 6: SOUND EFFECT                  │
│                                         │
│  if (sentiment === 'frustrated') {     │
│    playSound('frustrated.mp3')         │
│  }                                      │
└────┬───────────────────────────────────┘
     │
     ↓
[Display to User]
```

### 5.2 RAG (Retrieval-Augmented Generation) Architecture

```
User Query: "Siapa rektor UIN Alauddin?"
     │
     ↓
┌────────────────────────────────────────┐
│  STEP 1: QUERY CAMPUS DOCUMENTS        │
│                                         │
│  SELECT * FROM campus_documents        │
│  WHERE                                  │
│    title ILIKE '%rektor%' OR           │
│    content ILIKE '%rektor%'            │
│  LIMIT 5                                │
│                                         │
│  Results:                               │
│  - Profil UIN Alauddin                 │
│  - Sejarah Perkembangan                │
│  - Pimpinan UIN                        │
└────┬───────────────────────────────────┘
     │
     ↓
┌────────────────────────────────────────┐
│  STEP 2: RANK BY RELEVANCE             │
│                                         │
│  (Simple keyword matching)             │
│  - Count occurrences of query terms    │
│  - Prioritize exact matches            │
│  - Title matches > Content matches     │
│                                         │
│  Top Document:                          │
│  "PIMPINAN UIN ALAUDDIN MAKASSAR"      │
│  "Prof. Drs. Hamdan Juhannis..."       │
└────┬───────────────────────────────────┘
     │
     ↓
┌────────────────────────────────────────┐
│  STEP 3: CONSTRUCT AI PROMPT           │
│                                         │
│  System: "Kamu adalah asisten AI UIN   │
│           Alauddin. Jawab pertanyaan   │
│           berdasarkan dokumen."        │
│                                         │
│  Context: [Top 3 documents content]    │
│                                         │
│  User Question: "Siapa rektor UIN?"    │
└────┬───────────────────────────────────┘
     │
     ↓
┌────────────────────────────────────────┐
│  STEP 4: AI GENERATION                 │
│                                         │
│  Model: google/gemini-2.5-flash        │
│                                         │
│  Output: "Rektor UIN Alauddin Makassar │
│           periode 2023-2027 adalah     │
│           Prof. Drs. Hamdan Juhannis   │
│           M.A, Ph.D."                  │
└────┬───────────────────────────────────┘
     │
     ↓
[Display to User with typing effect]
```

## 6. Scalability Architecture

### 6.1 Horizontal Scaling

```
┌──────────────────────────────────────────────────┐
│            LOAD BALANCER                          │
│         (Managed by Lovable/Supabase)            │
└────┬──────────────┬──────────────┬───────────────┘
     │              │              │
     ↓              ↓              ↓
┌─────────┐   ┌─────────┐   ┌─────────┐
│  Web    │   │  Web    │   │  Web    │
│ Server  │   │ Server  │   │ Server  │
│  (CDN)  │   │  (CDN)  │   │  (CDN)  │
└─────────┘   └─────────┘   └─────────┘
     │              │              │
     └──────────────┴──────────────┘
                    │
                    ↓
     ┌──────────────────────────────┐
     │   Supabase Backend           │
     │   (Auto-scaling)             │
     └──────────────────────────────┘
                    │
     ┌──────────────┴──────────────┐
     │                              │
     ↓                              ↓
┌──────────┐              ┌───────────────┐
│ Database │              │ Edge Functions│
│ (Primary)│              │   (Multiple   │
│          │              │   instances)  │
│ ┌──────┐ │              └───────────────┘
│ │Read  │ │
│ │Replicas│
│ └──────┘ │
└──────────┘
```

### 6.2 Caching Strategy

```
┌────────────────────────────────────┐
│   BROWSER CACHE                     │
│   - Static assets (24h)            │
│   - JS/CSS bundles (immutable)     │
└────────────────────────────────────┘
                │
                ↓
┌────────────────────────────────────┐
│   CDN CACHE (Lovable)              │
│   - HTML pages                      │
│   - Images                          │
│   - Fonts                           │
└────────────────────────────────────┘
                │
                ↓
┌────────────────────────────────────┐
│   APPLICATION CACHE                │
│   - React Query (5 min)            │
│   - Supabase Realtime              │
│   - LocalStorage (auth token)      │
└────────────────────────────────────┘
                │
                ↓
┌────────────────────────────────────┐
│   DATABASE QUERY CACHE             │
│   - PostgreSQL query cache         │
│   - Connection pooling             │
└────────────────────────────────────┘
```

## 7. Deployment Architecture

```
┌───────────────────────────────────────────────────┐
│              PRODUCTION ENVIRONMENT                │
│                                                    │
│  ┌────────────────────────────────────────────┐  │
│  │         Lovable Platform                    │  │
│  │  ┌──────────────────────────────────────┐  │  │
│  │  │  Static Site (React Build)           │  │  │
│  │  │  - yourapp.lovable.app               │  │  │
│  │  │  - Auto-deploy on commit             │  │  │
│  │  └──────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────┘  │
│                                                    │
│  ┌────────────────────────────────────────────┐  │
│  │         Supabase Cloud                      │  │
│  │  ┌──────────────────────────────────────┐  │  │
│  │  │  Database (PostgreSQL)               │  │  │
│  │  │  - hqmkzfejbsgjbhadetst.supabase.co │  │  │
│  │  │  - Auto-scaling                      │  │  │
│  │  │  - Daily backups                     │  │  │
│  │  └──────────────────────────────────────┘  │  │
│  │                                              │  │
│  │  ┌──────────────────────────────────────┐  │  │
│  │  │  Edge Functions (Deno)               │  │  │
│  │  │  - Auto-deploy on commit             │  │  │
│  │  │  - Cold start optimization           │  │  │
│  │  └──────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────┘  │
│                                                    │
│  ┌────────────────────────────────────────────┐  │
│  │         External Services                   │  │
│  │  - Resend API (email)                      │  │
│  │  - Lovable AI Gateway                      │  │
│  └────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────┘
```

---

**Dokumentasi Arsitektur Sistem**  
**Sistem**: Chatbot Pelayanan Keluhan Kampus  
**Institusi**: UIN Alauddin Makassar
