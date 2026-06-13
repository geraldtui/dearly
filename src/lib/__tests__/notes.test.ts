import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BUCKET,
  durationLabel,
  removeStoredNote,
  sanitizeSubject,
  storeNote,
  type StoreNoteOpts,
} from "@/lib/notes";

describe("sanitizeSubject", () => {
  it("trims and collapses whitespace", () => {
    expect(sanitizeSubject("  Happy   Birthday  ")).toBe("Happy Birthday");
  });

  it("strips control characters that could inject email headers", () => {
    expect(sanitizeSubject("Hi\r\nBcc: evil@example.com")).toBe("Hi Bcc: evil@example.com");
    expect(sanitizeSubject("a\u0000b\u001fc\u007fd")).toBe("a b c d");
  });

  it("caps the subject at 150 characters", () => {
    expect(sanitizeSubject("x".repeat(200))).toHaveLength(150);
  });

  it("returns an empty string for blank input", () => {
    expect(sanitizeSubject("   ")).toBe("");
  });
});

describe("durationLabel", () => {
  it.each([
    [0, "0:00"],
    [5, "0:05"],
    [59.9, "0:59"],
    [60, "1:00"],
    [125, "2:05"],
    [-3, "0:00"],
  ])("formats %s seconds as %s", (seconds, label) => {
    expect(durationLabel(seconds)).toBe(label);
  });
});

/* ---- storeNote / removeStoredNote with fake Supabase clients ---- */

interface FakeClients {
  db: SupabaseClient;
  service: SupabaseClient;
  upload: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
}

function makeClients(opts?: { uploadError?: boolean; insertError?: boolean }): FakeClients {
  const upload = vi.fn().mockResolvedValue({ error: opts?.uploadError ? { message: "boom" } : null });
  const remove = vi.fn().mockResolvedValue({ error: null });
  const insert = vi.fn().mockResolvedValue({ error: opts?.insertError ? { message: "boom" } : null });

  const service = {
    storage: { from: vi.fn(() => ({ upload, remove })) },
    from: vi.fn(() => ({ insert, delete: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) })),
  } as unknown as SupabaseClient;
  const db = { from: vi.fn(() => ({ insert })) } as unknown as SupabaseClient;

  return { db, service, upload, remove, insert };
}

const noteOpts: StoreNoteOpts = {
  ownerFolder: "owner-1",
  senderId: "sender-1",
  senderName: "Gerald",
  recipientId: "owner-1",
  recipientName: "Mom",
  subject: "Hi Mom",
  durationSeconds: 12.6,
  audioBuffer: Buffer.from("mp3-bytes"),
};

describe("storeNote", () => {
  it("uploads under the owner folder and inserts the row", async () => {
    const { db, service, upload, insert } = makeClients();

    const stored = await storeNote(db, service, noteOpts);

    expect(stored.storagePath).toBe(`owner-1/${stored.id}.mp3`);
    expect(upload).toHaveBeenCalledWith(stored.storagePath, noteOpts.audioBuffer, {
      contentType: "audio/mpeg",
    });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: stored.id,
        sender_id: "sender-1",
        recipient_id: "owner-1",
        subject: "Hi Mom",
        duration_seconds: 13, // rounded
      })
    );
  });

  it("stores a null subject when blank", async () => {
    const { db, service, insert } = makeClients();
    await storeNote(db, service, { ...noteOpts, subject: "" });
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ subject: null }));
  });

  it("throws without inserting when the upload fails", async () => {
    const { db, service, insert } = makeClients({ uploadError: true });
    await expect(storeNote(db, service, noteOpts)).rejects.toThrow(/couldn't store/);
    expect(insert).not.toHaveBeenCalled();
  });

  it("removes the uploaded object when the insert fails", async () => {
    const { db, service, remove } = makeClients({ insertError: true });
    await expect(storeNote(db, service, noteOpts)).rejects.toThrow(/couldn't save/);
    expect(remove).toHaveBeenCalledWith([expect.stringMatching(/^owner-1\/.+\.mp3$/)]);
  });
});

describe("removeStoredNote", () => {
  it("deletes the row and the storage object", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const del = vi.fn(() => ({ eq }));
    const remove = vi.fn().mockResolvedValue({ error: null });
    const service = {
      from: vi.fn(() => ({ delete: del })),
      storage: { from: vi.fn(() => ({ remove })) },
    } as unknown as SupabaseClient;

    await removeStoredNote(service, { id: "note-1", storagePath: "owner/note-1.mp3" });

    expect(eq).toHaveBeenCalledWith("id", "note-1");
    expect(remove).toHaveBeenCalledWith(["owner/note-1.mp3"]);
    expect((service.storage.from as ReturnType<typeof vi.fn>)).toHaveBeenCalledWith(BUCKET);
  });
});
