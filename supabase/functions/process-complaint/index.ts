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
      // Fetch categories from database (admin-managed)
      const { data: dbCategories } = await supabase
        .from("complaint_categories")
        .select("name, description")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      const categoryList = (dbCategories && dbCategories.length > 0)
        ? dbCategories.map((c: any) => `- ${c.name} (${c.description})`).join("\n")
        : `- fasilitas (masalah gedung, ruangan, AC, toilet, dll)
- akademik (masalah kuliah, dosen, nilai, jadwal, dll)
- administrasi (masalah KRS, surat, dokumen, dll)
- keuangan (masalah biaya kuliah, beasiswa, dll)
- pelanggaran (masalah kedisiplinan, SPI, DUMAS)
- ppid (permintaan informasi publik)
- lainnya (tidak masuk kategori di atas)`;

      const classifyPrompt = `Klasifikasikan teks keluhan berikut ke salah satu kategori berikut. Pelajari deskripsi setiap kategori dengan teliti sebelum memilih:

${categoryList}

Teks: ${message}

Balas HANYA dengan nama kategori (huruf kecil) tanpa penjelasan.`;

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

      const normalizedQuestion = message.toLowerCase().trim();

      // ===== Query Expansion: perluas singkatan umum UIN Alauddin =====
      // Supaya "UKT TI" bisa cocok dengan dokumen "UKT Fakultas Sains dan Teknologi"
      // yang di dalamnya memuat prodi Teknik Informatika.
      const abbreviations: Record<string, string> = {
        "\\bti\\b": "Teknik Informatika",
        "\\bsi\\b": "Sistem Informasi",
        "\\bfst\\b": "Fakultas Sains dan Teknologi",
        "\\bfeb\\b": "Fakultas Ekonomi dan Bisnis Islam",
        "\\bftk\\b": "Fakultas Tarbiyah dan Keguruan",
        "\\bfah\\b": "Fakultas Adab dan Humaniora",
        "\\bfdk\\b": "Fakultas Dakwah dan Komunikasi",
        "\\bfsh\\b": "Fakultas Syariah dan Hukum",
        "\\bfuf\\b": "Fakultas Ushuluddin dan Filsafat",
        "\\bfkik\\b": "Fakultas Kedokteran dan Ilmu Kesehatan",
        "\\bpai\\b": "Pendidikan Agama Islam",
        "\\bpba\\b": "Pendidikan Bahasa Arab",
        "\\bhki\\b": "Hukum Keluarga Islam",
        "\\bukt\\b": "Uang Kuliah Tunggal UKT",
        "\\bkrs\\b": "Kartu Rencana Studi KRS",
        "\\bkhs\\b": "Kartu Hasil Studi KHS",
        "\\bipk\\b": "Indeks Prestasi Kumulatif IPK",
        "\\bspi\\b": "Sumbangan Pembangunan Institusi SPI",
      };
      let expandedMessage = message;
      for (const [pattern, expansion] of Object.entries(abbreviations)) {
        expandedMessage = expandedMessage.replace(new RegExp(pattern, "gi"), expansion);
      }
      if (expandedMessage !== message) {
        console.log('Query expanded:', expandedMessage);
      }

      // Check cache — pakai exact match agar tidak mengembalikan jawaban tidak relevan
      const { data: cachedAnswer } = await supabase
        .from("rag_cache")
        .select("*")
        .eq("question", normalizedQuestion)
        .order("access_count", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cachedAnswer) {
        console.log('Cache hit! Returning cached answer');
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

      // Generate embedding untuk pertanyaan yang sudah diperluas
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
            input: expandedMessage,
          }),
        });

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          queryEmbedding = embeddingData.data[0].embedding;
          console.log('Query embedding generated successfully');
        }
      } catch (embError) {
        console.error('Error generating query embedding:', embError);
      }

      let documents: any[] = [];

      // Semantic search dengan threshold rendah agar dokumen fakultas ikut terambil
      if (queryEmbedding) {
        const { data: semanticDocs, error: semanticError } = await supabase.rpc(
          'match_documents',
          {
            query_embedding: queryEmbedding,
            match_threshold: 0.25,
            match_count: 15
          }
        );

        if (!semanticError && semanticDocs && semanticDocs.length > 0) {
          documents = semanticDocs;
          console.log(`Semantic search found ${documents.length} relevant documents`);
        }
      }

      // Keyword fallback: cari dokumen yang judul/konten memuat kata kunci dari query
      // Ini menangkap kasus "UKT TI" -> dokumen berjudul "UKT Sains dan Teknologi"
      const keywords = Array.from(new Set(
        expandedMessage
          .toLowerCase()
          .replace(/[^\p{L}\p{N}\s]/gu, ' ')
          .split(/\s+/)
          .filter((w) => w.length >= 3 && !['yang','untuk','pada','dari','apa','bagaimana','tentang','saya','ada','dan','atau'].includes(w))
      ));

      if (keywords.length > 0) {
        const orFilter = keywords
          .map((k) => `title.ilike.%${k}%,content.ilike.%${k}%`)
          .join(',');
        const { data: kwDocs } = await supabase
          .from("campus_documents")
          .select("*")
          .or(orFilter)
          .limit(15);

        if (kwDocs && kwDocs.length > 0) {
          const existingIds = new Set(documents.map((d: any) => d.id));
          for (const d of kwDocs) {
            if (!existingIds.has(d.id)) documents.push(d);
          }
          console.log(`Keyword search added documents, total now: ${documents.length}`);
        }
      }

      // Fallback terakhir: ambil semua dokumen
      if (documents.length === 0) {
        const { data: allDocs } = await supabase
          .from("campus_documents")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20);
        documents = allDocs || [];
        console.log(`Fallback: loaded ${documents.length} documents`);
      }

      const documentCount = documents.length;
      let context = "";

      if (documents.length > 0) {
        // Kirim konten lebih panjang (8000 char) agar detail prodi di dalam dokumen fakultas ikut terbaca
        context = documents.map((doc: any) => {
          const title = doc.title || 'Dokumen Tanpa Judul';
          const category = doc.metadata?.category || '';
          const source = doc.metadata?.source || '';
          const content = doc.content?.substring(0, 8000) || '';
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
      }

      const ragPrompt = `Kamu adalah asisten informasi kampus UIN Alauddin Makassar.

PENTING: Gunakan HANYA informasi dari dokumen di bawah ini untuk menjawab pertanyaan. Jangan mengarang.

=== DOKUMEN KAMPUS (${documentCount} dokumen) ===
${context}
=== AKHIR DOKUMEN ===

Pertanyaan User (asli): ${message}
Pertanyaan setelah ekspansi singkatan: ${expandedMessage}

Panduan menjawab:
1. Baca SETIAP dokumen sampai selesai — jangan hanya membaca judulnya.
2. Judul dokumen sering menyebut FAKULTAS (contoh: "UKT Fakultas Sains dan Teknologi"), sementara isi dokumen memuat rincian per PRODI (contoh: Teknik Informatika, Sistem Informasi, Matematika). Jika user bertanya tentang prodi tertentu, PERIKSA ISI dokumen fakultas yang membawahinya.
3. Kenali singkatan umum: TI = Teknik Informatika, SI = Sistem Informasi, FST = Fakultas Sains dan Teknologi, UKT = Uang Kuliah Tunggal, dll. Prodi TI/SI berada di bawah FST.
4. Jika menemukan tabel/daftar UKT per prodi di dalam dokumen fakultas, kutip angka spesifik untuk prodi yang ditanyakan.
5. Sebutkan nama dokumen sumber saat menjawab.
6. Jika benar-benar tidak ada di dokumen, katakan jujur: "Mohon maaf, informasi tersebut belum tersedia dalam dokumen kampus kami."
7. Gunakan bahasa ramah dan Islamic (Assalamu'alaikum, dll).

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