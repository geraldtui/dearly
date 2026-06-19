/** Small request helpers shared by the API route handlers. */
import { NextResponse, type NextRequest } from "next/server";

/**
 * Best-effort client IP from the proxy chain. Vercel sets `x-forwarded-for`;
 * we take the first (original client) hop. Falls back to `"unknown"` so a
 * missing header buckets together rather than throwing.
 */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Rejects a request whose declared `Content-Length` exceeds `maxBytes` before
 * the body is parsed. Returns a 413 response to short-circuit, or null to
 * proceed (a missing/garbled header is allowed; per-route parsing still caps).
 */
export function bodyTooLarge(req: NextRequest, maxBytes: number): NextResponse | null {
  const len = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(len) && len > maxBytes) {
    return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  }
  return null;
}
