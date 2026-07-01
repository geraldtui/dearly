/* Thin client-side helpers that call the server route handlers. */

import type { Recording } from "@/types";
import { encodeBlobToMp3 } from "./audio";

/** Build a safe snake_case file base from a subject, e.g. "Happy Birthday!" → "happy_birthday". */
export function snakeCaseName(input: string): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-zA-Z0-9]+/g, "_") // non-alphanumeric runs → underscore
    .replace(/^_+|_+$/g, "")
    .toLowerCase()
    .slice(0, 60)
    .replace(/_+$/g, "");
  return slug || "voice_note";
}

async function parseError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data?.error) return data.error as string;
  } catch {
    /* fall through */
  }
  return "Something went wrong. Please try again.";
}

export interface SendNotePayload {
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientEmail: string;
  /** Optional sender-chosen email subject; blank falls back to a default server-side. */
  subject: string;
  recording: Recording | null;
}

/**
 * Appends recording metadata and the audio blob (transcoded to MP3 so mail
 * clients show an inline play button; falls back to the original blob if
 * transcoding fails) to the multipart body.
 */
async function appendRecording(fd: FormData, recording: Recording | null, subject: string): Promise<void> {
  fd.append("durationSeconds", String(Math.round(recording?.duration ?? 0)));
  fd.append("simulated", String(recording?.simulated ?? false));

  if (recording?.blob) {
    const base = snakeCaseName(subject);
    let audioBlob: Blob = recording.blob;
    let ext = "mp3";
    try {
      audioBlob = await encodeBlobToMp3(recording.blob);
    } catch {
      ext = (recording.mimeType || "audio/webm").includes("ogg") ? "ogg" : "webm";
    }
    fd.append("audio", audioBlob, `${base}.${ext}`);
  }
}

/**
 * Sends the voice note. The audio blob (if a real recording exists) is sent as
 * multipart/form-data so the server can attach it to the email.
 */
export async function sendNote(payload: SendNotePayload): Promise<void> {
  const fd = new FormData();
  fd.append("senderName", payload.senderName);
  fd.append("senderEmail", payload.senderEmail);
  fd.append("recipientName", payload.recipientName);
  fd.append("recipientEmail", payload.recipientEmail);
  fd.append("subject", payload.subject);
  await appendRecording(fd, payload.recording, payload.subject);

  const res = await fetch("/api/send", { method: "POST", body: fd });
  if (!res.ok) throw new Error(await parseError(res));
}

export interface AccountNotePayload {
  recipientName: string;
  recipientEmail: string;
  subject: string;
  /** New-chat only: how the sender signs to this recipient (e.g. "Dad"). */
  alias?: string;
  recording: Recording | null;
}

export type NoteDelivery = "in-app" | "email";

/**
 * Sends a note as a logged-in Sona user. The server decides delivery:
 * in-app (recipient has an account) or the classic email fallback.
 */
export async function sendAccountNote(payload: AccountNotePayload): Promise<NoteDelivery> {
  const fd = new FormData();
  fd.append("recipientName", payload.recipientName);
  fd.append("recipientEmail", payload.recipientEmail);
  fd.append("subject", payload.subject);
  if (payload.alias) fd.append("alias", payload.alias);
  await appendRecording(fd, payload.recording, payload.subject);

  const res = await fetch("/api/notes", { method: "POST", body: fd });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { delivery?: NoteDelivery };
  return data.delivery === "in-app" ? "in-app" : "email";
}

/** Saves the owner's nickname + alias for one thread. */
export async function saveThreadLabel(payload: {
  counterpartKey: string;
  nickname: string;
  alias: string;
}): Promise<void> {
  const res = await fetch("/api/threads/label", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function joinWaitlist(email: string, source: string): Promise<void> {
  const res = await fetch("/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, source }),
  });
  if (!res.ok) throw new Error(await parseError(res));
}
