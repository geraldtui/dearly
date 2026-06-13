import { describe, expect, it } from "vitest";
import { emailOk } from "@/lib/validation";

describe("emailOk", () => {
  it.each([
    "mom@example.com",
    "first.last@sub.domain.co",
    "  padded@example.com  ", // trimmed before testing
    "name+tag@example.io",
  ])("accepts %s", (value) => {
    expect(emailOk(value)).toBe(true);
  });

  it.each([
    "",
    "   ",
    "plainaddress",
    "missing@tld",
    "@no-local.com",
    "spaces in@example.com",
    "two@@example.com",
  ])("rejects %s", (value) => {
    expect(emailOk(value)).toBe(false);
  });
});
