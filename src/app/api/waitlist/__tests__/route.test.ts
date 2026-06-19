import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ sendEmail: vi.fn() }));

vi.mock("@/lib/email", () => ({
  sendEmail: mocks.sendEmail,
  FROM_EMAIL: "dearly@example.com",
  escapeHtml: (s: string) => s,
}));

import { POST } from "../route";
import { __resetRateLimit } from "@/lib/rate-limit";

function buildRequest(email = "fan@example.com"): NextRequest {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, source: "test" }),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  __resetRateLimit();
  mocks.sendEmail.mockResolvedValue("msg-1");
  process.env.WAITLIST_NOTIFY_EMAIL = "ops@example.com";
});

describe("POST /api/waitlist", () => {
  it("rejects an invalid email with 400", async () => {
    const res = await POST(buildRequest("nope"));
    expect(res.status).toBe(400);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("accepts a valid signup", async () => {
    const res = await POST(buildRequest());
    expect(res.status).toBe(200);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("rate-limits a burst from one IP with 429", async () => {
    for (let i = 0; i < 5; i++) {
      expect((await POST(buildRequest())).status).toBe(200);
    }
    const limited = await POST(buildRequest());
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeTruthy();
  });
});
