import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import { sendVoiceNoteEmail, sendNewNoteNotification } from "@/lib/email";
import {
  MAX_AUDIO_BYTES,
  sanitizeSubject,
  durationLabel,
  storeNote,
  removeStoredNote,
} from "@/lib/notes";
import { emailOk } from "@/lib/validation";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { clientIp, bodyTooLarge } from "@/lib/http";
import type { Profile } from "@/lib/db/types";

export const runtime = "nodejs";

type RecipientProfile = Pick<Profile, "id" | "email" | "display_name">;

/**
 * Looks up a Dearly account for the recipient. Returns null when there is no
 * match — or when Supabase isn't configured/reachable, so the public send
 * flow degrades to the classic email instead of failing.
 */
async function findRecipientAccount(
  recipientEmail: string
): Promise<{ service: SupabaseClient; recipient: RecipientProfile } | null> {
  try {
    const service = createServiceClient();
    const { data } = await service
      .from("profiles")
      .select("id, email, display_name")
      .eq("email", recipientEmail.toLowerCase())
      .maybeSingle<RecipientProfile>();
    return data ? { service, recipient: data } : null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const oversized = bodyTooLarge(req, MAX_AUDIO_BYTES + 1024 * 1024);
  if (oversized) return oversized;

  const limit = rateLimit(`send:${clientIp(req)}`, { limit: 5, windowMs: 60_000 });
  if (!limit.allowed) return tooManyRequests(limit.resetAt);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const senderName = String(form.get("senderName") || "").trim();
  const senderEmail = String(form.get("senderEmail") || "").trim();
  const recipientName = String(form.get("recipientName") || "").trim();
  const recipientEmail = String(form.get("recipientEmail") || "").trim();
  const durationSeconds = Number(form.get("durationSeconds") || 0);
  const simulated = String(form.get("simulated") || "false") === "true";
  const customSubject = sanitizeSubject(String(form.get("subject") || ""));

  if (!senderName || !recipientName) {
    return NextResponse.json({ error: "Both names are required." }, { status: 400 });
  }
  if (!emailOk(senderEmail) || !emailOk(recipientEmail)) {
    return NextResponse.json({ error: "Those email addresses look off." }, { status: 400 });
  }

  const audio = form.get("audio");
  let audioBuffer: Buffer | null = null;

  if (audio instanceof File && audio.size > 0) {
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "That recording is too large to email." }, { status: 413 });
    }
    audioBuffer = Buffer.from(await audio.arrayBuffer());
  }

  // Registered recipients get the note in their Dearly Inbox instead of an
  // email attachment (anonymous sender; the free sender is BCC'd the
  // notification as their record). Requires real audio to store.
  const account = audioBuffer ? await findRecipientAccount(recipientEmail) : null;

  try {
    if (account && audioBuffer) {
      const { service, recipient } = account;
      const storedNote = await storeNote(service, service, {
        ownerFolder: recipient.id,
        senderId: null,
        senderName,
        recipientId: recipient.id,
        recipientName: recipient.display_name || recipientName,
        recipientEmail: recipient.email,
        subject: customSubject,
        durationSeconds,
        audioBuffer,
      });

      try {
        await sendNewNoteNotification({
          recipientEmail: recipient.email,
          senderName,
          senderEmail,
          recipientName: recipient.display_name || recipientName,
          subject: customSubject,
          inboxUrl: `${new URL(req.url).origin}/chats`,
          bccSender: true,
        });
      } catch (notifyError) {
        // Without the notification the recipient may never know — roll back
        // so the sender can retry without creating duplicates.
        await removeStoredNote(service, storedNote);
        throw notifyError;
      }
      return NextResponse.json({ ok: true, delivery: "in-app", id: storedNote.id });
    }

    const id = await sendVoiceNoteEmail({
      senderName,
      senderEmail,
      recipientName,
      recipientEmail,
      subject: customSubject,
      durationLabel: durationLabel(durationSeconds),
      simulated,
      attachments: audioBuffer
        ? [{ filename: (audio as File).name || "dearly-voice-note.mp3", content: audioBuffer }]
        : undefined,
    });
    return NextResponse.json({ ok: true, delivery: "email", id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Email failed to send.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
