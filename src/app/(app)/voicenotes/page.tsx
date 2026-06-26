import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authGuardDisabled } from "@/lib/dev-auth";
import VoiceNotesClient from "@/components/VoiceNotesClient";

export const metadata = { title: "Voice Notes — Dearly" };

export default async function VoiceNotesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && !authGuardDisabled()) redirect("/login");

  return <VoiceNotesClient userId={user?.id ?? ""} />;
}
