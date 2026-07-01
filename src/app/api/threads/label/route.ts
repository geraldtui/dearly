import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { bodyTooLarge } from "@/lib/http";

export const runtime = "nodejs";

const MAX_LABEL_LEN = 80;
const MAX_JSON_BYTES = 16 * 1024;

/** Trim and cap a label; whitespace-only becomes null (clears the field). */
function clean(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s ? s.slice(0, MAX_LABEL_LEN) : null;
}

/** Upserts the logged-in owner's nickname + alias for one thread. */
export async function POST(req: NextRequest) {
  const oversized = bodyTooLarge(req, MAX_JSON_BYTES);
  if (oversized) return oversized;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in." }, { status: 401 });
  }

  const limit = rateLimit(`label:${user.id}`, { limit: 30, windowMs: 60_000 });
  if (!limit.allowed) return tooManyRequests(limit.resetAt);

  let body: { counterpartKey?: string; nickname?: string; alias?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const counterpartKey = String(body.counterpartKey || "").trim();
  if (!counterpartKey) {
    return NextResponse.json({ error: "Missing thread." }, { status: 400 });
  }

  const { error } = await supabase.from("conversation_labels").upsert(
    {
      owner_id: user.id,
      counterpart_key: counterpartKey,
      nickname: clean(body.nickname),
      my_alias: clean(body.alias),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "owner_id,counterpart_key" }
  );
  if (error) {
    return NextResponse.json({ error: "We couldn't save that." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
