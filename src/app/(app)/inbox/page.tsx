import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NoteCard from "@/components/NoteCard";
import type { VoiceNote } from "@/lib/db/types";

export const metadata = { title: "Inbox — Dearly" };

type View = "received" | "sent";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const view: View = (await searchParams).view === "sent" ? "sent" : "received";

  // RLS already restricts rows to the user's notes; this filter picks the view.
  const { data } = await supabase
    .from("voice_notes")
    .select("*")
    .eq(view === "received" ? "recipient_id" : "sender_id", user.id)
    .order("created_at", { ascending: false });
  const notes = (data ?? []) as VoiceNote[];

  return (
    <main className="card inbox-card">
      <div className="brand-row">
        <h1 className="brand compose-brand">Your notes</h1>
        <div className="divider" />
      </div>

      <div className="inbox-tabs" role="tablist">
        <Link href="/inbox" role="tab" aria-selected={view === "received"} className={view === "received" ? "active" : ""}>
          Received
        </Link>
        <Link href="/inbox?view=sent" role="tab" aria-selected={view === "sent"} className={view === "sent" ? "active" : ""}>
          Sent
        </Link>
      </div>

      {notes.length === 0 ? (
        <div className="inbox-empty">
          <p>
            {view === "received"
              ? "No voice notes yet. When someone sends you one, it'll be waiting here."
              : "You haven't sent any notes from your account yet."}
          </p>
          <Link className="btn btn-primary inbox-empty-cta" href="/compose">
            Send a note
          </Link>
        </div>
      ) : (
        <ul className="inbox-list">
          {notes.map((n) => (
            <NoteCard key={n.id} note={n} view={view} />
          ))}
        </ul>
      )}
    </main>
  );
}
