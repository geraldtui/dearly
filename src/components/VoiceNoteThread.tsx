"use client";

import { useState, useRef, useEffect } from "react";
import NotePlayer from "@/components/NotePlayer";
import VoiceNoteComposer from "@/components/VoiceNoteComposer";
import ThreadLabelEditor from "@/components/ThreadLabelEditor";
import type { ThreadMessage } from "@/lib/threads";

export interface ThreadCounterpart {
  key: string;
  name: string;
  email: string | null;
  viaEmail: boolean;
  canReply: boolean;
  nickname: string;
  alias: string;
}

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function duration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function timestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** A single voice-note message bubble with playback and delete. */
function MessageBubble({
  msg,
  onDeleteSuccess,
}: {
  msg: ThreadMessage;
  onDeleteSuccess: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const unlistened = !msg.outgoing && !msg.listened_at;

  const remove = async () => {
    if (deleting) return;
    setError("");
    setDeleting(true);
    try {
      const res = await fetch(`/api/notes/${msg.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("We couldn't delete that note.");
      onDeleteSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setDeleting(false);
    }
  };

  return (
    <div className={`msg ${msg.outgoing ? "out" : "in"}`}>
      <div className="msg-bubble">
        <NotePlayer noteId={msg.id} refreshOnPlay={unlistened} />
        <div className="msg-body">
          {msg.subject && <span className="msg-subject">{msg.subject}</span>}
          <span className="msg-time">
            {duration(msg.duration_seconds)} · {timestamp(msg.created_at)}
          </span>
          {error && <span className="err">{error}</span>}
        </div>
        <button
          type="button"
          className="msg-delete"
          onClick={remove}
          disabled={deleting}
          aria-label="Delete note"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/** Middle pane: thread timeline + inline composer, or the new-note / empty states. */
export default function VoiceNoteThread({
  mode,
  messages,
  counterpart,
  onSendSuccess,
  onDeleteSuccess,
  onNewNote,
  onBack,
}: {
  mode: "thread" | "new" | "empty";
  messages: ThreadMessage[];
  counterpart: ThreadCounterpart | null;
  onSendSuccess: () => void;
  onDeleteSuccess: () => void;
  onNewNote: () => void;
  onBack?: () => void;
}) {
  const threadRef = useRef<HTMLElement>(null);

  // Swipe gesture handling for mobile back navigation
  useEffect(() => {
    if (!onBack) return;

    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    const leftEdgeThreshold = typeof window !== "undefined" ? window.innerWidth * 0.2 : 100;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartTime = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      const deltaTime = Date.now() - touchStartTime;

      // Check if swipe started from left edge, moved right, and was primarily horizontal
      if (
        touchStartX <= leftEdgeThreshold &&
        deltaX > 50 &&
        Math.abs(deltaY) < Math.abs(deltaX) &&
        deltaTime < 300
      ) {
        onBack();
      }
    };

    const element = threadRef.current;
    if (element) {
      element.addEventListener("touchstart", handleTouchStart);
      element.addEventListener("touchend", handleTouchEnd);
      return () => {
        element.removeEventListener("touchstart", handleTouchStart);
        element.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [onBack]);

  if (mode === "empty") {
    return (
      <section className="chat-thread chat-thread-empty">
        <div className="chat-empty">
          <h1>No voice notes yet</h1>
          <p>Send your first voice note to get started.</p>
          <button className="btn btn-primary" onClick={onNewNote}>
            New voice note
          </button>
        </div>
      </section>
    );
  }

  if (mode === "new" || !counterpart) {
    return (
      <section ref={threadRef} className="chat-thread">
        <header className="chat-thread-head">
          {onBack && (
            <button 
              type="button" 
              className="chat-thread-back" 
              onClick={onBack}
              aria-label="Back to thread list"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5" />
                <path d="M12 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <span className="chat-avatar new" aria-hidden="true">
            +
          </span>
          <div className="chat-thread-id">
            <h1 className="chat-thread-name">New voice note</h1>
            <span className="chat-thread-sub">Record a voice note and send it to someone.</span>
          </div>
        </header>
        <div className="chat-scroll chat-scroll-empty">
          <p className="chat-hint">Your thread will appear here.</p>
        </div>
        <VoiceNoteComposer mode="new" onSendSuccess={onSendSuccess} />
      </section>
    );
  }

  return (
    <section ref={threadRef} className="chat-thread">
      <header className="chat-thread-head">
        {onBack && (
          <button 
            type="button" 
            className="chat-thread-back" 
            onClick={onBack}
            aria-label="Back to thread list"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <span className="chat-avatar" aria-hidden="true">
          {initial(counterpart.name)}
        </span>
        <div className="chat-thread-id">
          <ThreadLabelEditor
            counterpartKey={counterpart.key}
            nickname={counterpart.nickname}
            alias={counterpart.alias}
            email={counterpart.email}
            displayName={counterpart.name}
          />
          {counterpart.viaEmail && <span className="chat-thread-sub">via email</span>}
        </div>
      </header>

      <div className="chat-scroll">
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} onDeleteSuccess={onDeleteSuccess} />
        ))}
      </div>

      <VoiceNoteComposer
        mode="reply"
        recipientName={counterpart.name}
        recipientEmail={counterpart.email}
        canReply={counterpart.canReply}
        onSendSuccess={onSendSuccess}
      />
    </section>
  );
}
