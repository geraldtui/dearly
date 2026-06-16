// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Recording } from "@/types";

const sendAccountNote = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({ sendAccountNote }));

// The real recorder needs MediaRecorder/AudioContext; stub it with a button
// that injects a fake recording.
vi.mock("@/components/VoiceRecorder", () => ({
  default: ({ onRecordingChange }: { onRecordingChange: (r: Recording) => void }) => (
    <button
      type="button"
      onClick={() =>
        onRecordingChange({
          blob: new Blob(["x"]),
          url: "blob:fake",
          mimeType: "audio/webm",
          duration: 5,
          bars: [0.5],
          simulated: false,
        })
      }
    >
      fake-record
    </button>
  ),
}));

import ComposeForm from "@/components/ComposeForm";

beforeEach(() => {
  vi.clearAllMocks();
  sendAccountNote.mockResolvedValue("email");
});

async function fillForm(user: ReturnType<typeof userEvent.setup>, { record = true } = {}) {
  await user.type(screen.getByLabelText("Their name"), "Mom");
  await user.type(screen.getByLabelText("Their email"), "mom@example.com");
  if (record) await user.click(screen.getByRole("button", { name: "fake-record" }));
}

describe("ComposeForm", () => {
  it("shows validation errors instead of sending when fields are missing", async () => {
    const user = userEvent.setup();
    render(<ComposeForm senderName="Gerald" />);

    await user.click(screen.getByRole("button", { name: /send with love/i }));

    expect(screen.getByText("Who is this for?")).toBeInTheDocument();
    expect(screen.getByText("Their email is needed")).toBeInTheDocument();
    expect(sendAccountNote).not.toHaveBeenCalled();
  });

  it("rejects a malformed email", async () => {
    const user = userEvent.setup();
    render(<ComposeForm senderName="Gerald" />);

    await user.type(screen.getByLabelText("Their email"), "nope");
    await user.click(screen.getByRole("button", { name: /send with love/i }));

    expect(screen.getByText("That email looks off")).toBeInTheDocument();
    expect(sendAccountNote).not.toHaveBeenCalled();
  });

  it("requires a recording before sending", async () => {
    const user = userEvent.setup();
    render(<ComposeForm senderName="Gerald" />);

    await fillForm(user, { record: false });
    await user.click(screen.getByRole("button", { name: /send with love/i }));

    expect(screen.getByText("Record a short message before sending.")).toBeInTheDocument();
    expect(sendAccountNote).not.toHaveBeenCalled();
  });

  it("shows the email-delivery success state with a Sent link", async () => {
    const user = userEvent.setup();
    render(<ComposeForm senderName="Gerald" />);

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /send with love/i }));

    expect(await screen.findByText("On its way.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sent notes" })).toHaveAttribute("href", "/sent");
    expect(sendAccountNote).toHaveBeenCalledWith(
      expect.objectContaining({ recipientName: "Mom", recipientEmail: "mom@example.com" })
    );
  });

  it("shows the in-app success copy when the recipient has Dearly", async () => {
    sendAccountNote.mockResolvedValue("in-app");
    const user = userEvent.setup();
    render(<ComposeForm senderName="Gerald" />);

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /send with love/i }));

    expect(await screen.findByText(/waiting in their inbox/)).toBeInTheDocument();
  });

  it("surfaces a send failure and stays on the form", async () => {
    sendAccountNote.mockRejectedValue(new Error("We couldn't send your note."));
    const user = userEvent.setup();
    render(<ComposeForm senderName="Gerald" />);

    await fillForm(user);
    await user.click(screen.getByRole("button", { name: /send with love/i }));

    expect(await screen.findByText("We couldn't send your note.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send with love/i })).toBeInTheDocument();
  });
});
