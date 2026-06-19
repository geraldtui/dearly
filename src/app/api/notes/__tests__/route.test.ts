import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  sendVoiceNoteEmail: vi.fn(),
  sendNewNoteNotification: vi.fn(),
  storeNote: vi.fn(),
  removeStoredNote: vi.fn(),
  createClient: vi.fn(),
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendVoiceNoteEmail: mocks.sendVoiceNoteEmail,
  sendNewNoteNotification: mocks.sendNewNoteNotification,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: mocks.createClient,
  createServiceClient: mocks.createServiceClient,
}));

vi.mock("@/lib/notes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/notes")>();
  return {
    ...actual,
    storeNote: mocks.storeNote,
    removeStoredNote: mocks.removeStoredNote,
  };
});

import { POST } from "../route";
import { __resetRateLimit } from "@/lib/rate-limit";

const SENDER = { id: "user-1", email: "gerald@example.com", display_name: "Gerald" };

/**
 * User-scoped client: session user, the sender's own profile row (single → SENDER),
 * and conversation_labels lookups (maybeSingle → no saved alias). The chainable
 * builder supports both profiles (.select().eq().single()) and labels
 * (.select().eq().eq().maybeSingle() / .upsert()).
 */
function userClient(user: { id: string; email: string } | null) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    single: vi.fn().mockResolvedValue({ data: SENDER }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    upsert: vi.fn().mockResolvedValue({ error: null }),
  };
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) },
    from: vi.fn(() => chain),
  };
}

function serviceClientWith(recipient: { id: string; email: string; display_name: string | null } | null) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: recipient }),
        })),
      })),
    })),
  };
}

function buildRequest(overrides: Record<string, string | null> = {}, withAudio = false): NextRequest {
  const fields: Record<string, string | null> = {
    recipientName: "Mom",
    recipientEmail: "mom@example.com",
    subject: "Hi Mom",
    durationSeconds: "42",
    simulated: "false",
    ...overrides,
  };
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null) fd.append(key, value);
  }
  if (withAudio) {
    fd.append("audio", new File([new Uint8Array(64)], "hi_mom.mp3", { type: "audio/mpeg" }));
  }
  return new Request("http://localhost/api/notes", { method: "POST", body: fd }) as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  __resetRateLimit();
  mocks.sendVoiceNoteEmail.mockResolvedValue("msg-1");
  mocks.sendNewNoteNotification.mockResolvedValue(undefined);
  mocks.storeNote.mockResolvedValue({ id: "note-1", storagePath: "user-1/note-1.mp3" });
  mocks.removeStoredNote.mockResolvedValue(undefined);
  mocks.createClient.mockResolvedValue(userClient({ id: "user-1", email: "gerald@example.com" }));
  mocks.createServiceClient.mockReturnValue(serviceClientWith(null));
});

describe("POST /api/notes", () => {
  it("returns 401 when not logged in", async () => {
    mocks.createClient.mockResolvedValue(userClient(null));
    const res = await POST(buildRequest({}, true));
    expect(res.status).toBe(401);
    expect(mocks.sendVoiceNoteEmail).not.toHaveBeenCalled();
  });

  it("rejects a missing recipient name with 400", async () => {
    const res = await POST(buildRequest({ recipientName: "  " }, true));
    expect(res.status).toBe(400);
  });

  it("rejects an invalid recipient email with 400", async () => {
    const res = await POST(buildRequest({ recipientEmail: "nope" }, true));
    expect(res.status).toBe(400);
  });

  it("rate-limits a burst from one user with 429 (after the auth check)", async () => {
    for (let i = 0; i < 20; i++) {
      expect((await POST(buildRequest({}, true))).status).toBe(200);
    }
    expect((await POST(buildRequest({}, true))).status).toBe(429);
  });

  describe("recipient without a Dearly account (email fallback)", () => {
    it("stores the sender's Sent copy and emails the recipient without a BCC", async () => {
      const res = await POST(buildRequest({}, true));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toMatchObject({ ok: true, delivery: "email", id: "msg-1" });
      expect(mocks.storeNote).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          ownerFolder: "user-1",
          senderId: "user-1",
          senderName: "Gerald",
          recipientId: null, // sender's own copy
        })
      );
      expect(mocks.sendVoiceNoteEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          senderEmail: "gerald@example.com",
          recipientEmail: "mom@example.com",
          bccSender: false,
          attachments: [expect.objectContaining({ filename: "hi_mom.mp3" })],
        })
      );
    });

    it("rolls back the Sent copy and returns 500 when the email fails", async () => {
      mocks.sendVoiceNoteEmail.mockRejectedValue(new Error("smtp down"));

      const res = await POST(buildRequest({}, true));

      expect(res.status).toBe(500);
      expect(mocks.removeStoredNote).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ id: "note-1" })
      );
    });

    it("sends the email without storing a copy when there is no audio (simulated)", async () => {
      const res = await POST(buildRequest({ simulated: "true" }));
      expect(res.status).toBe(200);
      expect(mocks.storeNote).not.toHaveBeenCalled();
      expect(mocks.sendVoiceNoteEmail).toHaveBeenCalledWith(
        expect.objectContaining({ simulated: true, attachments: undefined })
      );
    });
  });

  describe("recipient with a Dearly account (dual delivery)", () => {
    const recipient = { id: "recipient-1", email: "mom@example.com", display_name: "Mum" };

    beforeEach(() => {
      mocks.createServiceClient.mockReturnValue(serviceClientWith(recipient));
    });

    it("sends a heads-up email and stores nothing when there is no audio", async () => {
      const res = await POST(buildRequest({ simulated: "true" }));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toMatchObject({ ok: true, delivery: "email" });
      expect(mocks.storeNote).not.toHaveBeenCalled();
      expect(mocks.sendVoiceNoteEmail).toHaveBeenCalledWith(
        expect.objectContaining({ attachments: undefined })
      );
    });

    it("stores the note under the recipient and emails the MP3 with a listen link (no BCC)", async () => {
      const res = await POST(buildRequest({}, true));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body).toMatchObject({ ok: true, delivery: "in-app", id: "note-1" });
      expect(mocks.storeNote).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          ownerFolder: "recipient-1",
          senderId: "user-1",
          recipientId: "recipient-1",
          recipientName: "Mum",
        })
      );
      expect(mocks.sendVoiceNoteEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientEmail: "mom@example.com",
          bccSender: false,
          attachments: [expect.objectContaining({ filename: "hi_mom.mp3" })],
          inboxUrl: expect.stringContaining("/chats"),
        })
      );
      expect(mocks.sendNewNoteNotification).not.toHaveBeenCalled();
    });

    it("still succeeds in-app (no rollback) when the attachment email fails", async () => {
      mocks.sendVoiceNoteEmail.mockRejectedValue(new Error("smtp down"));
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      const res = await POST(buildRequest({}, true));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.delivery).toBe("in-app");
      expect(mocks.removeStoredNote).not.toHaveBeenCalled();
      warn.mockRestore();
    });
  });
});
