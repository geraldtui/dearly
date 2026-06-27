"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "dearly:notepad";
const HINT_KEY = "dearly:notepad-hint";

/**
 * A private, temporary scratchpad for jotting thoughts before recording.
 * Hidden behind a floating button, overlays the screen without reflowing the
 * compose card, and persists its text in localStorage. Never sent in the email.
 * A one-time dismissable hint introduces the feature to new users.
 */
export default function Notepad({ inline = false }: { inline?: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [hydrated, setHydrated] = useState(false);
  // Default dismissed so the hint never flashes during hydration; revealed
  // after mount only if the user hasn't dismissed it before.
  const [hintDismissed, setHintDismissed] = useState(true);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setText(saved);
      setHintDismissed(localStorage.getItem(HINT_KEY) === "1");
    } catch {
      /* localStorage unavailable — fall back to in-memory only */
      setHintDismissed(false);
    }
    setHydrated(true);
  }, []);

  const dismissHint = () => {
    setHintDismissed(true);
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      /* ignore persistence failures */
    }
  };

  const toggleOpen = () => {
    setOpen((o) => !o);
    if (!hintDismissed) dismissHint();
  };

  const showHint = hydrated && !hintDismissed && !open && process.env.NEXT_PUBLIC_E2E !== "true";

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (text) localStorage.setItem(STORAGE_KEY, text);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore persistence failures */
    }
  }, [text, hydrated]);

  useEffect(() => {
    if (open) areaRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={inline ? "notepad-inline" : "notepad-floating"}>
      {showHint && !inline && (
        <div className="notepad-callout" role="status">
          <button type="button" className="notepad-callout-body" onClick={toggleOpen}>
            <span className="spark" />
            <span>
              <b>New —</b> jot your thoughts here before recording. Private notes, never sent.
            </span>
          </button>
          <button type="button" className="notepad-callout-x" onClick={dismissHint} aria-label="Dismiss notepad tip">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      )}

      <button
        type="button"
        className="notepad-fab"
        onClick={toggleOpen}
        aria-expanded={open}
        aria-label={open ? "Close notepad" : "Open notepad"}
      >
        {showHint && <span className="notepad-dot" aria-hidden="true" />}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 3h11a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6" />
          <path d="M6 3v18" />
          <path d="M3 7h3" />
          <path d="M3 12h3" />
          <path d="M3 17h3" />
          <path d="M10 8h6" />
          <path d="M10 12h6" />
          <path d="M10 16h3" />
        </svg>
      </button>

      {open && (
        <div className="notepad-panel" role="dialog" aria-modal="false" aria-label="Notepad">
          <div className="notepad-head">
            <span className="notepad-title">Jot your thoughts</span>
            <button type="button" className="notepad-close" onClick={() => setOpen(false)} aria-label="Close notepad">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          <textarea
            ref={areaRef}
            className="notepad-area"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Notes just for you — these aren't sent."
          />

          <div className="notepad-foot">
            <span className="notepad-hint">Saved on this device</span>
            <button type="button" className="notepad-clear" onClick={() => setText("")} disabled={!text}>
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
