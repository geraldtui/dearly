"use client";

import React, { useState } from "react";
import VoiceRecorder from "@/components/VoiceRecorder";
import Waitlist from "@/components/Waitlist";
import Logo from "@/components/Logo";
import Notepad from "@/components/Notepad";
import PublicNav from "@/components/PublicNav";
import SignupPromoCard from "@/components/SignupPromoCard";
import SignupPopover from "@/components/SignupPopover";
import { emailOk } from "@/lib/validation";
import { sendNote } from "@/lib/api";
import type { Recording } from "@/types";

function Field({
  id,
  label,
  type,
  value,
  placeholder,
  onChange,
  onFocus,
  error,
  show,
  children,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
  onFocus?: () => void;
  error: string;
  show: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type || "text"}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        className={show && error ? "invalid" : ""}
        autoComplete="off"
      />
      <span className="err">{show && error ? error : ""}</span>
      {children}
    </div>
  );
}

type Status = "idle" | "sending" | "sent";
type FormState = { sName: string; sEmail: string; rName: string; rEmail: string; subject: string };

export default function App() {
  const [form, setForm] = useState<FormState>({ sName: "", sEmail: "", rName: "", rEmail: "", subject: "" });
  const [recording, setRecording] = useState<Recording | null>(null);
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [sendError, setSendError] = useState("");
  const [waitlist, setWaitlist] = useState(false);
  const [popAnchor, setPopAnchor] = useState<"sEmail" | "rEmail" | null>(null);
  const set = (k: keyof FormState) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const anchorPop = (field: "sEmail" | "rEmail") => () => setPopAnchor((a) => a ?? field);

  const errors = {
    sName: form.sName.trim() ? "" : "Please add your name",
    sEmail: !form.sEmail.trim() ? "Your email is needed" : emailOk(form.sEmail) ? "" : "That email looks off",
    rName: form.rName.trim() ? "" : "Who is this for?",
    rEmail: !form.rEmail.trim() ? "Their email is needed" : emailOk(form.rEmail) ? "" : "That email looks off",
  };
  const formValid = Object.values(errors).every((e) => !e);
  const canSend = formValid && !!recording;

  const send = async () => {
    setTouched(true);
    if (!canSend || status === "sending") return;
    setSendError("");
    setStatus("sending");
    try {
      await sendNote({
        senderName: form.sName,
        senderEmail: form.sEmail,
        recipientName: form.rName,
        recipientEmail: form.rEmail,
        subject: form.subject,
        recording,
      });
      setStatus("sent");
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "We couldn't send your note. Please try again.");
      setStatus("idle");
    }
  };

  const reset = () => {
    if (recording?.url) URL.revokeObjectURL(recording.url);
    setForm({ sName: "", sEmail: "", rName: "", rEmail: "", subject: "" });
    setRecording(null);
    setTouched(false);
    setStatus("idle");
    setSendError("");
  };

  return (
    <div className="stage">
      <div className="orb a" />
      <div className="orb b" />

      <PublicNav />

      <main className="card">
        {status === "sent" ? (
          <div className="success">
            <div className="seal">
              <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7.5 12 13l8-5.5" />
                <rect x="3" y="5" width="18" height="14" rx="3" />
              </svg>
            </div>
            <h2>On its way.</h2>
            <p>
              Your voice note is on its way to <b>{form.rName}</b>. They&rsquo;ll hear it at <b>{form.rEmail}</b> in a moment.
            </p>

            <SignupPromoCard onExplore={() => setWaitlist(true)} />

            <button className="record-again" onClick={reset}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9a9 9 0 1 1-2 5.5" />
                <path d="M3 4v5h5" />
              </svg>
              Record another note
            </button>
          </div>
        ) : (
          <>
            <div className="brand-row">
              <Logo className="brand-mark" title="" />
              <h1 className="brand">
                Dearly<span className="dot">.</span>
              </h1>
              <p className="tagline"></p>
              <div className="preview-pill">
                <span className="spark" />
                Early preview
              </div>
              <div className="divider" />
            </div>

            <div className="section-label">From you</div>
            <div className="grid-2">
              <Field id="sName" label="Your name" value={form.sName} placeholder="Eleanor" onChange={set("sName")} error={errors.sName} show={touched} />
              <Field id="sEmail" label="Your email" type="email" value={form.sEmail} placeholder="you@email.com" onChange={set("sEmail")} onFocus={anchorPop("sEmail")} error={errors.sEmail} show={touched}>
                {popAnchor === "sEmail" && <SignupPopover />}
              </Field>
            </div>

            <div className="section-label">To your dear one</div>
            <div className="grid-2">
              <Field id="rName" label="Their name" value={form.rName} placeholder="Mom" onChange={set("rName")} error={errors.rName} show={touched} />
              <Field id="rEmail" label="Their email" type="email" value={form.rEmail} placeholder="them@email.com" onChange={set("rEmail")} onFocus={anchorPop("rEmail")} error={errors.rEmail} show={touched}>
                {popAnchor === "rEmail" && <SignupPopover />}
              </Field>
            </div>

            <Field id="subject" label="Subject (optional)" value={form.subject} placeholder="Thinking of you" onChange={set("subject")} error="" show={false} />

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

            <p className="foot">
              Made with <span className="heart">♥</span> —{" "}
              <button className="foot-link" onClick={() => setWaitlist(true)}>
                see what&rsquo;s coming to Dearly
              </button>
            </p>
          </>
        )}
      </main>

      {status !== "sent" && <Notepad />}

      {waitlist && <Waitlist defaultEmail={form.sEmail} onClose={() => setWaitlist(false)} />}
    </div>
  );
}
