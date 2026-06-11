"use client";

import React, { useEffect, useState } from "react";
import { FEATURES, FEAT_ICON } from "./icons";
import { emailOk } from "@/lib/validation";
import { joinWaitlist } from "@/lib/api";

export default function Waitlist({
  defaultEmail,
  onClose,
}: {
  defaultEmail?: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState(defaultEmail || "");
  const [touched, setTouched] = useState(false);
  const [joined, setJoined] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [sendError, setSendError] = useState("");

  const err = !email.trim() ? "Pop in your email to join" : emailOk(email) ? "" : "That email looks off";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const join = async () => {
    setTouched(true);
    if (err || submitting) return;
    setSubmitting(true);
    setSendError("");
    try {
      await joinWaitlist(email, "modal");
      setJoined(true);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>

        {joined ? (
          <div className="wl-joined">
            <div className="seal">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5 10 17l9-10" />
              </svg>
            </div>
            <h3>You&rsquo;re on the list.</h3>
            <p>
              We&rsquo;ll write to <b style={{ color: "var(--ink)" }}>{email}</b> the moment these arrive. Thank you for being early.
            </p>
            <button className="btn btn-primary" style={{ maxWidth: 220, margin: "0 auto" }} onClick={onClose}>
              Back to Dearly
            </button>
          </div>
        ) : (
          <>
            <p className="modal-eyebrow">The road ahead</p>
            <h2 className="modal-title">Dearly is just beginning.</h2>
            <p className="modal-sub">
              You&rsquo;re using an early preview. Join the list and we&rsquo;ll let you know the moment these land:
            </p>

            <div className="feature-list">
              {FEATURES.map((f) => (
                <div className="feature" key={f.k}>
                  <div className="fi">{FEAT_ICON[f.k]}</div>
                  <div className="ft">
                    <h4>{f.t}</h4>
                    <p>{f.d}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="wl-form">
              <input
                type="email"
                value={email}
                placeholder="you@email.com"
                onChange={(e) => setEmail(e.target.value)}
                className={touched && err ? "invalid" : ""}
                onKeyDown={(e) => e.key === "Enter" && join()}
              />
              <button className="btn btn-primary" onClick={join} disabled={submitting}>
                {submitting ? (
                  <span className="sending">
                    <span className="spinner" /> Joining…
                  </span>
                ) : (
                  "Notify me"
                )}
              </button>
            </div>
            <div className="wl-err">{(touched && err) || sendError}</div>
            <p className="wl-fine">No spam, ever — just one gentle note when something new is ready.</p>
          </>
        )}
      </div>
    </div>
  );
}
