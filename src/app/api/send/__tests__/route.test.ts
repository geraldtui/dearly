import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  sendVoiceNoteEmail: vi.fn(),
  sendNewNoteNotification: vi.fn(),
  storeNote: vi.fn(),
  removeStoredNote: vi.fn(),
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendVoiceNoteEmail: mocks.sendVoiceNoteEmail,
  sendNewNoteNotification: mocks.sendNewNoteNotification,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: mocks.createServiceClient,
}));

// Keep the real sanitizers but shrink the audio cap so the 413 test doesn't
// need a 20MB buffer, and stub the storage helpers.
vi.mock("@/lib/notes", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/notes")>();
  return {
    ...actual,
    MAX_AUDIO_BYTES: 1024,
    storeNote: mocks.storeNote,
    removeStoredNote: mocks.removeStoredNote,
  };
});

import { POST } from "../route";
import { __resetRateLimit } from "@/lib/rate-limit";

interface Recipient {
  id: string;
  email: string;
  display_name: string | null;
}

/** Service client whose profiles lookup resolves to the given recipient. */
function serviceClientWith(recipient: Recipient | null) {
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

function buildRequest(overrides: Record<string, string | null> = {}, audioBytes?: number): NextRequest {
  const fields: Record<string, string | null> = {
    senderName: "Gerald",
    senderEmail: "gerald@example.com",
    recipientName: "Mom",
    recipientEmail: "Mom@Example.com",
    subject: "Hi Mom",
    durationSeconds: "42",
    simulated: "false",
    ...overrides,
  };
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== null) fd.append(key, value);
  }
  if (audioBytes !== undefined) {
    fd.append("audio", new File([new Uint8Array(audioBytes)], "note.mp3", { type: "audio/mpeg" }));
  }
  return new Request("http://localhost/api/send", { method: "POST", body: fd }) as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  __resetRateLimit();
  mocks.sendVoiceNoteEmail.mockResolvedValue("msg-1");
  mocks.sendNewNoteNotification.mockResolvedValue(undefined);
  mocks.storeNote.mockResolvedValue({ id: "note-1", storagePath: "recipient-1/note-1.mp3" });
  mocks.removeStoredNote.mockResolvedValue(undefined);
  mocks.createServiceClient.mockReturnValue(serviceClientWith(null));
});

describe("POST /api/send", () => {
  it("rejects missing names with 400", async () => {
    const res = await POST(buildRequest({ senderName: null }));
    expect(res.status).toBe(400);
    expect(mocks.sendVoiceNoteEmail).not.toHaveBeenCalled();
  });

  it("rejects invalid email addresses with 400", async () => {
    const res = await POST(buildRequest({ recipientEmail: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("rejects oversized audio with 413", async () => {
    const res = await POST(buildRequest({}, 2048));
    expect(res.status).toBe(413);
    expect(mocks.sendVoiceNoteEmail).not.toHaveBeenCalled();
  });

  it("emails the attachment when the recipient has no Dearly account", async () => {
    const res = await POST(buildRequest({}, 64));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, delivery: "email", id: "msg-1" });
    expect(mocks.storeNote).not.toHaveBeenCalled();
    expect(mocks.sendVoiceNoteEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: "Mom@Example.com",
        subject: "Hi Mom",
        durationLabel: "0:42",
        attachments: [expect.objectContaining({ filename: "note.mp3" })],
      })
    );
    // Public sends keep the default sender BCC.
    expect(mocks.sendVoiceNoteEmail.mock.calls[0][0].bccSender).toBeUndefined();
  });

  it("skips the account lookup and sends an audio-less email for simulated recordings", async () => {
    const res = await POST(buildRequest({ simulated: "true" }));
    expect(res.status).toBe(200);
    expect(mocks.createServiceClient).not.toHaveBeenCalled();
    expect(mocks.sendVoiceNoteEmail).toHaveBeenCalledWith(
      expect.objectContaining({ simulated: true, attachments: undefined })
    );
  });

  it("delivers in-app when the recipient is registered, BCCing the free sender", async () => {
    const recipient = { id: "recipient-1", email: "mom@example.com", display_name: "Mum" };
    mocks.createServiceClient.mockReturnValue(serviceClientWith(recipient));

    const res = await POST(buildRequest({}, 64));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, delivery: "in-app", id: "note-1" });
    expect(mocks.storeNote).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        ownerFolder: "recipient-1",
        senderId: null, // free sender has no account
        recipientId: "recipient-1",
        recipientName: "Mum",
      })
    );
    expect(mocks.sendNewNoteNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientEmail: "mom@example.com",
        bccSender: true,
        inboxUrl: "http://localhost/chats",
      })
    );
    expect(mocks.sendVoiceNoteEmail).not.toHaveBeenCalled();
  });

  it("rolls back the stored note and returns 500 when the notification fails", async () => {
    mocks.createServiceClient.mockReturnValue(
      serviceClientWith({ id: "recipient-1", email: "mom@example.com", display_name: "Mum" })
    );
    mocks.sendNewNoteNotification.mockRejectedValue(new Error("smtp down"));

    const res = await POST(buildRequest({}, 64));

    expect(res.status).toBe(500);
    expect(mocks.removeStoredNote).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: "note-1" })
    );
  });

  it("falls back to email when Supabase is unavailable", async () => {
    mocks.createServiceClient.mockImplementation(() => {
      throw new Error("not configured");
    });

    const res = await POST(buildRequest({}, 64));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.delivery).toBe("email");
    expect(mocks.sendVoiceNoteEmail).toHaveBeenCalled();
  });

  it("rate-limits a burst from one IP with 429 and a Retry-After header", async () => {
    for (let i = 0; i < 5; i++) {
      expect((await POST(buildRequest())).status).toBe(200);
    }
    const limited = await POST(buildRequest());
    expect(limited.status).toBe(429);
    expect(limited.headers.get("Retry-After")).toBeTruthy();
  });
});
