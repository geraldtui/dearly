import { describe, expect, it } from "vitest";
import { createPendingSend, pendingForThread } from "@/lib/pendingSends";
import type { AccountNotePayload } from "@/lib/api";

function payload(overrides: Partial<AccountNotePayload> = {}): AccountNotePayload {
  return {
    recipientName: "Mom",
    recipientEmail: "mom@example.com",
    subject: "",
    recording: {
      url: "blob:x",
      blob: new Blob(["x"]),
      mimeType: "audio/webm",
      duration: 12.4,
      bars: [],
      simulated: false,
    },
    ...overrides,
  };
}

describe("createPendingSend", () => {
  it("builds a sending entry with a rounded duration and the given thread key", () => {
    const pending = createPendingSend("email:mom@example.com", payload());

    expect(pending.threadKey).toBe("email:mom@example.com");
    expect(pending.status).toBe("sending");
    expect(pending.error).toBe("");
    expect(pending.durationSeconds).toBe(12);
    expect(pending.payload.recipientName).toBe("Mom");
    expect(pending.id).toBeTruthy();
  });

  it("gives each pending send a unique id", () => {
    const a = createPendingSend("k", payload());
    const b = createPendingSend("k", payload());
    expect(a.id).not.toBe(b.id);
  });

  it("defaults duration to 0 when there is no recording", () => {
    const pending = createPendingSend("k", payload({ recording: null }));
    expect(pending.durationSeconds).toBe(0);
  });
});

describe("pendingForThread", () => {
  it("returns only sends for the given thread, oldest first", () => {
    const a = { ...createPendingSend("thread-a", payload()), createdAt: "2026-06-01T00:00:02.000Z" };
    const b = { ...createPendingSend("thread-a", payload()), createdAt: "2026-06-01T00:00:01.000Z" };
    const c = createPendingSend("thread-b", payload());

    const result = pendingForThread([a, b, c], "thread-a");

    expect(result.map((p) => p.id)).toEqual([b.id, a.id]);
  });

  it("returns an empty array when no sends match", () => {
    expect(pendingForThread([createPendingSend("thread-a", payload())], "thread-b")).toEqual([]);
  });
});
