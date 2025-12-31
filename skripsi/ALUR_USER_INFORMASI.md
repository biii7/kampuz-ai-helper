# Alur User Meminta Informasi
## Flowchart RAG (Retrieval-Augmented Generation) System

---

## 1. Flowchart Utama RAG

```mermaid
flowchart TD
    Start([🎯 User Bertanya]) --> A[💬 Ketik Pertanyaan di Chat]
    A --> B[🤖 Intent Detection]
    
    B --> C{Intent = informasi?}
    C -->|Tidak| D[🔄 Proses Keluhan]
    C -->|Ya| E[📚 RAG System]
    
    E --> F[🔍 Cek Cache]
    F --> G{Cache Hit?}
    
    G -->|Ya| H[📦 Ambil dari Cache]
    G -->|Tidak| I[🧮 Generate Embedding]
    
    I --> J[🔎 Semantic Search]
    J --> K{Dokumen Ditemukan?}
    
    K -->|Ya| L[📄 Ambil Dokumen Relevan]
    K -->|Tidak| M[📂 Fallback: Semua Dokumen]
    
    L --> N[🤖 Generate Jawaban AI]
    M --> N
    
    N --> O[💾 Simpan ke Cache]
    O --> P[💬 Tampilkan Jawaban]
    
    H --> Q[➕ Update Access Count]
    Q --> P
    
    P --> End([✅ Selesai])

    style Start fill:#e8f5e9
    style End fill:#e8f5e9
    style G fill:#fff3e0
    style K fill:#e3f2fd
    style N fill:#fce4ec
```

---

## 2. Komponen RAG System

```mermaid
graph TB
    subgraph "📥 Input Layer"
        A[User Question]
    end
    
    subgraph "⚡ Processing Layer"
        B[Embedding Generator]
        C[Semantic Search]
        D[Context Builder]
        E[AI Response Generator]
    end
    
    subgraph "💾 Data Layer"
        F[(RAG Cache)]
        G[(Campus Documents)]
        H[(Vector Store)]
    end
    
    subgraph "📤 Output Layer"
        I[Generated Answer]
    end
    
    A --> B
    B --> C
    C --> H
    H --> G
    G --> D
    D --> E
    E --> I
    
    A --> F
    F -->|Cache Hit| I
    E --> F
    
    style A fill:#e8f5e9
    style I fill:#e8f5e9
    style F fill:#fff3e0
    style G fill:#e3f2fd
    style H fill:#fce4ec
```

---

## 3. Detail Proses Caching

```mermaid
flowchart LR
    subgraph "Cache Check"
        A[Pertanyaan User] --> B[Normalize Query]
        B --> C[Search in rag_cache]
        C --> D{Match Found?}
    end
    
    subgraph "Cache Hit"
        D -->|Yes| E[Get Cached Answer]
        E --> F[Increment access_count]
        F --> G[Update updated_at]
        G --> H[Return Answer]
    end
    
    subgraph "Cache Miss"
        D -->|No| I[Process with RAG]
        I --> J[Generate Answer]
        J --> K[Store in Cache]
        K --> L[Return Answer]
    end
    
    style D fill:#fff3e0
    style E fill:#c8e6c9
    style I fill:#ffcdd2
```

**Struktur Cache:**
```typescript
interface RagCache {
  id: string;
  question: string;      // Pertanyaan original
  answer: string;        // Jawaban yang di-cache
  documents_used: number; // Jumlah dokumen yang digunakan
  access_count: number;   // Berapa kali diakses
  created_at: Date;
  updated_at: Date;
}
```

---

## 4. Detail Proses Embedding

```mermaid
sequenceDiagram
    participant Q as Question
    participant AI as AI Gateway
    participant V as Vector Store
    
    Q->>AI: Generate embedding
    Note over AI: Model: text-embedding-ada-002<br/>Dimensions: 1536
    
    AI-->>V: Return vector [0.123, -0.456, ...]
    
    Note over V: Vector disimpan untuk<br/>semantic search
```

