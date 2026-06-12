"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import NotePlayer from "@/components/NotePlayer";
import type { VoiceNote } from "@/lib/db/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** One inbox row: play, metadata, listened state, delete. */
export default function NoteCard({ note, view }: { note: VoiceNote; view: "received" | "sent" }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const counterpart = view === "received" ? note.sender_name || "Someone" : note.recipient_name || "Someone";
  const unlistened = view === "received" && !note.listened_at;
  // Email-fallback copies have no recipient account; the MP3 went by email.
  const sentByEmail = view === "sent" && !note.recipient_id;

  const remove = async () => {
    if (deleting) return;
    setError("");
    setDeleting(true);
    try {
      const res = await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("We couldn't delete that note.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setDeleting(false);
    }
  };

  return (
    <li className={`note-card${unlistened ? " unlistened" : ""}`}>
      <NotePlayer noteId={note.id} refreshOnPlay={unlistened} />
      <div className="note-meta">
        <div className="note-title">
          {view === "received" ? "From" : "To"} <b>{counterpart}</b>
          {unlistened && <span className="note-new">New</span>}
          {sentByEmail && <span className="note-via">via email</span>}
        </div>
        <div className="note-sub">
          {note.subject ? <span className="note-subject">{note.subject}</span> : <span className="note-subject muted">Voice note</span>}
          {" · "}
          {formatDuration(note.duration_seconds)}
          {" · "}
          {formatDate(note.created_at)}
        </div>
        {error && <div className="err">{error}</div>}
      </div>
      <button type="button" className="note-delete" onClick={remove} disabled={deleting} aria-label="Delete note">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6h18" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </li>
  );
}
