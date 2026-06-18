import { NextRequest, NextResponse } from "next/server";
import { sendEmail, FROM_EMAIL, escapeHtml } from "@/lib/email";
import { emailOk } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let body: { email?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = String(body.email || "").trim();
  const source = String(body.source || "unknown").trim();

  if (!emailOk(email)) {
    return NextResponse.json({ error: "That email looks off." }, { status: 400 });
  }

  const notify = process.env.WAITLIST_NOTIFY_EMAIL;
  if (!notify) {
    // No inbox configured: accept the signup so the UX still completes, but
    // make it visible in the server logs.
    console.warn(`[waitlist] WAITLIST_NOTIFY_EMAIL not set — signup not emailed: ${email} (${source})`);
    return NextResponse.json({ ok: true, stored: false });
  }

  try {
    await sendEmail({
      from: FROM_EMAIL,
      to: notify,
      replyTo: email,
      subject: `New Dearly waitlist signup (${source})`,
      html: `<p>New waitlist signup:</p><p><b>${escapeHtml(email)}</b></p><p>Source: ${escapeHtml(source)}</p>`,
      text: `New waitlist signup: ${email}\nSource: ${source}`,
    });
    return NextResponse.json({ ok: true, stored: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not join the waitlist.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
