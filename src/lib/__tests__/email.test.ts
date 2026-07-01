import { beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn());

vi.mock("nodemailer", () => ({
  default: { createTransport: () => ({ sendMail: sendMock }) },
  createTransport: () => ({ sendMail: sendMock }),
}));

import {
  escapeHtml,
  newNoteNotificationText,
  noteEmailHtml,
  noteEmailText,
  sendNewNoteNotification,
  senderFromAddress,
  sendVoiceNoteEmail,
} from "@/lib/email";

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({ messageId: "msg-1" });
});

describe("escapeHtml", () => {
  it("escapes all HTML-significant characters", () => {
    expect(escapeHtml(`<b>"Tom & Jerry's"</b>`)).toBe(
      "&lt;b&gt;&quot;Tom &amp; Jerry&#39;s&quot;&lt;/b&gt;"
    );
  });
});

describe("senderFromAddress", () => {
  it("uses the sender's first name as the display name", () => {
    expect(senderFromAddress("Gerald Tui")).toBe("Gerald <noreply@dearlyvoice.com>");
  });

  it("keeps a single-token nickname/alias intact", () => {
    expect(senderFromAddress("Dad")).toBe("Dad <noreply@dearlyvoice.com>");
  });

  it("falls back to the brand address when no name is given", () => {
    expect(senderFromAddress("")).toBe("Sona <noreply@dearlyvoice.com>");
    expect(senderFromAddress(undefined)).toBe("Sona <noreply@dearlyvoice.com>");
  });

  it("strips characters that could inject into the header", () => {
    expect(senderFromAddress('Eve" <evil@x.com>, X')).toBe("Eve <noreply@dearlyvoice.com>");
  });
});

describe("noteEmailHtml", () => {
  const base = {
    senderName: "Gerald",
    recipientName: "Mom",
    durationLabel: "0:42",
    hasAudio: true,
    simulated: false,
  };

  it("uses the sender's subject as the heading when provided", () => {
    const html = noteEmailHtml({ ...base, subject: "Happy Birthday" });
    expect(html).toContain("Happy Birthday");
    expect(html).not.toContain("Sona<span");
  });

  it("falls back to the Sona brand heading without a subject", () => {
    expect(noteEmailHtml(base)).toContain("Sona<span");
  });

  it("escapes user-provided values", () => {
    const html = noteEmailHtml({ ...base, senderName: "<script>x</script>" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("says the note is attached and names the sender when audio is present", () => {
    const html = noteEmailHtml(base);
    expect(html).toContain("New voice note from");
    expect(html).toContain("attached");
  });

  it("explains a simulated recording when audio is missing", () => {
    const html = noteEmailHtml({ ...base, hasAudio: false, simulated: true });
    expect(html).toContain("couldn&rsquo;t be captured");
  });

  it("adds a Listen on Sona CTA only when an inboxUrl is provided", () => {
    expect(noteEmailHtml(base)).not.toContain("Listen on Sona");
    const html = noteEmailHtml({ ...base, inboxUrl: "https://dearlyvoice.com/inbox" });
    expect(html).toContain("Listen on Sona");
    expect(html).toContain("https://dearlyvoice.com/inbox");
  });
});

describe("noteEmailText", () => {
  it("leads with the subject when provided", () => {
    const text = noteEmailText({
      senderName: "Gerald",
      recipientName: "Mom",
      hasAudio: true,
      subject: "Happy Birthday",
    });
    expect(text.startsWith("Happy Birthday")).toBe(true);
    expect(text).toContain("New voice note from Gerald attached.");
  });

  it("includes the Sona listen link when an inboxUrl is provided", () => {
    const text = noteEmailText({
      senderName: "Gerald",
      recipientName: "Mom",
      hasAudio: true,
      inboxUrl: "https://dearlyvoice.com/inbox",
    });
    expect(text).toContain("Listen on Sona: https://dearlyvoice.com/inbox");
  });
});

describe("newNoteNotificationText", () => {
  it("includes the sender line, subject, and inbox link", () => {
    const text = newNoteNotificationText({
      senderName: "Gerald",
      recipientName: "Mom",
      subject: "Hi Mom",
      inboxUrl: "https://dearlyvoice.com/inbox",
    });
    expect(text).toContain("Hi Mom");
    expect(text).toContain("New voice note from Gerald.");
    expect(text).toContain("Listen on Sona: https://dearlyvoice.com/inbox");
  });
});

const emailOpts = {
  senderName: "Gerald",
  senderEmail: "gerald@example.com",
  recipientName: "Mom",
  recipientEmail: "mom@example.com",
  subject: "Hi Mom",
  durationLabel: "0:42",
  simulated: false,
};

describe("sendVoiceNoteEmail", () => {
  it("does not BCC the sender by default and returns the provider id", async () => {
    const id = await sendVoiceNoteEmail(emailOpts);
    expect(id).toBe("msg-1");
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Gerald <noreply@dearlyvoice.com>",
        to: "mom@example.com",
        bcc: undefined,
        replyTo: "gerald@example.com",
        subject: "Hi Mom",
      })
    );
  });

  it("BCCs the sender when bccSender is true", async () => {
    await sendVoiceNoteEmail({ ...emailOpts, bccSender: true });
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ bcc: "gerald@example.com" })
    );
  });

  it("uses the default subject when none is provided", async () => {
    await sendVoiceNoteEmail({ ...emailOpts, subject: "" });
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "Gerald sent you a voice note on Sona" })
    );
  });

  it("throws when the provider reports an error", async () => {
    sendMock.mockRejectedValue(new Error("rate limited"));
    await expect(sendVoiceNoteEmail(emailOpts)).rejects.toThrow("rate limited");
  });
});

describe("sendNewNoteNotification", () => {
  const notifyOpts = {
    recipientEmail: "mom@example.com",
    senderName: "Gerald",
    senderEmail: "gerald@example.com",
    recipientName: "Mom",
    subject: "Hi Mom",
    inboxUrl: "https://dearlyvoice.com/inbox",
  };

  it("does not BCC the sender by default", async () => {
    await sendNewNoteNotification(notifyOpts);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Gerald <noreply@dearlyvoice.com>",
        bcc: undefined,
      })
    );
  });

  it("BCCs the free sender when requested", async () => {
    await sendNewNoteNotification({ ...notifyOpts, bccSender: true });
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ bcc: "gerald@example.com" })
    );
  });

  it("throws when the provider reports an error", async () => {
    sendMock.mockRejectedValue(new Error("bad address"));
    await expect(sendNewNoteNotification(notifyOpts)).rejects.toThrow("bad address");
  });
});
