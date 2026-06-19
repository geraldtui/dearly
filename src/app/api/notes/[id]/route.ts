import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { VoiceNote } from "@/lib/db/types";

export const runtime = "nodejs";

const BUCKET = "voice-notes";

/** Deletes a note (row + audio object) for a participant. */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in." }, { status: 401 });
  }

  // RLS scopes this lookup to the caller's own notes.
  const { data: note } = await supabase
    .from("voice_notes")
    .select("id, storage_path")
    .eq("id", id)
    .maybeSingle<Pick<VoiceNote, "id" | "storage_path">>();
  if (!note) {
    return NextResponse.json({ error: "Note not found." }, { status: 404 });
  }

  const { error: deleteError } = await supabase.from("voice_notes").delete().eq("id", id);
  if (deleteError) {
    return NextResponse.json({ error: "We couldn't delete that note." }, { status: 500 });
  }

  // Remove the audio object; the row is already gone, so a storage failure is
  // logged rather than surfaced (no user-visible orphan).
  const service = createServiceClient();
  const { error: storageError } = await service.storage.from(BUCKET).remove([note.storage_path]);
  if (storageError) {
    console.warn(`[notes] failed to remove storage object ${note.storage_path}:`, storageError.message);
  }

  return NextResponse.json({ ok: true });
}