**Embedding Process:**
```typescript
// Generate embedding untuk pertanyaan
const embeddingResponse = await fetch(aiGatewayUrl, {
  method: 'POST',
  body: JSON.stringify({
    model: 'openai/gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `Generate semantic embedding for: "${question}"`
    }]
  })
});
```

---

## 5. Detail Semantic Search

```mermaid
flowchart TD
    A[Query Embedding Vector] --> B[match_documents Function]
    
    B --> C[Hitung Cosine Similarity]
    C --> D{Similarity > Threshold?}
    
    D -->|Ya| E[Include Document]
    D -->|Tidak| F[Exclude Document]
    
    E --> G[Sort by Similarity DESC]
    G --> H[Limit to Top N]
    H --> I[Return Documents]
    
    F --> G

    style A fill:#e3f2fd
    style C fill:#fff3e0
    style D fill:#fce4ec
    style I fill:#c8e6c9
```

**SQL Function match_documents:**
```sql
CREATE FUNCTION match_documents(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  similarity float
) AS $$
  SELECT 
    campus_documents.id,
    campus_documents.title,
    campus_documents.content,
    1 - (campus_documents.content_embedding <=> query_embedding) as similarity
  FROM campus_documents
  WHERE content_embedding IS NOT NULL
    AND 1 - (content_embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$ LANGUAGE sql STABLE;
```

---

## 6. Detail Context Building

```mermaid
flowchart LR
    subgraph "Input"
        A[Retrieved Documents]
        B[User Question]
    end
    
    subgraph "Context Builder"
        C[Combine Documents]
        D[Add Metadata]
        E[Format Context]
    end
    
    subgraph "Output"
        F[Complete Prompt]
    end
    
    A --> C
    C --> D
    D --> E
    B --> E
    E --> F
    
    style F fill:#c8e6c9
```

**Context Template:**
```
Anda adalah asisten virtual UIN Alauddin Makassar.
Jawab pertanyaan berdasarkan dokumen berikut:

=== DOKUMEN RELEVAN ===

[Dokumen 1: {title}]
{content}

[Dokumen 2: {title}]
{content}

...

=== PERTANYAAN ===
{user_question}

=== INSTRUKSI ===
- Jawab dengan bahasa Indonesia yang baik
- Berdasarkan HANYA pada dokumen di atas
- Jika tidak ada informasi, katakan "Maaf, informasi tidak tersedia"
- Berikan jawaban yang jelas dan ringkas
```

---

## 7. Detail AI Response Generation

```mermaid
sequenceDiagram
    participant C as Context
    participant AI as AI Gateway
    participant R as Response
    
    C->>AI: Send context + question
    
    Note over AI: Model Processing<br/>- Analyze context<br/>- Find relevant info<br/>- Generate response
    
    AI-->>R: Return answer
    
    Note over R: Post-processing:<br/>- Format markdown<br/>- Add references
```

**AI Configuration:**
```typescript
const response = await fetch(aiGatewayUrl, {
  method: 'POST',
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash',
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: contextWithQuestion
      }
    ],
    temperature: 0.3, // Lower for factual responses
    max_tokens: 1000
  })
});
```

---

## 8. Fallback Strategy

```mermaid
flowchart TD
    A[Semantic Search] --> B{Results?}
    
    B -->|0 results| C[Fallback Level 1]
    B -->|< 3 results| D[Fallback Level 2]
    B -->|>= 3 results| E[Use Results]
    
    C --> F[Fetch ALL Documents]
    D --> G[Lower Threshold]
    
    F --> H[Use Top 10 by Date]
    G --> I[Retry Search]
    
    I --> J{Results Now?}
    J -->|Yes| E
    J -->|No| F
    
    E --> K[Generate Answer]
    H --> K

    style B fill:#fff3e0
    style C fill:#ffcdd2
    style D fill:#fff9c4
    style E fill:#c8e6c9
```

**Fallback Logic:**
```typescript
// Level 1: Lower threshold
let documents = await semanticSearch(embedding, 0.7);

if (documents.length < 3) {
  // Level 2: Much lower threshold
  documents = await semanticSearch(embedding, 0.5);
}

if (documents.length === 0) {
  // Level 3: Get all documents
  documents = await getAllDocuments();
}
```

