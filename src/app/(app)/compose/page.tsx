import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ComposeForm from "@/components/ComposeForm";
import type { Profile } from "@/lib/db/types";

export const metadata = { title: "Send a note — Dearly" };

export default async function ComposePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, email")
    .eq("id", user.id)
    .single<Pick<Profile, "display_name" | "email">>();

  return (
    <main className="card">
      <ComposeForm senderName={profile?.display_name || profile?.email || "You"} />
    </main>
  );
}
