import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Logo from "@/components/Logo";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="stage app-stage">
      <div className="orb a" />
      <div className="orb b" />

      <nav className="app-nav">
        <Link href="/inbox" className="app-nav-brand">
          <Logo size={26} title="" />
          <span>
            Dearly<span className="dot">.</span>
          </span>
        </Link>
        <div className="app-nav-links">
          <Link href="/inbox">Inbox</Link>
          <Link href="/compose">Send a note</Link>
          <form action="/api/auth/signout" method="post">
            <button type="submit" className="app-nav-signout">
              Log out
            </button>
          </form>
        </div>
      </nav>

      {children}
    </div>
  );
}
