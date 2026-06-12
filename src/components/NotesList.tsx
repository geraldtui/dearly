import Link from "next/link";
import NoteCard from "@/components/NoteCard";
import type { VoiceNote } from "@/lib/db/types";

/** Server-rendered list of notes (or a friendly empty state) for Inbox/Sent. */
export default function NotesList({
  notes,
  view,
  emptyMessage,
}: {
  notes: VoiceNote[];
  view: "received" | "sent";
  emptyMessage: string;
}) {
  if (notes.length === 0) {
    return (
      <div className="inbox-empty">
        <p>{emptyMessage}</p>
        <Link className="btn btn-primary inbox-empty-cta" href="/compose">
          Send a note
        </Link>
      </div>
    );
  }

  return (
    <ul className="inbox-list">
      {notes.map((n) => (
        <NoteCard key={n.id} note={n} view={view} />
      ))}
    </ul>
  );
}
