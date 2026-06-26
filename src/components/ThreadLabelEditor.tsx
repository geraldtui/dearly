"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { saveThreadLabel } from "@/lib/api";

/**
 * Clickable name in the voice note thread header that opens a modal to rename a
 * contact (private nickname), set how the user signs notes to them (alias),
 * and view the counterpart's email.
 */
export default function ThreadLabelEditor({
  counterpartKey,
  nickname,
  alias,
  email,
  displayName,
}: {
  counterpartKey: string;
  nickname: string;
  alias: string;
  email: string | null;
  displayName: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [nick, setNick] = useState(nickname);
  const [signAs, setSignAs] = useState(alias);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setMounted(true), []);

  const start = () => {
    setNick(nickname);
    setSignAs(alias);
    setError("");
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      await saveThreadLabel({ counterpartKey, nickname: nick, alias: signAs });
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't save that.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving]);

  return (
    <>
      <h1 className="chat-thread-name">
        <button
          type="button"
          className="chat-name-btn"
          onClick={start}
          aria-label={`Edit names for ${displayName}`}
          title="Click to edit names"
        >
          {displayName}
        </button>
      </h1>

      {open && mounted && createPortal(
        <div
          className="chat-label-overlay"
          role="presentation"
          onClick={() => {
            if (!saving) setOpen(false);
          }}
        >
        <div
          className="chat-label-editor"
          role="dialog"
          aria-modal="true"
          aria-label="Edit names"
          onClick={(e) => e.stopPropagation()}
        >
          {email && (
            <div className="field">
              <label>Email</label>
              <input
                value={email}
                readOnly
                disabled
                className="readonly-field"
              />
            </div>
          )}
          <div className="field">
            <label htmlFor="lbl-nick">Their name (only you see this)</label>
            <input
              id="lbl-nick"
              value={nick}
              placeholder="e.g. Mom"
              onChange={(e) => setNick(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="lbl-alias">Your name to them</label>
            <input
              id="lbl-alias"
              value={signAs}
              placeholder="e.g. Dad"
              onChange={(e) => setSignAs(e.target.value)}
              autoComplete="off"
            />
          </div>
          {error && <span className="err">{error}</span>}
          <div className="chat-label-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
        </div>,
        document.body
      )}
    </>
  );
}
