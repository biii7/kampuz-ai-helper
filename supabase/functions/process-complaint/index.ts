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

    // RAG untuk pertanyaan informasi
    if (type === "rag") {
      // Cari dokumen yang relevan
      const { data: documents } = await supabase
        .from("campus_documents")
        .select("*")
        .limit(3);

      let context = "";
      if (documents && documents.length > 0) {
        context = documents.map(doc => `${doc.title}:\n${doc.content}`).join("\n\n");
      } else {
        context = "Belum ada dokumen kampus yang tersedia. Silakan jawab dengan informasi umum.";
      }

      const ragPrompt = `Kamu adalah asisten informasi kampus. Gunakan konteks dokumen berikut untuk menjawab pertanyaan.

Konteks Dokumen:
${context}

Pertanyaan: ${message}

Jawab dengan ramah dan informatif. Jika informasi tidak ada dalam dokumen, beritahu dengan sopan dan sarankan untuk menghubungi bagian terkait.`;

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: ragPrompt }],
        }),
      });

      if (!response.ok) {
        throw new Error("RAG error");
      }

      const data = await response.json();
      const answer = data.choices[0]?.message?.content;
      
      return new Response(JSON.stringify({ answer }), {
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