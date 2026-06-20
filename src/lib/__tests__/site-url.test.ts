import { afterEach, describe, expect, it, vi } from "vitest";
import { getSiteUrl } from "@/lib/site-url";

describe("getSiteUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers NEXT_PUBLIC_SITE_URL when set", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://dearlyvoice.com");
    expect(getSiteUrl()).toBe("https://dearlyvoice.com");
  });

  it("strips a trailing slash from NEXT_PUBLIC_SITE_URL", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://dearlyvoice.com/");
    expect(getSiteUrl()).toBe("https://dearlyvoice.com");
  });
});
