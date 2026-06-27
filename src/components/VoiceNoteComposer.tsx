"use client";

import { useState } from "react";
import VoiceRecorder from "@/components/VoiceRecorder";
import Notepad from "@/components/Notepad";
import { emailOk } from "@/lib/validation";
import { sendAccountNote } from "@/lib/api";
import type { Recording } from "@/types";

interface VoiceNoteComposerProps {
  mode: "reply" | "new";
  /** Reply mode: the resolved counterpart to send to. */
  recipientName?: string;
  recipientEmail?: string | null;
  /** Reply mode: false when the thread has no account/email to reply to. */
  canReply?: boolean;
  /** Callback invoked after successful send. */
  onSendSuccess: () => void;
}

/** Inline recorder + send for a voice note thread (or a new note). */
export default function VoiceNoteComposer({
  mode,
  recipientName = "",
  recipientEmail = null,
  canReply = true,
  onSendSuccess,
}: VoiceNoteComposerProps) {
  const [recording, setRecording] = useState<Recording | null>(null);
  const [subject, setSubject] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [alias, setAlias] = useState("");
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  if (mode === "reply" && !canReply) {
    return (
      <div className="chat-composer disabled">
        <p className="chat-composer-hint">
          You can&rsquo;t reply here — this note came from a guest with no Dearly account or saved email.
        </p>
      </div>
    );
  }

  const fieldErrors = {
    name: name.trim() ? "" : "Who is this for?",
    email: !email.trim() ? "Their email is needed" : emailOk(email) ? "" : "That email looks off",
  };
  const detailsOk = mode === "reply" || (!fieldErrors.name && !fieldErrors.email);
  const canSend = detailsOk && !!recording && !sending;

  const send = async () => {
    setTouched(true);
    if (!canSend) return;
    const toName = mode === "new" ? name.trim() : recipientName;
    const toEmail = mode === "new" ? email.trim() : recipientEmail ?? "";
    // For new notes, email is required. For replies, email validation is handled server-side.
    if (mode === "new" && !emailOk(toEmail)) {
      setError("That email looks off.");
      return;
    }
    setError("");
    setSending(true);
    try {
      await sendAccountNote({
        recipientName: toName,
        recipientEmail: toEmail,
        subject,
        alias: mode === "new" ? alias.trim() || undefined : undefined,
        recording,
      });
      if (recording?.url) URL.revokeObjectURL(recording.url);
      setRecording(null);
      setSubject("");
      setAlias("");
      setName("");
      setEmail("");
      setTouched(false);
      onSendSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't send your note. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-composer">
      {mode === "new" && (
        <div className="chat-new-fields">
          <div className="field">
            <input
              aria-label="Their name"
              value={name}
              placeholder="Their name"
              onChange={(e) => setName(e.target.value)}
              className={touched && fieldErrors.name ? "invalid" : ""}
              autoComplete="off"
            />
            <span className="err">{touched ? fieldErrors.name : ""}</span>
          </div>
          <div className="field">
            <input
              aria-label="Their email"
              type="email"
              value={email}
              placeholder="them@email.com"
              onChange={(e) => setEmail(e.target.value)}
              className={touched && fieldErrors.email ? "invalid" : ""}
              autoComplete="off"
            />
            <span className="err">{touched ? fieldErrors.email : ""}</span>
          </div>
          <div className="field chat-new-alias">
            <input
              aria-label="Your name to them (optional)"
              value={alias}
              placeholder="Your name to them, e.g. Dad (optional)"
              onChange={(e) => setAlias(e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
      )}

      <div className="chat-subject-row">
        <div className="field chat-subject">
          <input
            aria-label="Subject (optional)"
            value={subject}
            placeholder="Subject (optional)"
            onChange={(e) => setSubject(e.target.value)}
            autoComplete="off"
          />
        </div>
        <Notepad inline />
      </div>

      <div className="chat-recorder-row">
        <VoiceRecorder recording={recording} onRecordingChange={setRecording} />
        <button
          type="button"
          className="chat-send-btn"
          onClick={send}
          disabled={sending || !recording}
          aria-label="Send voice note"
          title="Send voice note"
        >
          {sending ? (
            <span className="spinner" />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2 11 13" />
              <path d="M22 2 15 22l-4-9-9-4z" />
            </svg>
          )}
        </button>
      </div>

      {touched && !recording && <div className="err chat-composer-err">Record a message before sending.</div>}
      {error && <div className="err chat-composer-err">{error}</div>}
    </div>
  );
}
