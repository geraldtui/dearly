/**
 * Dependency-free, in-memory fixed-window rate limiter.
 *
 * Best-effort by design: on serverless (Vercel) the store is per-instance, so
 * counts are not shared across cold starts or concurrent instances. It still
 * blunts bursts from a single client and adds no infrastructure. Swap the store
 * for Redis/Upstash later if durable limits are needed.
 */
import { NextResponse } from "next/server";

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();
let lastPrune = 0;

/** Drop expired windows occasionally so the map can't grow unbounded. */
function prune(now: number): void {
  if (now - lastPrune < 60_000) return;
  lastPrune = now;
  for (const [key, win] of store) {
    if (win.resetAt <= now) store.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Records a hit for `key` and reports whether it is within `limit` per
 * `windowMs`. Never throws — on unexpected error it fails open (allows).
 */
export function rateLimit(key: string, opts: { limit: number; windowMs: number }): RateLimitResult {
  try {
    const now = Date.now();
    prune(now);

    const win = store.get(key);
    if (!win || win.resetAt <= now) {
      const fresh: Window = { count: 1, resetAt: now + opts.windowMs };
      store.set(key, fresh);
      return { allowed: true, remaining: opts.limit - 1, resetAt: fresh.resetAt };
    }

    win.count += 1;
    const remaining = Math.max(0, opts.limit - win.count);
    return { allowed: win.count <= opts.limit, remaining, resetAt: win.resetAt };
  } catch {
    return { allowed: true, remaining: 0, resetAt: Date.now() };
  }
}

/** Standard 429 response with a whole-second `Retry-After`. */
export function tooManyRequests(resetAt: number): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again shortly." },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

/** Test-only: clear all windows so module state doesn't leak across cases. */
export function __resetRateLimit(): void {
  store.clear();
  lastPrune = 0;
}
