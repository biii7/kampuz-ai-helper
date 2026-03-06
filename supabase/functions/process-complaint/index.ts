import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { message, type, sentiment, kategori } = requestBody;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY tidak dikonfigurasi");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Deteksi intent
    if (type === "intent") {
      const intentPrompt = `Tugasmu adalah mendeteksi niat pengguna.
Jika teks berisi keluhan atau masalah, balas dengan satu kata: keluhan
Jika hanya pertanyaan atau permintaan informasi, balas dengan satu kata: informasi

Teks: ${message}

Balas hanya dengan satu kata: keluhan atau informasi`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: intentPrompt }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("AI gateway error:", response.status, errorText);
        throw new Error("AI gateway error");
      }

      const data = await response.json();
      const intent = data.choices[0]?.message?.content?.trim().toLowerCase();
      
      return new Response(JSON.stringify({ intent }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Klasifikasi keluhan
    if (type === "classify") {
      const classifyPrompt = `Klasifikasikan teks keluhan berikut ke salah satu kategori:
- fasilitas (masalah gedung, ruangan, AC, toilet, dll)
- akademik (masalah kuliah, dosen, nilai, jadwal, dll)
- administrasi (masalah KRS, surat, dokumen, dll)
- keuangan (masalah biaya kuliah, beasiswa, dll)
- pelanggaran (masalah kedisiplinan, SPI, DUMAS)
- ppid (permintaan informasi publik)

Teks: ${message}

Balas hanya dengan nama kategori tanpa penjelasan.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: classifyPrompt }],
        }),
      });

      if (!response.ok) {
        throw new Error("Classification error");
      }

      const data = await response.json();
      const kategori = data.choices[0]?.message?.content?.trim().toLowerCase();
      
      return new Response(JSON.stringify({ kategori }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ekstraksi NER (NIM, lokasi, subjek)
    if (type === "ner") {
      const nerPrompt = `Ekstrak informasi berikut dari teks keluhan dalam format JSON:
- nim: NIM mahasiswa (10-12 digit angka, jika tidak ada tulis "tidak disebutkan")
- lokasi: lokasi masalah (gedung, ruangan, atau tempat spesifik, jika tidak ada tulis "tidak disebutkan")
- subjek: ringkasan masalah dalam 3-5 kata

Teks: ${message}

Balas HANYA dengan JSON tanpa penjelasan. Contoh:
{"nim":"1234567890","lokasi":"Gedung A lantai 3","subjek":"AC rusak"}`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: nerPrompt }],
        }),
      });

      if (!response.ok) {
        throw new Error("NER error");
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content?.trim();
      
      // Parse JSON dari response
      const jsonMatch = content.match(/\{[^}]+\}/);
      const entities = jsonMatch ? JSON.parse(jsonMatch[0]) : {
        nim: "tidak disebutkan",
        lokasi: "tidak disebutkan",
        subjek: "keluhan umum"
      };
      
      return new Response(JSON.stringify(entities), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // RAG untuk pertanyaan informasi dengan caching dan semantic search
    if (type === "rag") {
      console.log('RAG request received for:', message);
      
      // Check cache first
      const normalizedQuestion = message.toLowerCase().trim();
      const { data: cachedAnswer } = await supabase
        .from("rag_cache")
        .select("*")
        .ilike("question", `%${normalizedQuestion}%`)
        .order("access_count", { ascending: false })
        .limit(1)
        .single();

      if (cachedAnswer) {
        console.log('Cache hit! Returning cached answer');
        // Update cache access count
        await supabase
          .from("rag_cache")
          .update({ 
            access_count: cachedAnswer.access_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq("id", cachedAnswer.id);

        return new Response(JSON.stringify({ 
          answer: cachedAnswer.answer,
          documentsUsed: cachedAnswer.documents_used,
          cached: true
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log('Cache miss, generating new answer with semantic search');

      // Generate embedding for the question
      let queryEmbedding = null;
      try {
        const embeddingResponse = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: message,
          }),
        });

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          queryEmbedding = embeddingData.data[0].embedding;
          console.log('Query embedding generated successfully');
        }
      } catch (embError) {
        console.error('Error generating query embedding:', embError);
        // Continue without semantic search if embedding fails
      }

      let documents;
      let documentCount = 0;

      // Use semantic search if embedding available
      if (queryEmbedding) {
        console.log('Using semantic search with vector similarity');
        const { data: semanticDocs, error: semanticError } = await supabase.rpc(
          'match_documents',
          {
            query_embedding: queryEmbedding,
            match_threshold: 0.5,
            match_count: 10
          }
        );

        if (!semanticError && semanticDocs && semanticDocs.length > 0) {
          documents = semanticDocs;
          console.log(`Semantic search found ${documents.length} relevant documents`);
        }
      }

      // Fallback to fetching all documents if semantic search fails
      if (!documents || documents.length === 0) {
        console.log('Using fallback: fetching all documents');
        const { data: allDocs, error: docError } = await supabase
          .from("campus_documents")
          .select("*")
          .order("created_at", { ascending: false });

        if (docError) {
          console.error('Error fetching documents:', docError);
        }
        documents = allDocs || [];
      }

      let context = "";
      documentCount = documents.length;

      if (documents.length > 0) {
        // Build context from documents
        context = documents.map((doc: any) => {
          const title = doc.title || 'Dokumen Tanpa Judul';
          const category = doc.metadata?.category || '';
          const source = doc.metadata?.source || '';
          const content = doc.content?.substring(0, 2000) || '';
          const similarity = doc.similarity ? ` (Relevansi: ${(doc.similarity * 100).toFixed(1)}%)` : '';
          
          return `=== ${title}${similarity} ===
Kategori: ${category}
Sumber: ${source}

${content}
`;
        }).join("\n\n");
        
        console.log(`Using ${documentCount} documents as context, total length: ${context.length} chars`);
      } else {
        context = "Belum ada dokumen kampus yang tersedia.";
        console.log('No documents found in database');
      }

      const ragPrompt = `Kamu adalah asisten informasi kampus UIN Alauddin Makassar. 

PENTING: Gunakan HANYA informasi dari dokumen di bawah ini untuk menjawab pertanyaan. Jangan membuat informasi baru atau menambahkan fakta yang tidak ada dalam dokumen.

=== DOKUMEN KAMPUS (${documentCount} dokumen) ===
${context}
=== AKHIR DOKUMEN ===

Pertanyaan User: ${message}

Instruksi:
1. Baca semua dokumen dengan teliti
2. Cari informasi yang RELEVAN dengan pertanyaan
3. Jawab dengan bahasa yang ramah, jelas, dan Islamic
4. Jika informasi ADA dalam dokumen: berikan jawaban lengkap dengan menyebutkan sumber/kategori dokumen
5. Jika informasi TIDAK ADA dalam dokumen: katakan dengan jujur "Mohon maaf, informasi tersebut belum tersedia dalam dokumen kampus kami. Silakan menghubungi bagian [sebutkan bagian yang relevan] untuk informasi lebih lanjut."
6. Gunakan salam Islamic yang sesuai (Assalamu'alaikum, Alhamdulillah, dll)

Jawaban:`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: ragPrompt }],
          temperature: 0.3, // Lower temperature untuk jawaban yang lebih konsisten dan faktual
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI response error:', response.status, errorText);
        throw new Error("RAG error");
      }

      const data = await response.json();
      const answer = data.choices[0]?.message?.content;
      
      console.log('RAG response generated successfully');

      // Cache the answer for future use
      try {
        await supabase
          .from("rag_cache")
          .insert({
            question: normalizedQuestion,
            answer,
            documents_used: documentCount,
            access_count: 1
          });
        console.log('Answer cached successfully');
      } catch (cacheError) {
        console.error('Error caching answer:', cacheError);
        // Don't fail the request if caching fails
      }
      
      return new Response(JSON.stringify({ 
        answer,
        documentsUsed: documentCount,
        cached: false
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sentiment detection untuk keluhan
    if (type === "sentiment") {
      const sentimentPrompt = `Analisis sentimen/emosi dari teks keluhan ini dan klasifikasikan ke salah satu:
- frustrated (frustrasi/marah/kesal)
- sad (sedih/kecewa)
- worried (cemas/khawatir)
- neutral (netral/biasa saja)

Teks: ${message}

Balas hanya dengan satu kata: frustrated, sad, worried, atau neutral`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: sentimentPrompt }],
        }),
      });

      if (!response.ok) {
        throw new Error("Sentiment analysis error");
      }

      const data = await response.json();
      const sentiment = data.choices[0]?.message?.content?.trim().toLowerCase();
      
      return new Response(JSON.stringify({ sentiment }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate empathetic response based on sentiment
    if (type === "empathetic_response") {
      const currentSentiment = sentiment || "neutral";
      const currentKategori = kategori || "umum";
      const userMessage = message || "";
      
      let tone = "";
      if (currentSentiment === "frustrated") {
        tone = "dengan nada yang sangat memahami frustrasi pengguna, tunjukkan empati yang tulus";
      } else if (currentSentiment === "sad") {
        tone = "dengan nada yang lembut dan penuh empati, tunjukkan pengertian atas kekecewaan pengguna";
      } else if (currentSentiment === "worried") {
        tone = "dengan nada yang menenangkan dan meyakinkan, bantu kurangi kecemasan pengguna";
      } else {
        tone = "dengan nada profesional dan ramah";
      }

      const responsePrompt = `Kamu adalah asisten kampus yang berempati. Buat respon singkat (maksimal 2 kalimat) ${tone} untuk keluhan kategori ${currentKategori}.

Keluhan: ${userMessage}

Respon harus:
- Mengakui perasaan dan situasi pengguna
- Meyakinkan bahwa masalah akan ditangani
- Jangan terlalu formal, gunakan bahasa yang hangat
- PENTING: Jangan menyebutkan ID tiket atau detail teknis, hanya fokus pada empati`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: responsePrompt }],
        }),
      });

      if (!response.ok) {
        throw new Error("Response generation error");
      }

      const data = await response.json();
      const empatheticResponse = data.choices[0]?.message?.content;
      
      return new Response(JSON.stringify({ response: empatheticResponse }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid type parameter" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});