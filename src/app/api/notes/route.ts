import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendVoiceNoteEmail, sendNewNoteNotification } from "@/lib/email";
import {
  MAX_AUDIO_BYTES,
  sanitizeSubject,
  durationLabel,
  storeNote,
  removeStoredNote,
} from "@/lib/notes";
import { emailOk } from "@/lib/validation";
import type { Profile } from "@/lib/db/types";

export const runtime = "nodejs";

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
      // No Dearly account: store the sender's copy first (it replaces the old
      // BCC and shows under "Sent"), then email the recipient the attachment.
      const sentCopy = audioBuffer
        ? await storeNote(supabase, service, {
            ownerFolder: user.id,
            senderId: user.id,
            senderName,
            recipientId: null,
            recipientName,
            subject,
            durationSeconds,
            audioBuffer,
          })
        : null;

      try {
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
          bccSender: false,
        });
        return NextResponse.json({ ok: true, delivery: "email", id });
      } catch (emailError) {
        // Roll back the stored copy so a retry can't duplicate it.
        if (sentCopy) await removeStoredNote(service, sentCopy);
        throw emailError;
      }
    }

    if (!audioBuffer) {
      return NextResponse.json({ error: "Record a message before sending." }, { status: 400 });
    }

    // In-app delivery: upload audio, insert the note, notify the recipient.
    const { id: noteId } = await storeNote(supabase, service, {
      ownerFolder: recipient.id,
      senderId: user.id,
      senderName,
      recipientId: recipient.id,
      recipientName: recipient.display_name || recipientName,
      subject,
      durationSeconds,
      audioBuffer,
    });

    // Notification failure shouldn't fail the send — the note is delivered in-app.
    try {
      await sendNewNoteNotification({
        recipientEmail: recipient.email,
        senderName,
        senderEmail,
        recipientName: recipient.display_name || recipientName,
        subject,
        inboxUrl: `${new URL(req.url).origin}/inbox`,
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
