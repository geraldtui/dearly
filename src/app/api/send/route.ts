import { NextRequest, NextResponse } from "next/server";
import { getResend, FROM_EMAIL, noteEmailHtml, noteEmailText } from "@/lib/email";
import { emailOk } from "@/lib/validation";

export const runtime = "nodejs";

// Resend caps total message size around 40MB; keep attachments well under it.
const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const MAX_SUBJECT_LEN = 150;

function durationLabel(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Strip control characters (incl. CR/LF, which would allow header injection),
// collapse whitespace, trim, and cap length.
function sanitizeSubject(raw: string): string {
  return raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_SUBJECT_LEN);
}

export async function POST(req: NextRequest) {
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
  let attachments: { filename: string; content: Buffer }[] | undefined;
  let hasAudio = false;

  if (audio instanceof File && audio.size > 0) {
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "That recording is too large to email." }, { status: 413 });
    }
    const buffer = Buffer.from(await audio.arrayBuffer());
    attachments = [{ filename: audio.name || "dearly-voice-note.mp3", content: buffer }];
    hasAudio = true;
  }

  const html = noteEmailHtml({
    senderName,
    recipientName,
    durationLabel: durationLabel(durationSeconds),
    hasAudio,
    simulated,
    subject: customSubject,
  });
  const text = noteEmailText({ senderName, recipientName, hasAudio, subject: customSubject });

  try {
    const resend = getResend();
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipientEmail],
      // BCC the sender on every note delivered to the recipient.
      bcc: [senderEmail],
      replyTo: senderEmail,
      subject: customSubject || `${senderName} sent you a voice note on Dearly`,
      html,
      text,
      attachments,
    });

    if (error) {
      return NextResponse.json({ error: error.message || "Email failed to send." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Email failed to send.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
