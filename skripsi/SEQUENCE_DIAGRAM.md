# Sequence Diagram
## Interaksi Detail Antar Komponen Sistem

---

## 1. Sequence Diagram: Submit Keluhan dengan Auto-Forward

```mermaid
sequenceDiagram
    autonumber
    
    participant U as 👤 User
    participant CI as 💬 ChatInterface
    participant PC as ⚙️ process-complaint
    participant AI as 🤖 AI Gateway
    participant DB as 🗄️ Database
    participant FT as 📤 forward-ticket
    participant FN as 📱 Fonnte API
    participant RS as 📧 Resend API
    participant AD as 👨‍💼 Admin
    
    Note over U,AD: Fase 1: User Input & AI Processing
    
    U->>CI: Ketik pesan keluhan
    CI->>PC: POST /process-complaint (type: intent)
    PC->>AI: Classify intent
    AI-->>PC: "keluhan"
    PC-->>CI: intent: keluhan
    
    CI->>PC: POST /process-complaint (type: classify)
    PC->>AI: Categorize complaint
    AI-->>PC: kategori: "fasilitas"
    PC-->>CI: kategori: fasilitas
    
    CI->>PC: POST /process-complaint (type: ner)
    PC->>AI: Extract entities
    AI-->>PC: {nim, lokasi, subjek}
    PC-->>CI: entities
    
    CI->>PC: POST /process-complaint (type: sentiment)
    PC->>AI: Analyze sentiment
    AI-->>PC: sentiment: "frustrated"
    PC-->>CI: sentiment
    
    CI->>PC: POST /process-complaint (type: empathetic_response)
    PC->>AI: Generate response
    AI-->>PC: empathetic message
    PC-->>CI: response
    
    Note over U,AD: Fase 2: Save Ticket
    
    CI->>DB: INSERT tickets
    DB-->>CI: ticket_id
    CI-->>U: Tampilkan konfirmasi + 🎉
    
    Note over U,AD: Fase 3: Auto-Forward (if enabled)
    
    CI->>DB: SELECT auto_forward_enabled
    DB-->>CI: true
    
    CI->>FT: POST /forward-ticket
    FT->>DB: SELECT contacts WHERE category = 'fasilitas'
    DB-->>FT: [contact1, contact2]
    
    par Send WhatsApp
        FT->>FN: POST /send (WhatsApp)
        FN-->>FT: {status: "success"}
    and Send Email
        FT->>RS: POST /emails
        RS-->>FT: {id: "email_id"}
    end
    
    FT->>DB: INSERT forwarding_logs
    FT->>DB: UPDATE tickets SET auto_forwarded = true
    FT-->>CI: forwarding complete
    
    Note over U,AD: Fase 4: Admin Notification
    
    DB->>AD: Realtime: new forwarding_log
    AD->>AD: 🔔 Toast notification
```

---

## 2. Sequence Diagram: RAG Information Retrieval

```mermaid
sequenceDiagram
    autonumber
    
    participant U as 👤 User
    participant CI as 💬 ChatInterface
    participant PC as ⚙️ process-complaint
    participant AI as 🤖 AI Gateway
    participant RC as 📦 RAG Cache
    participant DC as 📚 Documents
    
    Note over U,DC: Fase 1: Intent Detection
    
    U->>CI: "Bagaimana cara daftar ulang?"
    CI->>PC: POST /process-complaint (type: intent)
    PC->>AI: Classify intent
    AI-->>PC: "informasi"
    PC-->>CI: intent: informasi
    
    Note over U,DC: Fase 2: Check Cache
    
    CI->>PC: POST /process-complaint (type: rag)
    PC->>RC: SELECT * FROM rag_cache WHERE question ILIKE '%daftar ulang%'
    
    alt Cache Hit
        RC-->>PC: cached_answer
        PC->>RC: UPDATE access_count + 1
        PC-->>CI: answer from cache
        CI-->>U: Tampilkan jawaban
    else Cache Miss
        RC-->>PC: null
        
        Note over U,DC: Fase 3: Semantic Search
        
        PC->>AI: Generate embedding for question
        AI-->>PC: embedding vector [1536 dims]
        
        PC->>DC: RPC match_documents(embedding, 0.7, 5)
        DC-->>PC: [doc1, doc2, doc3]
        
        Note over U,DC: Fase 4: Generate Answer
        
        PC->>AI: Generate answer with context
        Note over PC,AI: Context includes:<br/>- Retrieved documents<br/>- User question<br/>- System prompt
        AI-->>PC: Generated answer
        
        Note over U,DC: Fase 5: Cache & Return
        
        PC->>RC: INSERT rag_cache (question, answer)
        PC-->>CI: answer
        CI-->>U: Tampilkan jawaban
    end
```

