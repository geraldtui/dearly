"use client";

import { useState } from "react";
import Link from "next/link";
import VoiceRecorder from "@/components/VoiceRecorder";
import { emailOk } from "@/lib/validation";
import { sendAccountNote, type NoteDelivery } from "@/lib/api";
import type { Recording } from "@/types";

type Status = "idle" | "sending" | "sent";

/** Authenticated compose: recipient by email; server decides in-app vs email delivery. */
export default function ComposeForm({ senderName }: { senderName: string }) {
  const [rName, setRName] = useState("");
  const [rEmail, setREmail] = useState("");
  const [subject, setSubject] = useState("");
  const [recording, setRecording] = useState<Recording | null>(null);
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [delivery, setDelivery] = useState<NoteDelivery>("email");
  const [sendError, setSendError] = useState("");

  const errors = {
    rName: rName.trim() ? "" : "Who is this for?",
    rEmail: !rEmail.trim() ? "Their email is needed" : emailOk(rEmail) ? "" : "That email looks off",
  };
  const canSend = !errors.rName && !errors.rEmail && !!recording;

  const send = async () => {
    setTouched(true);
    if (!canSend || status === "sending") return;
    setSendError("");
    setStatus("sending");
    try {
      setDelivery(await sendAccountNote({ recipientName: rName, recipientEmail: rEmail, subject, recording }));
      setStatus("sent");
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "We couldn't send your note. Please try again.");
      setStatus("idle");
    }
  };

  const reset = () => {
    if (recording?.url) URL.revokeObjectURL(recording.url);
    setRName("");
    setREmail("");
    setSubject("");
    setRecording(null);
    setTouched(false);
    setStatus("idle");
    setSendError("");
  };

  if (status === "sent") {
    return (
      <div className="success">
        <div className="seal">
          <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 7.5 12 13l8-5.5" />
            <rect x="3" y="5" width="18" height="14" rx="3" />
          </svg>
        </div>
        <h2>On its way.</h2>
        <p>
          {delivery === "in-app" ? (
            <>
              <b>{rName}</b> has Dearly — we emailed them the recording and it&rsquo;s waiting in their inbox. A copy is
              saved in your{" "}
              <Link href="/sent" className="foot-link">
                Sent notes
              </Link>
              .
            </>
          ) : (
            <>
              Your voice note is on its way to <b>{rName}</b> at <b>{rEmail}</b> by email. A copy is saved in your{" "}
              <Link href="/sent" className="foot-link">
                Sent notes
              </Link>
              .
            </>
          )}
        </p>
        <button className="record-again" onClick={reset}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9a9 9 0 1 1-2 5.5" />
            <path d="M3 4v5h5" />
          </svg>
          Send another note
        </button>
        <p className="foot">
          <Link className="foot-link" href="/inbox">
            Back to your inbox
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="brand-row">
        <h1 className="brand compose-brand">Send a note</h1>
        <p className="tagline">From {senderName}, with love.</p>
        <div className="divider" />
      </div>

      <div className="section-label">To your dear one</div>
      <div className="grid-2">
        <div className="field">
          <label htmlFor="rName">Their name</label>
          <input id="rName" value={rName} placeholder="Mom" onChange={(e) => setRName(e.target.value)} className={touched && errors.rName ? "invalid" : ""} autoComplete="off" />
          <span className="err">{touched && errors.rName ? errors.rName : ""}</span>
        </div>
        <div className="field">
          <label htmlFor="rEmail">Their email</label>
          <input id="rEmail" type="email" value={rEmail} placeholder="them@email.com" onChange={(e) => setREmail(e.target.value)} className={touched && errors.rEmail ? "invalid" : ""} autoComplete="off" />
          <span className="err">{touched && errors.rEmail ? errors.rEmail : ""}</span>
        </div>
      </div>

      <div className="field">
        <label htmlFor="subject">Subject (optional)</label>
        <input id="subject" value={subject} placeholder="Thinking of you" onChange={(e) => setSubject(e.target.value)} autoComplete="off" />
        <span className="err"></span>
      </div>

      <VoiceRecorder recording={recording} onRecordingChange={setRecording} />

      {touched && !recording && (
        <div className="err" style={{ textAlign: "center", marginTop: -10, marginBottom: 14 }}>
          Record a short message before sending.
        </div>
      )}
      {sendError && (
        <div className="err" style={{ textAlign: "center", marginTop: -6, marginBottom: 14 }}>
          {sendError}
        </div>
      )}

      <button className="btn btn-primary" onClick={send} disabled={status === "sending"}>
        {status === "sending" ? (
          <span className="sending">
            <span className="spinner" /> Sending…
          </span>
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2 11 13" />
              <path d="M22 2 15 22l-4-9-9-4z" />
            </svg>{" "}
            Send with love
          </>
        )}
      </button>
    </>
  );
}