---

## 9. Document Management for RAG

```mermaid
flowchart TD
    subgraph "Admin Actions"
        A[Upload PDF]
        B[Add Manual Doc]
        C[Edit Document]
        D[Delete Document]
    end
    
    subgraph "Processing"
        E[Parse PDF Content]
        F[Generate Embedding]
        G[Store in Database]
    end
    
    subgraph "Impact on RAG"
        H[Update Vector Store]
        I[Invalidate Related Cache]
    end
    
    A --> E
    E --> F
    B --> F
    F --> G
    G --> H
    
    C --> F
    D --> I
    H --> I

    style A fill:#e3f2fd
    style B fill:#e3f2fd
    style F fill:#fce4ec
    style I fill:#fff3e0
```

---

## 10. Performance Optimizations

### 10.1 Caching Layer

```mermaid
graph LR
    A[User Query] --> B{Exact Match Cache}
    B -->|Hit| C[Return Cached]
    B -->|Miss| D{Semantic Cache}
    D -->|Hit| E[Return Similar]
    D -->|Miss| F[Full RAG Process]
    
    style B fill:#c8e6c9
    style D fill:#fff9c4
    style F fill:#ffcdd2
```

### 10.2 Metrics Tracked

| Metric | Description |
|--------|-------------|
| `cache_hit_rate` | Persentase cache hit |
| `avg_response_time` | Rata-rata waktu respons |
| `documents_searched` | Jumlah dokumen yang di-search |
| `embedding_time` | Waktu generate embedding |
| `similarity_scores` | Distribusi similarity scores |

---

## 11. Example Flow

```mermaid
journey
    title Perjalanan User Mencari Informasi
    section Input
      Ketik pertanyaan: 5: User
    section Cache Check
      Cek cache: 3: System
      Cache miss: 2: System
    section RAG Process
      Generate embedding: 4: System
      Semantic search: 4: System
      Find 3 documents: 5: System
      Generate answer: 4: System
    section Output
      Save to cache: 5: System
      Show answer: 5: User
```

**Contoh Interaksi:**

**User:** "Bagaimana cara mengurus cuti akademik?"

**System Process:**
1. ✅ Intent detected: "informasi"
2. ❌ Cache miss
3. ✅ Embedding generated
4. ✅ Found 3 relevant documents:
   - "Panduan Cuti Akademik.pdf" (similarity: 0.89)
   - "Peraturan Akademik 2024.pdf" (similarity: 0.82)
   - "FAQ Mahasiswa.pdf" (similarity: 0.78)
5. ✅ Answer generated
6. ✅ Saved to cache

**Response:**
```
Untuk mengurus cuti akademik di UIN Alauddin Makassar, 
ikuti langkah berikut:

1. Download formulir cuti di portal akademik
2. Isi formulir dan lampirkan:
   - Fotokopi KTM
   - Surat permohonan bermaterai
   - Bukti pembayaran UKT terakhir
3. Ajukan ke bagian akademik fakultas
4. Tunggu persetujuan (3-5 hari kerja)

Informasi ini berdasarkan Panduan Cuti Akademik 
dan Peraturan Akademik 2024.
```

---

## 12. Error Handling

```mermaid
flowchart TD
    A[RAG Process] --> B{Error Type}
    
    B -->|Embedding Failed| C[Use keyword search]
    B -->|No Documents| D[Generic response]
    B -->|AI Timeout| E[Retry with simpler prompt]
    B -->|Database Error| F[Show error message]
    
    C --> G[Continue Process]
    D --> H["Maaf, informasi tidak tersedia"]
    E --> I{Retry Success?}
    F --> J[Ask user to try again]
    
    I -->|Yes| G
    I -->|No| D
    
    G --> K[Generate Answer]

    style B fill:#fff3e0
    style C fill:#fff9c4
    style D fill:#ffcdd2
    style H fill:#ffcdd2
```

---

*Dokumentasi Alur Informasi (RAG) untuk Sistem Chatbot Pelayanan Keluhan Kampus*
