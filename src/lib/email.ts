import nodemailer, { type Transporter } from "nodemailer";
import type Mail from "nodemailer/lib/mailer";

let cached: Transporter | null = null;

/**
 * Lazily build the Amazon SES SMTP transport so missing config only fails at
 * request time (and tests can run without real credentials). SMTP credentials
 * and the host are region-specific — see docs/aws-ses-setup.md.
 */
export function getTransport(): Transporter {
  const host = process.env.SES_SMTP_HOST;
  const user = process.env.SES_SMTP_USER;
  const pass = process.env.SES_SMTP_PASSWORD;
  if (!host || !user || !pass) {
    throw new Error(
      "SES SMTP is not configured. Set SES_SMTP_HOST, SES_SMTP_USER and SES_SMTP_PASSWORD."
    );
  }
  if (!cached) {
    const port = Number(process.env.SES_SMTP_PORT || 587);
    cached = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 = implicit TLS; 587 = STARTTLS
      auth: { user, pass },
    });
  }
  return cached;
}

/** Thin wrapper so callers don't touch the transport directly. Returns the SES message id. */
export async function sendEmail(message: Mail.Options): Promise<string | undefined> {
  const info = await getTransport().sendMail(message);
  return info.messageId;
}

/**
 * Sender address. Must be on a domain verified in SES (e.g. dearlyvoice.com);
 * SES rejects unverified senders, so there is no public test fallback.
 */
export const FROM_EMAIL = process.env.DEARLY_FROM_EMAIL || "Sona <noreply@dearlyvoice.com>";

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
  /** Sender-chosen subject; when present it becomes the masthead instead of "Sona". */
  subject?: string;
  /** When the recipient has a Sona account, link them to their inbox to listen in-app too. */
  inboxUrl?: string;
}): string {
  const { senderName, recipientName, durationLabel, hasAudio, simulated, subject, inboxUrl } = opts;

  // Use the sender's subject as the masthead when provided; otherwise the brand.
  const masthead = subject?.trim()
    ? `<div style="font-family:Georgia,'Times New Roman',serif;font-size:32px;font-weight:600;color:${INK};letter-spacing:0.3px;line-height:1.25;">${escapeHtml(
        subject.trim()
      )}</div>`
    : `<div style="font-family:Georgia,'Times New Roman',serif;font-size:46px;font-weight:600;color:${INK};letter-spacing:0.5px;">Sona<span style="color:${ACCENT};">.</span></div>`;
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
              ${
                inboxUrl
                  ? `<p style="margin:16px 0 0;"><a href="${inboxUrl}" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:11px 26px;border-radius:99px;">Listen on Sona</a></p>`
                  : ""
              }
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 40px;text-align:center;">
              <p style="margin:0;font-size:11px;color:${INK_SOFT};letter-spacing:0.04em;">Made with &#9829; — Sona · voice logs for the ones you love</p>
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
  inboxUrl?: string;
}): string {
  const { senderName, recipientName, hasAudio, subject, inboxUrl } = opts;
  const lines: string[] = [];
  if (subject?.trim()) lines.push(subject.trim(), "");
  lines.push(
    `A voice note for you, ${recipientName}.`,
    "",
    `${senderName} sent you something to hear, with love.`,
    hasAudio ? "Your voice note is attached below — just press play to listen." : "",
    inboxUrl ? `You can also listen on Sona: ${inboxUrl}` : "",
    "",
    "Made with love — Sona"
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
  /**
   * BCC the sender their own copy when explicitly true. Default is no BCC —
   * senders should not receive a copy of notes they send (spec 01, 08).
   */
  bccSender?: boolean;
  /** When set (recipient has a Sona account), the email adds a "Listen on Sona" CTA. */
  inboxUrl?: string;
}

/**
 * Sends the classic voice-note email (MP3 attached). Used by the public send
 * flow and the account flow's non-user fallback. Sender is not BCC'd unless
 * bccSender is explicitly true.
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
    inboxUrl: opts.inboxUrl,
  };
  return sendEmail({
    from: FROM_EMAIL,
    to: opts.recipientEmail,
    bcc: opts.bccSender ? opts.senderEmail : undefined,
    replyTo: opts.senderEmail,
    subject: opts.subject || `${opts.senderName} sent you a voice note on Sona`,
    html: noteEmailHtml(tplOpts),
    text: noteEmailText(tplOpts),
    attachments: opts.attachments,
  });
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
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:46px;font-weight:600;color:${INK};letter-spacing:0.5px;">Sona<span style="color:${ACCENT};">.</span></div>
              <div style="width:46px;height:1px;background:${ACCENT};opacity:.55;margin:14px auto 0;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 0;text-align:center;">
              <h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:600;color:${INK};">A voice note is waiting for you, ${escapeHtml(recipientName)}.</h1>
              <p style="margin:0 0 8px;font-size:15px;color:${INK_SOFT};line-height:1.6;"><b style="color:${INK};">${escapeHtml(senderName)}</b> sent you a voice note on Sona.</p>
              ${subjectLine}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 8px;text-align:center;">
              <a href="${inboxUrl}" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 30px;border-radius:99px;">Listen on Sona</a>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 40px;text-align:center;">
              <p style="margin:0;font-size:11px;color:${INK_SOFT};letter-spacing:0.04em;">Made with &#9829; — Sona · voice logs for the ones you love</p>
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
    `${senderName} sent you a voice note on Sona.`,
    subject?.trim() ? `"${subject.trim()}"` : "",
    "",
    `Listen here: ${inboxUrl}`,
    "",
    "Made with love — Sona",
  ];
  return lines.filter(Boolean).join("\n");
}

/** Sends the "you have a new voice note" notification for in-app delivery. */
export async function sendNewNoteNotification(opts: {
  recipientEmail: string;
  senderName: string;
  senderEmail?: string;
  recipientName: string;
  subject: string;
  inboxUrl: string;
  /** BCC the sender only when explicitly true. */
  bccSender?: boolean;
}): Promise<void> {
  const tplOpts = {
    senderName: opts.senderName,
    recipientName: opts.recipientName,
    subject: opts.subject,
    inboxUrl: opts.inboxUrl,
  };
  await sendEmail({
    from: FROM_EMAIL,
    to: opts.recipientEmail,
    bcc: opts.bccSender && opts.senderEmail ? opts.senderEmail : undefined,
    replyTo: opts.senderEmail || undefined,
    subject: opts.subject || `${opts.senderName} sent you a voice note on Sona`,
    html: newNoteNotificationHtml(tplOpts),
    text: newNoteNotificationText(tplOpts),
  });
}
