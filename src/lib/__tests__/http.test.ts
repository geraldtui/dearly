import { describe, expect, it } from "vitest";
import type { NextRequest } from "next/server";
import { clientIp, bodyTooLarge } from "@/lib/http";

/** Minimal NextRequest stand-in exposing only the headers `get` used here. */
function reqWith(headers: Record<string, string>): NextRequest {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { headers: { get: (k: string) => lower[k.toLowerCase()] ?? null } } as unknown as NextRequest;
}

describe("clientIp", () => {
  it("takes the first x-forwarded-for hop", () => {
    expect(clientIp(reqWith({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip, then 'unknown'", () => {
    expect(clientIp(reqWith({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
    expect(clientIp(reqWith({}))).toBe("unknown");
  });
});

describe("bodyTooLarge", () => {
  it("returns a 413 when Content-Length exceeds the cap", () => {
    const res = bodyTooLarge(reqWith({ "content-length": "2000" }), 1000);
    expect(res?.status).toBe(413);
  });

  it("allows requests within the cap or without the header", () => {
    expect(bodyTooLarge(reqWith({ "content-length": "500" }), 1000)).toBeNull();
    expect(bodyTooLarge(reqWith({}), 1000)).toBeNull();
  });
});
