import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendVoiceNoteEmail } from "@/lib/email";
import {
  MAX_AUDIO_BYTES,
  sanitizeSubject,
  durationLabel,
  storeNote,
  removeStoredNote,
} from "@/lib/notes";
import { emailOk } from "@/lib/validation";
import { counterpartKey } from "@/lib/threads";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { bodyTooLarge } from "@/lib/http";
import type { Profile } from "@/lib/db/types";

export const runtime = "nodejs";

/**
 * Authenticated dual-delivery send: with audio, always email the recipient the
 * MP3 attachment AND store the sender's Sona copy. Sona-user recipients also
 * keep the in-app Inbox row (same row) and get a "Listen on Sona" link.
 */
export async function POST(req: NextRequest) {
  const oversized = bodyTooLarge(req, MAX_AUDIO_BYTES + 1024 * 1024);
  if (oversized) return oversized;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in to send a note." }, { status: 401 });
  }

  const limit = rateLimit(`notes:${user.id}`, { limit: 20, windowMs: 60_000 });
  if (!limit.allowed) return tooManyRequests(limit.resetAt);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const recipientName = String(form.get("recipientName") || "").trim();
  const recipientEmail = String(form.get("recipientEmail") || "").trim().toLowerCase();
  const aliasInput = String(form.get("alias") || "").trim().slice(0, 80);
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
  const profileName = senderProfile?.display_name || senderProfile?.email || "Someone";
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

  const recipientDisplay = recipient?.display_name || recipientName;
  const inboxUrl = `${new URL(req.url).origin}/voicenotes`;

  // Per-conversation alias: how the sender signs to this recipient (e.g. "Dad").
  // A new-chat alias is persisted; otherwise we use any previously saved one.
  const convoKey = counterpartKey({ id: recipient?.id ?? null, email: recipientEmail });
  if (aliasInput) {
    await supabase.from("conversation_labels").upsert(
      { owner_id: user.id, counterpart_key: convoKey, my_alias: aliasInput, updated_at: new Date().toISOString() },
      { onConflict: "owner_id,counterpart_key" }
    );
  }
  const { data: label } = await supabase
    .from("conversation_labels")
    .select("my_alias")
    .eq("owner_id", user.id)
    .eq("counterpart_key", convoKey)
    .maybeSingle<{ my_alias: string | null }>();
  const senderName = aliasInput || label?.my_alias || profileName;

  function emailRecipient(opts: { attach: boolean; withInboxLink: boolean }) {
    return sendVoiceNoteEmail({
      senderName,
      senderEmail,
      recipientName: recipientDisplay,
      recipientEmail,
      subject,
      durationLabel: durationLabel(durationSeconds),
      simulated,
      attachments:
        opts.attach && audioBuffer
          ? [{ filename: (audio as File).name || "sona-voice-note.mp3", content: audioBuffer }]
          : undefined,
      bccSender: false,
      inboxUrl: opts.withInboxLink ? inboxUrl : undefined,
    });
  }

  try {
    // No audio (simulated/mic-denied): nothing to store or attach — just a heads-up.
    if (!audioBuffer) {
      const id = await emailRecipient({ attach: false, withInboxLink: false });
      return NextResponse.json({ ok: true, delivery: "email", id });
    }

    // Always store the note. Sona-user recipients own the row (Inbox + the
    // sender's Sent); otherwise it's the sender's copy only (recipient_id null).
    const stored = await storeNote(supabase, service, {
      ownerFolder: recipient ? recipient.id : user.id,
      senderId: user.id,
      senderName,
      recipientId: recipient ? recipient.id : null,
      recipientName: recipientDisplay,
      recipientEmail,
      subject,
      durationSeconds,
      audioBuffer,
    });

    if (recipient) {
      // Delivered in-app already; the attachment email is a bonus, so a failure
      // is non-fatal (don't roll back the Inbox copy).
      try {
        await emailRecipient({ attach: true, withInboxLink: true });
      } catch (emailError) {
        console.warn("[notes] recipient attachment email failed:", emailError);
      }
      return NextResponse.json({ ok: true, delivery: "in-app", id: stored.id });
    }

    // No account: the email is the recipient's only copy — roll back on failure
    // so a retry can't duplicate the stored Sent copy.
    try {
      const id = await emailRecipient({ attach: true, withInboxLink: false });
      return NextResponse.json({ ok: true, delivery: "email", id });
    } catch (emailError) {
      await removeStoredNote(service, stored);
      throw emailError;
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "We couldn't send your note.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
