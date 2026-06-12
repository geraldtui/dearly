/* Server-side helpers shared by the public and authenticated note routes. */

import type { SupabaseClient } from "@supabase/supabase-js";

export const BUCKET = "voice-notes";
export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const MAX_SUBJECT_LEN = 150;

// Strip control characters (incl. CR/LF, which would allow header injection),
// collapse whitespace, trim, and cap length.
export function sanitizeSubject(raw: string): string {
  return raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SUBJECT_LEN);
}

export function durationLabel(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export interface StoredNote {
  id: string;
  storagePath: string;
}

export interface StoreNoteOpts {
  ownerFolder: string;
  /** Null for notes from senders without a Dearly account. */
  senderId: string | null;
  senderName: string;
  recipientId: string | null;
  recipientName: string;
  subject: string;
  durationSeconds: number;
  audioBuffer: Buffer;
}

/**
 * Uploads the MP3 and inserts the voice_notes row (cleaning up on failure).
 * `db` does the insert: the user-scoped client for logged-in sends (RLS), or
 * the service client for anonymous sends (`senderId: null`, which RLS forbids).
 */
export async function storeNote(
  db: SupabaseClient,
  service: SupabaseClient,
  opts: StoreNoteOpts
): Promise<StoredNote> {
  const id = crypto.randomUUID();
  const storagePath = `${opts.ownerFolder}/${id}.mp3`;

  const { error: uploadError } = await service.storage
    .from(BUCKET)
    .upload(storagePath, opts.audioBuffer, { contentType: "audio/mpeg" });
  if (uploadError) {
    throw new Error("We couldn't store your note. Please try again.");
  }

  const { error: insertError } = await db.from("voice_notes").insert({
    id,
    sender_id: opts.senderId,
    recipient_id: opts.recipientId,
    sender_name: opts.senderName,
    recipient_name: opts.recipientName,
    subject: opts.subject || null,
    storage_path: storagePath,
    duration_seconds: Math.round(opts.durationSeconds),
  });
  if (insertError) {
    // Don't leave an orphaned object behind.
    await service.storage.from(BUCKET).remove([storagePath]);
    throw new Error("We couldn't save your note. Please try again.");
  }

  return { id, storagePath };
}

/** Removes a stored note (row + object), e.g. when the follow-up email fails. */
export async function removeStoredNote(service: SupabaseClient, note: StoredNote): Promise<void> {
  await service.from("voice_notes").delete().eq("id", note.id);
  await service.storage.from(BUCKET).remove([note.storagePath]);
}