---

## 3. Sequence Diagram: Manual Forward by Admin

```mermaid
sequenceDiagram
    autonumber
    
    participant AD as 👨‍💼 Admin
    participant UI as 🖥️ Dashboard
    participant DB as 🗄️ Database
    participant FT as 📤 forward-ticket
    participant FN as 📱 Fonnte
    participant RS as 📧 Resend
    
    Note over AD,RS: Fase 1: View Ticket
    
    AD->>UI: Open Dashboard
    UI->>DB: SELECT * FROM tickets WHERE status = 'pending'
    DB-->>UI: [tickets list]
    UI-->>AD: Display tickets
    
    AD->>UI: Click ticket row
    UI->>UI: Open TicketDetailDialog
    
    Note over AD,RS: Fase 2: Check Forward Button
    
    UI->>DB: SELECT setting_value FROM system_settings WHERE setting_key = 'auto_forward_enabled'
    DB-->>UI: "false"
    UI->>UI: Show "Kirim" button (auto-forward OFF)
    
    Note over AD,RS: Fase 3: Trigger Forward
    
    AD->>UI: Click "Kirim" button
    UI->>DB: SELECT * FROM forwarding_contacts WHERE category = ticket.kategori AND is_active = true
    DB-->>UI: [contact1, contact2]
    
    alt Has Contacts
        UI->>FT: POST /forward-ticket (ticket_id)
        
        FT->>DB: Get ticket details
        DB-->>FT: ticket data
        
        FT->>DB: Get message template
        DB-->>FT: template
        
        par WhatsApp Contacts
            FT->>FN: Send to each WA contact
            FN-->>FT: Response
        and Email Contacts
            FT->>RS: Send to each email contact
            RS-->>FT: Response
        end
        
        FT->>DB: INSERT forwarding_logs (for each contact)
        FT->>DB: UPDATE tickets SET status = 'forwarded'
        FT-->>UI: Success
        UI-->>AD: ✅ Toast: "Berhasil dikirim"
        
    else No Contacts
        UI-->>AD: ⚠️ Toast: "Tidak ada kontak untuk kategori ini"
    end
```

---

## 4. Sequence Diagram: Document Upload & Embedding

```mermaid
sequenceDiagram
    autonumber
    
    participant AD as 👨‍💼 Admin
    participant UI as 🖥️ CampusDocuments
    participant PP as 📄 parse-pdf-document
    participant GE as 🧮 generate-embeddings
    participant AI as 🤖 AI Gateway
    participant DB as 🗄️ Database
    
    Note over AD,DB: Fase 1: Upload PDF
    
    AD->>UI: Select PDF file
    AD->>UI: Enter document title
    AD->>UI: Click "Upload"
    
    UI->>PP: POST /parse-pdf-document (file)
    PP->>PP: Extract text from PDF
    PP-->>UI: {content: "extracted text..."}
    
    Note over AD,DB: Fase 2: Save Document
    
    UI->>DB: INSERT campus_documents (title, content, file_url)
    DB-->>UI: document_id
    
    Note over AD,DB: Fase 3: Generate Embedding
    
    UI->>GE: POST /generate-embeddings (document_id)
    GE->>DB: SELECT content FROM campus_documents WHERE id = document_id
    DB-->>GE: content
    
    GE->>AI: Generate embedding for content
    AI-->>GE: vector [1536 dimensions]
    
    GE->>DB: UPDATE campus_documents SET content_embedding = vector
    GE-->>UI: Success
    
    UI-->>AD: ✅ "Dokumen berhasil diupload dan siap untuk RAG"
```

