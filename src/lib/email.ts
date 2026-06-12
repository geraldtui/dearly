import { Resend } from "resend";

let cached: Resend | null = null;

/** Lazily construct the Resend client so a missing key only fails at request time. */
export function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error("RESEND_API_KEY is not set. Add it to your environment to send email.");
  }
  if (!cached) cached = new Resend(key);
  return cached;
}

/** Resend's onboarding sender works without domain verification for quick tests. */
export const FROM_EMAIL = process.env.DEARLY_FROM_EMAIL || "Dearly <onboarding@resend.dev>";

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const ACCENT = "#A36A5E";
const INK = "#3D3431";
const INK_SOFT = "#6e615b";

/** Warm, on-brand HTML for the voice-note email sent to the recipient. */
export function noteEmailHtml(opts: {
  senderName: string;
  recipientName: string;
  durationLabel: string;
  hasAudio: boolean;
  simulated: boolean;
  /** Sender-chosen subject; when present it becomes the masthead instead of "Dearly". */
  subject?: string;
}): string {
  const { senderName, recipientName, durationLabel, hasAudio, simulated, subject } = opts;

  // Use the sender's subject as the masthead when provided; otherwise the brand.
  const masthead = subject?.trim()
    ? `<div style="font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:600;color:${INK};letter-spacing:0.3px;line-height:1.25;">${escapeHtml(
        subject.trim()
      )}</div>`
    : `<div style="font-family:Georgia,'Times New Roman',serif;font-size:46px;font-weight:600;color:${INK};letter-spacing:0.5px;">Dearly<span style="color:${ACCENT};">.</span></div>`;
  const audioLine = hasAudio
    ? `<p style="margin:0 0 8px;font-size:15px;color:${INK_SOFT};line-height:1.6;">Your voice note (${escapeHtml(
        durationLabel
      )}) is attached below — just press play to listen.</p>`
    : simulated
      ? `<p style="margin:0 0 8px;font-size:15px;color:${INK_SOFT};line-height:1.6;">${escapeHtml(
          senderName
        )} recorded a note for you, but the audio couldn&rsquo;t be captured this time. They&rsquo;d love for you to reply.</p>`
      : `<p style="margin:0 0 8px;font-size:15px;color:${INK_SOFT};line-height:1.6;">${escapeHtml(
          senderName
        )} recorded a note for you.</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#FDF8F5;font-family:'Helvetica Neue',Arial,sans-serif;color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FDF8F5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#F3E8E0;border:1px solid rgba(255,255,255,0.7);border-radius:24px;overflow:hidden;">
          <tr>
            <td style="padding:40px 40px 8px;text-align:center;">
              ${masthead}
              <div style="width:46px;height:1px;background:${ACCENT};opacity:.55;margin:14px auto 0;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 8px;text-align:center;">
              <div style="display:inline-block;width:72px;height:72px;line-height:72px;border-radius:50%;background:radial-gradient(circle at 35% 30%, #e7c2b4, #D4A396);text-align:center;">
                <span style="font-size:30px;">&#127911;</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 40px 0;text-align:center;">
              <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:600;color:${INK};">A voice note for you, ${escapeHtml(
                recipientName
              )}.</h1>
              <p style="margin:0 0 8px;font-size:15px;color:${INK_SOFT};line-height:1.6;"><b style="color:${INK};">${escapeHtml(
                senderName
              )}</b> sent you something to hear, with love.</p>
              ${audioLine}
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 40px;text-align:center;">
              <p style="margin:0;font-size:11px;color:${INK_SOFT};letter-spacing:0.04em;">Made with &#9829; — Dearly · voice logs for the ones you love</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function noteEmailText(opts: {
  senderName: string;
  recipientName: string;
  hasAudio: boolean;
  subject?: string;
}): string {
  const { senderName, recipientName, hasAudio, subject } = opts;
  const lines: string[] = [];
  if (subject?.trim()) lines.push(subject.trim(), "");
  lines.push(
    `A voice note for you, ${recipientName}.`,
    "",
    `${senderName} sent you something to hear, with love.`,
    hasAudio ? "Your voice note is attached below — just press play to listen." : "",
    "",
    "Made with love — Dearly"
  );
  return lines.filter(Boolean).join("\n");
}

export interface VoiceNoteEmail {
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  durationLabel: string;
  simulated: boolean;
  attachments?: { filename: string; content: Buffer }[];
}

/**
 * Sends the classic voice-note email (MP3 attached, sender BCC'd). Shared by
 * the public send flow and the account flow's non-user fallback. Returns the
 * provider message id; throws on failure.
 */
export async function sendVoiceNoteEmail(opts: VoiceNoteEmail): Promise<string | undefined> {
  const hasAudio = (opts.attachments?.length ?? 0) > 0;
  const tplOpts = {
    senderName: opts.senderName,
    recipientName: opts.recipientName,
    durationLabel: opts.durationLabel,
    hasAudio,
    simulated: opts.simulated,
    subject: opts.subject,
  };
  const { data, error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: [opts.recipientEmail],
    // BCC the sender on every note delivered to the recipient.
    bcc: [opts.senderEmail],
    replyTo: opts.senderEmail,
    subject: opts.subject || `${opts.senderName} sent you a voice note on Dearly`,
    html: noteEmailHtml(tplOpts),
    text: noteEmailText(tplOpts),
    attachments: opts.attachments,
  });
  if (error) throw new Error(error.message || "Email failed to send.");
  return data?.id;
}

/** Lightweight "you have a new voice note" notification for in-app delivery. */
export function newNoteNotificationHtml(opts: {
  senderName: string;
  recipientName: string;
  subject?: string | null;
  inboxUrl: string;
}): string {
  const { senderName, recipientName, subject, inboxUrl } = opts;
  const subjectLine = subject?.trim()
    ? `<p style="margin:0 0 8px;font-size:15px;color:${INK_SOFT};line-height:1.6;">&ldquo;${escapeHtml(subject.trim())}&rdquo;</p>`
    : "";
  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#FDF8F5;font-family:'Helvetica Neue',Arial,sans-serif;color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FDF8F5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#F3E8E0;border:1px solid rgba(255,255,255,0.7);border-radius:24px;overflow:hidden;">
          <tr>
            <td style="padding:40px 40px 8px;text-align:center;">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:46px;font-weight:600;color:${INK};letter-spacing:0.5px;">Dearly<span style="color:${ACCENT};">.</span></div>
              <div style="width:46px;height:1px;background:${ACCENT};opacity:.55;margin:14px auto 0;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 0;text-align:center;">
              <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:600;color:${INK};">A voice note is waiting for you, ${escapeHtml(recipientName)}.</h1>
              <p style="margin:0 0 8px;font-size:15px;color:${INK_SOFT};line-height:1.6;"><b style="color:${INK};">${escapeHtml(senderName)}</b> sent you a voice note on Dearly.</p>
              ${subjectLine}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 8px;text-align:center;">
              <a href="${inboxUrl}" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 30px;border-radius:99px;">Listen on Dearly</a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 40px;text-align:center;">
              <p style="margin:0;font-size:11px;color:${INK_SOFT};letter-spacing:0.04em;">Made with &#9829; — Dearly · voice logs for the ones you love</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function newNoteNotificationText(opts: {
  senderName: string;
  recipientName: string;
  subject?: string | null;
  inboxUrl: string;
}): string {
  const { senderName, recipientName, subject, inboxUrl } = opts;
  const lines = [
    `A voice note is waiting for you, ${recipientName}.`,
    "",
    `${senderName} sent you a voice note on Dearly.`,
    subject?.trim() ? `"${subject.trim()}"` : "",
    "",
    `Listen here: ${inboxUrl}`,
    "",
    "Made with love — Dearly",
  ];
  return lines.filter(Boolean).join("\n");
}
