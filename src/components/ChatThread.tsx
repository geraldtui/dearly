"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import NotePlayer from "@/components/NotePlayer";
import ChatComposer from "@/components/ChatComposer";
import type { ConversationMessage } from "@/lib/conversations";

export interface ThreadCounterpart {
  key: string;
  name: string;
  email: string | null;
  viaEmail: boolean;
  canReply: boolean;
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
function MessageBubble({ msg }: { msg: ConversationMessage }) {
  const router = useRouter();
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
      router.refresh();
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

/** Middle pane: conversation timeline + inline composer, or the new-chat / empty states. */
export default function ChatThread({
  mode,
  messages,
  counterpart,
}: {
  mode: "conversation" | "new" | "empty";
  messages: ConversationMessage[];
  counterpart: ThreadCounterpart | null;
}) {
  if (mode === "empty") {
    return (
      <section className="chat-thread chat-thread-empty">
        <div className="chat-empty">
          <h1>No conversations yet</h1>
          <p>Start a new chat to send your first voice note.</p>
          <Link href="/chats?new=1" className="btn btn-primary">
            New chat
          </Link>
        </div>
      </section>
    );
  }

  if (mode === "new" || !counterpart) {
    return (
      <section className="chat-thread">
        <header className="chat-thread-head">
          <span className="chat-avatar new" aria-hidden="true">
            +
          </span>
          <div className="chat-thread-id">
            <h1 className="chat-thread-name">New chat</h1>
            <span className="chat-thread-sub">Record a voice note and send it to someone.</span>
          </div>
        </header>
        <div className="chat-scroll chat-scroll-empty">
          <p className="chat-hint">Your conversation will appear here.</p>
        </div>
        <ChatComposer mode="new" />
      </section>
    );
  }

  return (
    <section className="chat-thread">
      <header className="chat-thread-head">
        <span className="chat-avatar" aria-hidden="true">
          {initial(counterpart.name)}
        </span>
        <div className="chat-thread-id">
          <h1 className="chat-thread-name">{counterpart.name}</h1>
          {counterpart.viaEmail && <span className="chat-thread-sub">via email</span>}
        </div>
      </header>

      <div className="chat-scroll">
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} />
        ))}
      </div>

      <ChatComposer
        mode="reply"
        recipientName={counterpart.name}
        recipientEmail={counterpart.email}
        canReply={counterpart.canReply}
      />
    </section>
  );
}