---

## 5. Sequence Diagram: Admin Authentication

```mermaid
sequenceDiagram
    autonumber
    
    participant AD as 👨‍💼 Admin
    participant UI as 🖥️ AdminAuth
    participant AU as 🔐 Auth Service
    participant DB as 🗄️ Database
    participant DA as 📊 Dashboard
    
    Note over AD,DA: Fase 1: Check Existing Session
    
    AD->>UI: Navigate to /admin
    UI->>AU: getSession()
    
    alt Has Valid Session
        AU-->>UI: session
        UI->>DB: SELECT role FROM user_roles WHERE user_id = session.user.id
        DB-->>UI: role: 'admin'
        UI->>DA: Redirect to Dashboard
    else No Session
        AU-->>UI: null
        UI-->>AD: Show Login Form
    end
    
    Note over AD,DA: Fase 2: Login Process
    
    AD->>UI: Enter email & password
    AD->>UI: Click "Login"
    
    UI->>AU: signInWithPassword(email, password)
    
    alt Valid Credentials
        AU-->>UI: {user, session}
        UI->>DB: SELECT role FROM user_roles WHERE user_id = user.id
        
        alt Is Admin
            DB-->>UI: role: 'admin'
            UI->>UI: Store session
            UI->>DA: Redirect to Dashboard
            DA-->>AD: Show Dashboard
        else Not Admin
            DB-->>UI: null or 'sub_admin'
            UI->>AU: signOut()
            UI-->>AD: ❌ "Akses ditolak"
        end
        
    else Invalid Credentials
        AU-->>UI: Error
        UI-->>AD: ❌ "Email atau password salah"
    end
    
    Note over AD,DA: Fase 3: Logout
    
    AD->>DA: Click "Logout"
    DA->>AU: signOut()
    AU-->>DA: Success
    DA->>UI: Redirect to Login
```

---

## 6. Sequence Diagram: Real-time Notifications

```mermaid
sequenceDiagram
    autonumber
    
    participant SYS as ⚙️ System
    participant DB as 🗄️ Database
    participant RT as 📡 Realtime
    participant UI as 🖥️ ForwardingLogs
    participant AD as 👨‍💼 Admin
    
    Note over SYS,AD: Setup Subscription
    
    UI->>RT: Subscribe to 'forwarding_logs' table
    RT-->>UI: Subscription confirmed
    
    Note over SYS,AD: New Forward Event
    
    SYS->>DB: INSERT forwarding_logs (new forward)
    DB->>RT: Trigger postgres_changes
    RT->>UI: Payload: {new: log_data}
    
    UI->>UI: Process payload
    
    alt Success Log
        UI->>UI: 🎉 Toast: "Berhasil dikirim ke {contact_name}"
    else Failed Log
        UI->>UI: ❌ Toast: "Gagal mengirim ke {contact_name}"
    end
    
    UI->>UI: Refresh logs list
    UI-->>AD: Updated view
    
    Note over SYS,AD: Cleanup on Unmount
    
    AD->>UI: Navigate away
    UI->>RT: Unsubscribe from channel
    RT-->>UI: Unsubscribed
```

---

## 7. Sequence Diagram: Contact Management

