import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { authGuardDisabled } from "@/lib/dev-auth";
import AppSidebar from "@/components/AppSidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user && !authGuardDisabled()) redirect("/login");

  return (
    <div className="stage app-stage">
      <div className="orb a" />
      <div className="orb b" />

      <AppSidebar />

      <div className="app-content">{children}</div>
    </div>
  );
}
