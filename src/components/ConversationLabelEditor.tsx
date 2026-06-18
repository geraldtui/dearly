"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { saveConversationLabel } from "@/lib/api";

/**
 * Hover-revealed pencil on a chat-list row that opens a small modal to rename a
 * contact (private nickname) and set how the user signs notes to them (alias).
 */
export default function ConversationLabelEditor({
  counterpartKey,
  nickname,
  alias,
}: {
  counterpartKey: string;
  nickname: string;
  alias: string;
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
      await saveConversationLabel({ counterpartKey, nickname: nick, alias: signAs });
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
    <div className="chat-label-wrap">
      <button type="button" className="chat-edit-btn" onClick={start} aria-label="Edit names" title="Edit names">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      </button>

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
    </div>
  );
}
