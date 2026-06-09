import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const ENDPOINT = `${SUPABASE_URL}/functions/v1/forward-ticket`;

const headers = {
  "Content-Type": "application/json",
  "Authorization": `Bearer ${ANON_KEY}`,
  "apikey": ANON_KEY,
};

Deno.test("forward-ticket - menolak request tanpa ticketId", async () => {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({}),
  });
  const body = await res.json().catch(() => ({}));
  assert(res.status >= 400 || body.error, "harus error tanpa ticketId");
});

Deno.test("forward-ticket - menolak ticketId tidak valid", async () => {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ ticketId: "00000000-0000-0000-0000-000000000000" }),
  });
  const body = await res.json().catch(() => ({}));
  assert(res.status >= 400 || body.error || body.success === false);
});

Deno.test("forward-ticket - CORS preflight", async () => {
  const res = await fetch(ENDPOINT, { method: "OPTIONS", headers });
  await res.text();
  assertEquals(res.status, 200);
});