```mermaid
sequenceDiagram
    autonumber
    
    participant AD as 👨‍💼 Admin
    participant UI as 🖥️ ContactManagement
    participant DB as 🗄️ Database
    
    Note over AD,DB: Load Contacts
    
    AD->>UI: Open Kelola Kontak tab
    UI->>DB: SELECT * FROM forwarding_contacts ORDER BY category
    DB-->>UI: [contacts]
    UI-->>AD: Display contacts grouped by category
    
    Note over AD,DB: Add New Contact
    
    AD->>UI: Click "Tambah Kontak"
    UI-->>AD: Show form dialog
    AD->>UI: Fill form (name, type, value, category)
    AD->>UI: Submit
    
    UI->>UI: Validate input
    UI->>DB: INSERT forwarding_contacts
    DB-->>UI: new_contact
    UI->>UI: Close dialog
    UI->>UI: Refresh list
    UI-->>AD: ✅ "Kontak berhasil ditambahkan"
    
    Note over AD,DB: Toggle Active Status
    
    AD->>UI: Toggle contact switch
    UI->>DB: UPDATE forwarding_contacts SET is_active = !current
    DB-->>UI: Success
    UI-->>AD: Status updated
    
    Note over AD,DB: Delete Contact
    
    AD->>UI: Click delete button
    UI-->>AD: Confirm dialog
    AD->>UI: Confirm
    UI->>DB: DELETE FROM forwarding_contacts WHERE id = contact_id
    DB-->>UI: Success
    UI->>UI: Refresh list
    UI-->>AD: ✅ "Kontak berhasil dihapus"
```

---

## 8. Sequence Diagram: Toggle Auto-Forward Setting

```mermaid
sequenceDiagram
    autonumber
    
    participant AD as 👨‍💼 Admin
    participant UI as 🖥️ ContactManagement
    participant DB as 🗄️ Database
    participant SYS as ⚙️ System Behavior
    
    Note over AD,SYS: Current State: Auto-Forward OFF
    
    AD->>UI: Toggle Auto-Forward switch
    
    UI->>DB: SELECT * FROM system_settings WHERE setting_key = 'auto_forward_enabled'
    
    alt Setting Exists
        DB-->>UI: {setting_value: "false"}
        UI->>DB: UPDATE system_settings SET setting_value = "true"
    else Setting Not Exists
        DB-->>UI: null
        UI->>DB: INSERT system_settings (setting_key, setting_value)
    end
    
    DB-->>UI: Success
    UI-->>AD: ✅ "Auto-forward diaktifkan"
    
    Note over AD,SYS: Impact on System
    
    SYS->>SYS: New tickets will be auto-forwarded
    SYS->>SYS: Manual "Kirim" button hidden in ticket list
    
    Note over AD,SYS: Current State: Auto-Forward ON
    
    AD->>UI: Toggle Auto-Forward switch (OFF)
    UI->>DB: UPDATE system_settings SET setting_value = "false"
    DB-->>UI: Success
    UI-->>AD: ✅ "Auto-forward dinonaktifkan"
    
    Note over AD,SYS: Impact on System
    
    SYS->>SYS: New tickets will NOT be auto-forwarded
    SYS->>SYS: Manual "Kirim" button shown for each ticket
```

---

## 9. Legend

```mermaid
graph LR
    subgraph "Participants"
        A[👤 User] --- B[Human actors]
        C[💬 Component] --- D[React components]
        E[⚙️ Edge Function] --- F[Supabase functions]
        G[🤖 AI] --- H[AI Gateway models]
        I[🗄️ Database] --- J[Supabase PostgreSQL]
        K[📱 External API] --- L[Fonnte, Resend]
    end
    
    subgraph "Message Types"
        M["─────>"] --- N[Synchronous call]
        O["─ ─ ─>"] --- P[Response/Return]
        Q["par/and"] --- R[Parallel execution]
        S["alt/else"] --- T[Conditional flow]
    end
```

---

*Dokumentasi Sequence Diagram untuk Sistem Chatbot Pelayanan Keluhan Kampus*
