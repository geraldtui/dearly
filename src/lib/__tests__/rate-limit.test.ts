import { afterEach, describe, expect, it, vi } from "vitest";
import { rateLimit, tooManyRequests, __resetRateLimit } from "@/lib/rate-limit";

afterEach(() => {
  __resetRateLimit();
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("allows up to the limit, then blocks", () => {
    const opts = { limit: 3, windowMs: 1000 };
    expect(rateLimit("k", opts).allowed).toBe(true);
    expect(rateLimit("k", opts).allowed).toBe(true);
    expect(rateLimit("k", opts)).toMatchObject({ allowed: true, remaining: 0 });
    expect(rateLimit("k", opts).allowed).toBe(false);
  });

  it("keys are independent", () => {
    const opts = { limit: 1, windowMs: 1000 };
    expect(rateLimit("a", opts).allowed).toBe(true);
    expect(rateLimit("b", opts).allowed).toBe(true);
    expect(rateLimit("a", opts).allowed).toBe(false);
  });

  it("resets after the window elapses", () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const opts = { limit: 1, windowMs: 1000 };
    expect(rateLimit("k", opts).allowed).toBe(true);
    expect(rateLimit("k", opts).allowed).toBe(false);
    vi.setSystemTime(1500);
    expect(rateLimit("k", opts).allowed).toBe(true);
  });
});

describe("tooManyRequests", () => {
  it("returns 429 with a whole-second Retry-After of at least 1", () => {
    const res = tooManyRequests(Date.now() + 5000);
    expect(res.status).toBe(429);
    const retry = Number(res.headers.get("Retry-After"));
    expect(retry).toBeGreaterThanOrEqual(1);
    expect(Number.isInteger(retry)).toBe(true);
  });
});
