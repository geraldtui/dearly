"use client";

import type { Thread } from "@/lib/threads";

/** A thread plus the owner's saved label values for the inline editor. */
export type ThreadListItem = Thread & { nickname: string; alias: string };

const NEW_THREAD_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Left rail: one row per thread, newest activity first (WhatsApp-style). */
export default function ThreadList({
  threads,
  selectedKey,
  newMode,
  onSelectThread,
  onNewThread,
}: {
  threads: ThreadListItem[];
  selectedKey: string | null;
  newMode: boolean;
  onSelectThread: (key: string) => void;
  onNewThread: () => void;
}) {
  return (
    <aside className="chat-list" aria-label="Voice Notes">
      <div className="chat-list-header">
        <h2 className="chat-list-head">Voice Notes</h2>
        <button
          type="button"
          className="chat-new-btn"
          onClick={onNewThread}
          aria-label="New voice thread"
          title="New voice thread"
        >
          {NEW_THREAD_ICON}
        </button>
      </div>

      {threads.length === 0 ? (
        <p className="chat-list-empty">No voice notes yet.</p>
      ) : (
        <ul className="chat-items">
          {threads.map((c) => {
            const active = !newMode && c.key === selectedKey;
            return (
              <li key={c.key} className="chat-item-row">
                <button
                  type="button"
                  onClick={() => onSelectThread(c.key)}
                  className={`chat-item${active ? " active" : ""}`}
                  aria-current={active ? "true" : undefined}
                >
                  <span className="chat-item-avatar" aria-hidden="true">
                    {initial(c.name)}
                  </span>
                  <span className="chat-item-text">
                    <span className="chat-item-top">
                      <span className="chat-item-name">{c.name}</span>
                      <span className="chat-item-time">{dayLabel(c.lastAt)}</span>
                    </span>
                    <span className="chat-item-sub">
                      {c.viaEmail && <span className="chat-item-tag">via email</span>}
                      {c.count} note{c.count === 1 ? "" : "s"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
