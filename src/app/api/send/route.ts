import { NextRequest, NextResponse } from "next/server";
import { sendVoiceNoteEmail } from "@/lib/email";
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

  if (audio instanceof File && audio.size > 0) {
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: "That recording is too large to email." }, { status: 413 });
    }
    const buffer = Buffer.from(await audio.arrayBuffer());
    attachments = [{ filename: audio.name || "dearly-voice-note.mp3", content: buffer }];
  }

  try {
    const id = await sendVoiceNoteEmail({
      senderName,
      senderEmail,
      recipientName,
      recipientEmail,
      subject: customSubject,
      durationLabel: durationLabel(durationSeconds),
      simulated,
      attachments,
    });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Email failed to send.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
