import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const ENDPOINT = `${SUPABASE_URL}/functions/v1/keluhan`;

const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${ANON_KEY}`,
  "apikey": ANON_KEY,
};

Deno.test("keluhan - menolak request tanpa field wajib", async () => {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ nim: "60200121001" }),
  });
  const body = await res.json();
  assertEquals(res.status, 400);
  assert(body.error, "harus mengembalikan error message");
});

Deno.test("keluhan - menolak body kosong", async () => {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
  await res.text();
  assertEquals(res.status, 400);
});

Deno.test("keluhan - CORS preflight OPTIONS sukses", async () => {
  const res = await fetch(ENDPOINT, { method: "OPTIONS", headers });
  await res.text();
  assertEquals(res.status, 200);
  assert(res.headers.get("access-control-allow-origin"));
});

Deno.test("keluhan - submit tiket valid berhasil", async () => {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({
      nim: "TEST" + Date.now(),
      kategori: "fasilitas",
      lokasi: "Test Lokasi",
      subjek: "Test Subjek",
      deskripsi: "Tiket uji otomatis dari Deno test",
    }),
  });
  const body = await res.json();
  assertEquals(res.status, 200);
  assertEquals(body.success, true);
  assert(body.ticket_id, "harus mengembalikan ticket_id");
});
