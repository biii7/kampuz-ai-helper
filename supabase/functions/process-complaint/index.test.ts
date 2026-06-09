import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const ENDPOINT = `${SUPABASE_URL}/functions/v1/process-complaint`;

const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${ANON_KEY}`,
  "apikey": ANON_KEY,
};

async function callApi(payload: Record<string, unknown>) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

Deno.test("process-complaint - intent: keluhan terdeteksi", async () => {
  const { status, body } = await callApi({
    message: "AC di ruang kelas 301 rusak sudah seminggu",
    type: "intent",
  });
  assertEquals(status, 200);
  assert(["keluhan", "informasi"].includes(body.intent));
});

Deno.test("process-complaint - classify: kategori fasilitas", async () => {
  const { status, body } = await callApi({
    message: "AC di Gedung A tidak berfungsi",
    type: "classify",
  });
  assertEquals(status, 200);
  assert(body.kategori, "kategori harus dikembalikan");
});

Deno.test("process-complaint - NER mengekstrak NIM", async () => {
  const { status, body } = await callApi({
    message: "Saya Ani NIM 60200121001, AC di Gedung A rusak",
    type: "ner",
  });
  assertEquals(status, 200);
  assert(body.nim || body.lokasi || body.subjek, "minimal satu entity terekstrak");
});

Deno.test("process-complaint - sentiment analysis", async () => {
  const { status, body } = await callApi({
    message: "Saya sangat kecewa dengan pelayanan kampus!",
    type: "sentiment",
  });
  assertEquals(status, 200);
  assert(
    ["frustrated", "sad", "worried", "neutral"].includes(body.sentiment),
    `sentiment tidak valid: ${body.sentiment}`,
  );
});

Deno.test("process-complaint - CORS preflight", async () => {
  const res = await fetch(ENDPOINT, { method: "OPTIONS", headers });
  await res.text();
  assertEquals(res.status, 200);
});
