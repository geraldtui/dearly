"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { FEATURES, FEAT_ICON } from "./icons";

/** What Sona can do today — each shown in the showcase modal. */
const EXISTING: { icon: React.ReactNode; t: string; d: string }[] = [
  {
    t: "Record in your browser",
    d: "Tap once and capture up to five minutes of voice. Nothing to download.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="2.5" width="6" height="11" rx="3" />
        <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
        <line x1="12" y1="17.5" x2="12" y2="21" />
        <line x1="8.5" y1="21" x2="15.5" y2="21" />
      </svg>
    ),
  },
  {
    t: "Send to any inbox",
    d: "We deliver your note as an MP3 email — with your own subject line — to anyone.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    ),
  },
  {
    t: "Keep them in Sona",
    d: "With a free account, notes you send and receive live in tidy chats — out of your email.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.8-.8L3 20.5l1.9-4.2A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5Z" />
      </svg>
    ),
  },
  {
    t: "Reply back and forth",
    d: "Hold a real conversation — every voice note in a chat is replyable.",
    icon: FEAT_ICON.reply,
  },
];

export default function Waitlist({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>

        <p className="modal-eyebrow">Why Sona</p>
        <h2 className="modal-title">Everything you can do today.</h2>
        <p className="modal-sub">
          A heartfelt voice note in seconds — free, no app to install. Sign up to keep every note in one place.
        </p>

        <div className="feature-list">
          {EXISTING.map((f) => (
            <div className="feature" key={f.t}>
              <div className="fi">{f.icon}</div>
              <div className="ft">
                <h4>{f.t}</h4>
                <p>{f.d}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="wl-cta">
          <Link href="/signup" className="btn btn-primary wl-cta-btn">
            Sign up free
          </Link>
          <Link href="/login" className="wl-cta-login">
            Already have an account? Log in
          </Link>
        </div>

        <div className="wl-soon">
          <p className="wl-soon-head">On the way</p>
          <div className="wl-soon-list">
            {FEATURES.map((f) => (
              <div className="wl-soon-item" key={f.k}>
                <span className="wl-soon-ic">{FEAT_ICON[f.k]}</span>
                <span className="wl-soon-text">
                  <b>{f.t}</b> — {f.d}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
