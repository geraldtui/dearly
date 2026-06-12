import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authGuardDisabled } from "@/lib/dev-auth";
import NotesList from "@/components/NotesList";
import type { VoiceNote } from "@/lib/db/types";

export const metadata = { title: "Sent — Dearly" };

export default async function SentPage() {
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

  return (
    <main className="card inbox-card">
      <div className="brand-row">
        <h1 className="brand compose-brand">Sent</h1>
        <div className="divider" />
      </div>
      <NotesList
        notes={(data ?? []) as VoiceNote[]}
        view="sent"
        emptyMessage="You haven't sent any notes from your account yet."
      />
    </main>
  );
}
