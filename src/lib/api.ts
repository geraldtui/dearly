/* Thin client-side helpers that call the server route handlers. */

import type { Recording } from "@/types";
import { encodeBlobToMp3 } from "./audio";

/** Build a safe snake_case file base from a subject, e.g. "Happy Birthday!" → "happy_birthday". */
function snakeCaseName(input: string): string {
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
  fd.append("durationSeconds", String(Math.round(payload.recording?.duration ?? 0)));
  fd.append("simulated", String(payload.recording?.simulated ?? false));

  // Transcode the recording to MP3 so mail clients (Gmail, Apple Mail) show an
  // inline play button on the attachment. If transcoding fails for any reason,
  // fall back to sending the original recorded blob rather than dropping audio.
  if (payload.recording?.blob) {
    const base = snakeCaseName(payload.subject);
    let audioBlob: Blob = payload.recording.blob;
    let ext = "mp3";
    try {
      audioBlob = await encodeBlobToMp3(payload.recording.blob);
    } catch {
      ext = (payload.recording.mimeType || "audio/webm").includes("ogg") ? "ogg" : "webm";
    }
    fd.append("audio", audioBlob, `${base}.${ext}`);
  }

  const res = await fetch("/api/send", { method: "POST", body: fd });
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
