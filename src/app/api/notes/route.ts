import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  getResend,
  FROM_EMAIL,
  sendVoiceNoteEmail,
  newNoteNotificationHtml,
  newNoteNotificationText,
} from "@/lib/email";
import { emailOk } from "@/lib/validation";
import type { Profile } from "@/lib/db/types";

export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const MAX_SUBJECT_LEN = 150;
const BUCKET = "voice-notes";

function sanitizeSubject(raw: string): string {
  return raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SUBJECT_LEN);
}

function durationLabel(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Authenticated hybrid send: deliver in-app when the recipient has a Dearly
 * account (store MP3 + row, email a notification link); otherwise fall back
 * to the classic email-with-attachment flow.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in to send a note." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const recipientName = String(form.get("recipientName") || "").trim();
  const recipientEmail = String(form.get("recipientEmail") || "").trim().toLowerCase();
  const subject = sanitizeSubject(String(form.get("subject") || ""));
  const durationSeconds = Number(form.get("durationSeconds") || 0);
  const simulated = String(form.get("simulated") || "false") === "true";
  const audio = form.get("audio");

  if (!recipientName) {
    return NextResponse.json({ error: "Who is this note for?" }, { status: 400 });
  }
  if (!emailOk(recipientEmail)) {
    return NextResponse.json({ error: "That email looks off." }, { status: 400 });
  }
  if (audio instanceof File && audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "That recording is too large to send." }, { status: 413 });
  }

  // Sender identity comes from the session, never from the client payload.
  const { data: senderProfile } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .eq("id", user.id)
    .single<Pick<Profile, "id" | "email" | "display_name">>();
  const senderName = senderProfile?.display_name || senderProfile?.email || "Someone";
  const senderEmail = senderProfile?.email || user.email || "";

  const audioBuffer =
    audio instanceof File && audio.size > 0 ? Buffer.from(await audio.arrayBuffer()) : null;

  // Recipient lookup runs server-side with the service role (profiles are not
  // publicly readable under RLS).
  const service = createServiceClient();
  const { data: recipient } = await service
    .from("profiles")
    .select("id, email, display_name")
    .eq("email", recipientEmail)
    .maybeSingle<Pick<Profile, "id" | "email" | "display_name">>();

  try {
    if (!recipient) {
      // No Dearly account: classic email with the MP3 attached.
      const id = await sendVoiceNoteEmail({
        senderName,
        senderEmail,
        recipientName,
        recipientEmail,
        subject,
        durationLabel: durationLabel(durationSeconds),
        simulated,
        attachments: audioBuffer
          ? [{ filename: (audio as File).name || "dearly-voice-note.mp3", content: audioBuffer }]
          : undefined,
      });
      return NextResponse.json({ ok: true, delivery: "email", id });
    }

    if (!audioBuffer) {
      return NextResponse.json({ error: "Record a message before sending." }, { status: 400 });
    }

    // In-app delivery: upload audio, insert the note, notify the recipient.
    const noteId = crypto.randomUUID();
    const storagePath = `${recipient.id}/${noteId}.mp3`;

    const { error: uploadError } = await service.storage
      .from(BUCKET)
      .upload(storagePath, audioBuffer, { contentType: "audio/mpeg" });
    if (uploadError) {
      throw new Error("We couldn't store your note. Please try again.");
    }

    const { error: insertError } = await supabase.from("voice_notes").insert({
      id: noteId,
      sender_id: user.id,
      recipient_id: recipient.id,
      sender_name: senderName,
      recipient_name: recipient.display_name || recipientName,
      subject: subject || null,
      storage_path: storagePath,
      duration_seconds: Math.round(durationSeconds),
    });
    if (insertError) {
      // Don't leave an orphaned object behind.
      await service.storage.from(BUCKET).remove([storagePath]);
      throw new Error("We couldn't save your note. Please try again.");
    }

    const inboxUrl = `${new URL(req.url).origin}/inbox`;
    const notifyOpts = {
      senderName,
      recipientName: recipient.display_name || recipientName,
      subject,
      inboxUrl,
    };
    // Notification failure shouldn't fail the send — the note is delivered in-app.
    try {
      await getResend().emails.send({
        from: FROM_EMAIL,
        to: [recipient.email],
        replyTo: senderEmail || undefined,
        subject: subject || `${senderName} sent you a voice note on Dearly`,
        html: newNoteNotificationHtml(notifyOpts),
        text: newNoteNotificationText(notifyOpts),
      });
    } catch (notifyError) {
      console.warn("[notes] notification email failed:", notifyError);
    }

    return NextResponse.json({ ok: true, delivery: "in-app", id: noteId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "We couldn't send your note.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
