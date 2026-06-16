import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authGuardDisabled } from "@/lib/dev-auth";
import NotesList from "@/components/NotesList";
import ContactsSidebar from "@/components/ContactsSidebar";
import { buildContacts, notesForContact, resolveSelectedKey } from "@/lib/contacts";
import type { VoiceNote } from "@/lib/db/types";

export const metadata = { title: "Sent — Dearly" };

export default async function SentPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && !authGuardDisabled()) redirect("/login");

  // Includes email-fallback copies (recipient_id null), which RLS scopes to the sender.
  // Without a user (dev auth bypass) the page renders its empty state.
  const { data } = user
    ? await supabase
        .from("voice_notes")
        .select("*")
        .eq("sender_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [] };

  const notes = (data ?? []) as VoiceNote[];
  const contacts = buildContacts(notes, "sent");
  const selectedKey = resolveSelectedKey(contacts, (await searchParams).c);
  const visibleNotes = selectedKey ? notesForContact(notes, "sent", selectedKey) : [];

  return (
    <div className="contacts-layout">
      <ContactsSidebar contacts={contacts} selectedKey={selectedKey} heading="To" />

      <main className="contacts-notes">
        <div className="notes-panel">
          <header className="notes-head">
            <h1 className="notes-title">Sent</h1>
          </header>
          <NotesList
            notes={visibleNotes}
            view="sent"
            emptyMessage="You haven't sent any notes from your account yet."
          />
        </div>
      </main>
    </div>
  );
}
