import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { VoiceNote } from "@/lib/db/types";

export const runtime = "nodejs";

const BUCKET = "voice-notes";
const SIGNED_URL_TTL_SECONDS = 300;

/**
 * Mints a short-lived signed URL for a note the caller participates in.
 * Marks the note listened on the recipient's first play.
 */
export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in." }, { status: 401 });
  }

  // RLS hides rows the user doesn't participate in, so a miss is a 404.
  const { data: note } = await supabase
    .from("voice_notes")
    .select("id, recipient_id, storage_path, listened_at")
    .eq("id", id)
    .maybeSingle<Pick<VoiceNote, "id" | "recipient_id" | "storage_path" | "listened_at">>();
  if (!note) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }

  const service = createServiceClient();
  const { data: signed, error } = await service.storage
    .from(BUCKET)
    .createSignedUrl(note.storage_path, SIGNED_URL_TTL_SECONDS);
  if (error || !signed?.signedUrl) {
    return NextResponse.json({ error: "We couldn't load the audio." }, { status: 500 });
  }

  if (user.id === note.recipient_id && !note.listened_at) {
    await supabase.from("voice_notes").update({ listened_at: new Date().toISOString() }).eq("id", id);
  }

  return NextResponse.json({ url: signed.signedUrl });
}
