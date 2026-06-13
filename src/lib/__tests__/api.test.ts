import { describe, expect, it } from "vitest";
import { snakeCaseName } from "@/lib/api";

describe("snakeCaseName", () => {
  it("converts a subject to a snake_case file base", () => {
    expect(snakeCaseName("Happy Birthday!")).toBe("happy_birthday");
  });

  it("collapses runs of non-alphanumerics into one underscore", () => {
    expect(snakeCaseName("hey -- you & me?!")).toBe("hey_you_me");
  });

  it("strips diacritics", () => {
    expect(snakeCaseName("Café déjà vu")).toBe("cafe_deja_vu");
  });

  it("trims leading/trailing underscores", () => {
    expect(snakeCaseName("  ...hello...  ")).toBe("hello");
  });

  it("caps the slug at 60 characters without a trailing underscore", () => {
    const slug = snakeCaseName("word ".repeat(30));
    expect(slug.length).toBeLessThanOrEqual(60);
    expect(slug.endsWith("_")).toBe(false);
  });

  it("falls back to voice_note when nothing usable remains", () => {
    expect(snakeCaseName("")).toBe("voice_note");
    expect(snakeCaseName("!!!")).toBe("voice_note");
  });
});
