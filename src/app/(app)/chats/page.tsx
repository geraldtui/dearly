import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authGuardDisabled } from "@/lib/dev-auth";
import ChatsClient from "@/components/ChatsClient";

export const metadata = { title: "Chats — Dearly" };

export default async function ChatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && !authGuardDisabled()) redirect("/login");

  return <ChatsClient userId={user?.id ?? ""} />;
}
