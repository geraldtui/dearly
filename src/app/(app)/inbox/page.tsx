import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authGuardDisabled } from "@/lib/dev-auth";
import NotesList from "@/components/NotesList";
import ContactsSidebar from "@/components/ContactsSidebar";
import { buildContacts, notesForContact, resolveSelectedKey } from "@/lib/contacts";
import type { VoiceNote } from "@/lib/db/types";

export const metadata = { title: "Inbox — Dearly" };

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && !authGuardDisabled()) redirect("/login");

  // RLS already restricts rows to the user's notes; this filter picks the view.
  // Without a user (dev auth bypass) the page renders its empty state.
  const { data } = user
    ? await supabase
        .from("voice_notes")
        .select("*")
        .eq("recipient_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const notes = (data ?? []) as VoiceNote[];
  const contacts = buildContacts(notes, "received");
  const selectedKey = resolveSelectedKey(contacts, (await searchParams).c);
  const visibleNotes = selectedKey ? notesForContact(notes, "received", selectedKey) : [];

  return (
    <div className="contacts-layout">
      <ContactsSidebar contacts={contacts} selectedKey={selectedKey} heading="From" />

      <main className="contacts-notes">
        <div className="notes-panel">
          <header className="notes-head">
            <h1 className="notes-title">Inbox</h1>
          </header>
          <NotesList
            notes={visibleNotes}
            view="received"
            emptyMessage="No voice notes yet. When someone sends you one, it'll be waiting here."
          />
        </div>
      </main>
    </div>
  );
}
