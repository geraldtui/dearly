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

/** Extract the bare `local@domain` from a `Name <addr>` or plain-address string. */
function fromAddressOnly(from: string): string {
  const match = from.match(/<([^>]+)>/);
  return (match ? match[1] : from).trim();
}

/**
 * Sanitize a value for use as an email display name: strip characters that
 * would break the header (quotes, angle brackets, commas, newlines) and collapse
 * whitespace. Prevents header injection via a user-controlled sender name.
 */
function sanitizeDisplayName(name: string): string {
  return name.replace(/["<>,\r\n]/g, " ").replace(/\s+/g, " ").trim();
}

/** Sentinel sender name for a note the user recorded to themselves (spec 26). */
export const SELF_NOTE_SENDER_NAME = "Self Note";

/**
 * Build the `From` header for a note. The address stays on the SES-verified
 * domain (SES rejects unverified senders and it would fail SPF/DKIM/DMARC), so
 * only the display name is dynamic: it's the sender's first name (or a
 * single-token nickname/alias as-is), except the "Self Note" sentinel, which
 * is kept whole. Replies still reach the real sender via the message's Reply-To.
 *
 * Falls back to the plain "Sona" brand address when no name is available.
 */
export function senderFromAddress(senderName?: string): string {
  const clean = sanitizeDisplayName(senderName || "");
  const displayName = clean === SELF_NOTE_SENDER_NAME ? clean : clean.split(" ")[0] || "";
  if (!displayName) return FROM_EMAIL;
  return `${displayName} <${fromAddressOnly(FROM_EMAIL)}>`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const ACCENT = "#1D1D1F";
const INK = "#1D1D1F";
const INK_SOFT = "#6E6E73";
const BG = "#ECECEE";
const CARD = "#FFFFFF";
const LINE = "#DEDEE1";

/** The personalized body line for a note the user sent to themselves. */
function selfNoteLine(hasAudio: boolean, simulated: boolean): string {
  if (hasAudio) return "Your new self note is attached.";
  return simulated
    ? "Your self note couldn&rsquo;t be captured this time."
    : "Your self note didn&rsquo;t come through this time.";
}

/** Minimal, monochrome HTML for the voice-note email sent to the recipient. */
export function noteEmailHtml(opts: {
  senderName: string;
  recipientName: string;
  durationLabel: string;
  hasAudio: boolean;
  simulated: boolean;
  /** Sender-chosen subject; shown as the heading, otherwise the Sona brand. */
  subject?: string;
  /** When the recipient has a Sona account, link them to their inbox to listen in-app too. */
  inboxUrl?: string;
  /** True when the sender sent this note to themselves (spec 26). */
  isSelfNote?: boolean;
}): string {
  const { senderName, hasAudio, simulated, subject, inboxUrl, isSelfNote } = opts;

  const heading = subject?.trim()
    ? `<div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:600;color:${INK};letter-spacing:0.2px;line-height:1.3;">${escapeHtml(
        subject.trim()
      )}</div>`
    : `<div style="font-family:Georgia,'Times New Roman',serif;font-size:40px;font-weight:600;color:${INK};letter-spacing:0.5px;">Sona<span style="color:${INK_SOFT};">.</span></div>`;

  const line = isSelfNote
    ? selfNoteLine(hasAudio, simulated)
    : hasAudio
      ? `New voice note from <b style="color:${INK};">${escapeHtml(senderName)}</b> attached.`
      : simulated
        ? `<b style="color:${INK};">${escapeHtml(senderName)}</b> tried to send a voice note, but the audio couldn&rsquo;t be captured this time.`
        : `New voice note from <b style="color:${INK};">${escapeHtml(senderName)}</b>.`;

  const cta = inboxUrl
    ? `<tr><td style="padding:24px 40px 0;text-align:center;"><a href="${inboxUrl}" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:99px;">Listen on Sona</a></td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:${BG};font-family:'Helvetica Neue',Arial,sans-serif;color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:${CARD};border:1px solid ${LINE};border-radius:20px;overflow:hidden;">
          <tr>
            <td style="padding:44px 40px 0;text-align:center;">
              ${heading}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 0;text-align:center;">
              <p style="margin:0;font-size:15px;color:${INK_SOFT};line-height:1.6;">${line}</p>
            </td>
          </tr>
          ${cta}
          <tr>
            <td style="padding:36px 40px 44px;text-align:center;">
              <div style="height:1px;background:${LINE};margin:0 0 20px;"></div>
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
  /** True when the sender sent this note to themselves (spec 26). */
  isSelfNote?: boolean;
}): string {
  const { senderName, hasAudio, subject, inboxUrl, isSelfNote } = opts;
  const lines: string[] = [];
  if (subject?.trim()) lines.push(subject.trim(), "");
  lines.push(
    isSelfNote
      ? hasAudio
        ? "Your new self note is attached."
        : "Your self note didn't come through this time."
      : hasAudio
        ? `New voice note from ${senderName} attached.`
        : `New voice note from ${senderName}.`,
    inboxUrl ? `Listen on Sona: ${inboxUrl}` : "",
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
  /** True when the sender sent this note to themselves (spec 26): personalizes the copy. */
  isSelfNote?: boolean;
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
    isSelfNote: opts.isSelfNote,
  };
  const defaultSubject = opts.isSelfNote
    ? "Your self note on Sona"
    : `${opts.senderName} sent you a voice note on Sona`;
  return sendEmail({
    from: senderFromAddress(opts.senderName),
    to: opts.recipientEmail,
    bcc: opts.bccSender ? opts.senderEmail : undefined,
    replyTo: opts.senderEmail,
    subject: opts.subject || defaultSubject,
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
  const { senderName, subject, inboxUrl } = opts;

  const heading = subject?.trim()
    ? `<div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:600;color:${INK};letter-spacing:0.2px;line-height:1.3;">${escapeHtml(
        subject.trim()
      )}</div>`
    : `<div style="font-family:Georgia,'Times New Roman',serif;font-size:40px;font-weight:600;color:${INK};letter-spacing:0.5px;">Sona<span style="color:${INK_SOFT};">.</span></div>`;

  return `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:${BG};font-family:'Helvetica Neue',Arial,sans-serif;color:${INK};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:${CARD};border:1px solid ${LINE};border-radius:20px;overflow:hidden;">
          <tr>
            <td style="padding:44px 40px 0;text-align:center;">
              ${heading}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 0;text-align:center;">
              <p style="margin:0;font-size:15px;color:${INK_SOFT};line-height:1.6;">New voice note from <b style="color:${INK};">${escapeHtml(senderName)}</b>.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 0;text-align:center;">
              <a href="${inboxUrl}" style="display:inline-block;background:${ACCENT};color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:99px;">Listen on Sona</a>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 40px 44px;text-align:center;">
              <div style="height:1px;background:${LINE};margin:0 0 20px;"></div>
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
  const { senderName, subject, inboxUrl } = opts;
  const lines = [
    subject?.trim() ? subject.trim() : "",
    `New voice note from ${senderName}.`,
    `Listen on Sona: ${inboxUrl}`,
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
    from: senderFromAddress(opts.senderName),
    to: opts.recipientEmail,
    bcc: opts.bccSender && opts.senderEmail ? opts.senderEmail : undefined,
    replyTo: opts.senderEmail || undefined,
    subject: opts.subject || `${opts.senderName} sent you a voice note on Sona`,
    html: newNoteNotificationHtml(tplOpts),
    text: newNoteNotificationText(tplOpts),
  });
}
