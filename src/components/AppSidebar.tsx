"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";

const CHATS_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.38 8.38 0 0 1 8.5-8.5A8.38 8.38 0 0 1 21 11.5z" />
  </svg>
);

const NEW_CHAT_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </svg>
);

/** Left sidebar for the authenticated area: brand, section nav, log out. */
export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar">
      <Link href="/voicenotes" className="app-sidebar-brand">
        <Logo size={26} title="" />
        <span>
          Dearly<span className="dot">.</span>
        </span>
      </Link>

      <nav className="app-sidebar-nav" aria-label="Dearly">
        <Link href="/voicenotes" className={pathname.startsWith("/voicenotes") ? "active" : ""}>
          {CHATS_ICON}
          Voice Notes
        </Link>
      </nav>

      <form action="/api/auth/signout" method="post" className="app-sidebar-foot">
        <button type="submit" className="app-nav-signout">
          Log out
        </button>
      </form>
    </aside>
  );
}
