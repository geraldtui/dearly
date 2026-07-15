import { describe, expect, it } from "vitest";
import {
  buildThreads,
  threadKey,
  counterpartKey,
  ensureSelfThread,
  messagesForThread,
  resolveSelectedKey,
} from "@/lib/threads";
import type { VoiceNote } from "@/lib/db/types";

const ME = "me";

function note(partial: Partial<VoiceNote>): VoiceNote {
  return {
    id: crypto.randomUUID(),
    sender_id: null,
    recipient_id: null,
    sender_name: "",
    recipient_name: "",
    recipient_email: null,
    subject: null,
    storage_path: "x.mp3",
    duration_seconds: 5,
    listened_at: null,
    created_at: "2026-06-01T00:00:00.000Z",
    ...partial,
  };
}

describe("threadKey", () => {
  it("keys an outgoing note by the recipient account id", () => {
    const n = note({ sender_id: ME, recipient_id: "abc", recipient_name: "Mae" });
    expect(threadKey(n, ME)).toBe("id:abc");
  });

  it("keys an incoming note by the sender account id", () => {
    const n = note({ sender_id: "abc", recipient_id: ME, sender_name: "Mae" });
    expect(threadKey(n, ME)).toBe("id:abc");
  });

  it("falls back to email, then name, for non-account recipients", () => {
    const byEmail = note({ sender_id: ME, recipient_email: "Pat@X.com", recipient_name: "Pat" });
    expect(threadKey(byEmail, ME)).toBe("email:pat@x.com");
    const byName = note({ sender_id: ME, recipient_name: "Lee Ann" });
    expect(threadKey(byName, ME)).toBe("name:lee ann");
  });
});

describe("counterpartKey", () => {
  it("prefers account id, then email (lowercased), then name", () => {
    expect(counterpartKey({ id: "abc", email: "x@y.com", name: "X" })).toBe("id:abc");
    expect(counterpartKey({ email: "Pat@X.com" })).toBe("email:pat@x.com");
    expect(counterpartKey({ name: "Lee Ann" })).toBe("name:lee ann");
  });

  it("matches the key a note resolves to (route ↔ page agreement)", () => {
    const n = note({ sender_id: ME, recipient_id: "abc", recipient_name: "Mae" });
    expect(counterpartKey({ id: "abc", email: null })).toBe(threadKey(n, ME));
  });
});

describe("buildThreads", () => {
  it("merges sent and received with the same account into one thread, newest first", () => {
    const notes = [
      note({ sender_id: ME, recipient_id: "a", recipient_name: "Ada", created_at: "2026-06-03T00:00:00Z" }),
      note({ sender_id: "a", recipient_id: ME, sender_name: "Ada", created_at: "2026-06-06T00:00:00Z" }),
      note({ sender_id: "b", recipient_id: ME, sender_name: "Bo", created_at: "2026-06-05T00:00:00Z" }),
    ];
    const threads = buildThreads(notes, ME);
    expect(threads.map((c) => c.name)).toEqual(["Ada", "Bo"]);
    expect(threads.find((c) => c.key === "id:a")?.count).toBe(2);
  });

  it("flags non-account contacts as viaEmail and replyable when an email is known", () => {
    const threads = buildThreads(
      [note({ sender_id: ME, recipient_email: "pat@x.com", recipient_name: "Pat" })],
      ME
    );
    expect(threads[0].viaEmail).toBe(true);
    expect(threads[0].canReply).toBe(true);
    expect(threads[0].counterpartEmail).toBe("pat@x.com");
  });

  it("marks incoming-only guest threads (no id, no email) as not replyable", () => {
    const threads = buildThreads(
      [note({ sender_id: null, recipient_id: ME, sender_name: "Guest" })],
      ME
    );
    expect(threads[0].canReply).toBe(false);
    expect(threads[0].name).toBe("Guest");
  });

  it("uses 'Someone' for a nameless counterpart", () => {
    const threads = buildThreads([note({ sender_id: "x", recipient_id: ME })], ME);
    expect(threads[0].name).toBe("Someone");
  });
});

describe("ensureSelfThread", () => {
  it("synthesizes a zero-count placeholder when the self thread has no notes yet", () => {
    const threads = ensureSelfThread([], ME, true);
    expect(threads).toHaveLength(1);
    expect(threads[0]).toMatchObject({
      key: "id:me",
      name: "Self Notes",
      counterpartId: ME,
      count: 0,
      canReply: true,
      pinned: true,
    });
  });

  it("pins the existing self thread instead of duplicating it", () => {
    const threads = buildThreads(
      [note({ sender_id: ME, recipient_id: ME, recipient_name: "Me", created_at: "2026-06-01T00:00:00Z" })],
      ME
    );
    const result = ensureSelfThread(threads, ME, true);
    expect(result).toHaveLength(1);
    expect(result[0].pinned).toBe(true);
    expect(result[0].count).toBe(1);
  });

  it("sorts the pinned self thread before more recently active threads", () => {
    const threads = buildThreads(
      [note({ sender_id: "a", recipient_id: ME, sender_name: "Ada", created_at: "2026-06-06T00:00:00Z" })],
      ME
    );
    const result = ensureSelfThread(threads, ME, true);
    expect(result.map((t) => t.key)).toEqual(["id:me", "id:a"]);
  });

  it("does nothing when the self thread isn't pinned", () => {
    const result = ensureSelfThread([], ME, false);
    expect(result).toEqual([]);
  });
});

describe("messagesForThread", () => {
  it("returns the thread oldest-first with outgoing flags", () => {
    const notes = [
      note({ sender_id: "a", recipient_id: ME, sender_name: "Ada", created_at: "2026-06-06T00:00:00Z" }),
      note({ sender_id: ME, recipient_id: "a", recipient_name: "Ada", created_at: "2026-06-03T00:00:00Z" }),
      note({ sender_id: "b", recipient_id: ME, sender_name: "Bo", created_at: "2026-06-05T00:00:00Z" }),
    ];
    const msgs = messagesForThread(notes, ME, "id:a");
    expect(msgs).toHaveLength(2);
    expect(msgs.map((m) => m.outgoing)).toEqual([true, false]);
  });
});

describe("resolveSelectedKey", () => {
  const threads = buildThreads(
    [
      note({ sender_id: "a", recipient_id: ME, sender_name: "Ada", created_at: "2026-06-05Z" }),
      note({ sender_id: "b", recipient_id: ME, sender_name: "Bo", created_at: "2026-06-01Z" }),
    ],
    ME
  );

  it("keeps a matching requested key, else defaults to the first thread", () => {
    expect(resolveSelectedKey(threads, "id:b")).toBe("id:b");
    expect(resolveSelectedKey(threads, undefined)).toBe("id:a");
    expect(resolveSelectedKey(threads, "ghost")).toBe("id:a");
  });

  it("returns null when there are no threads", () => {
    expect(resolveSelectedKey([], undefined)).toBeNull();
  });
});
