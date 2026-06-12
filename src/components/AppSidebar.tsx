"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";

const NAV_ITEMS = [
  {
    href: "/compose",
    label: "Send a note",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19v3" />
        <rect x="9" y="2" width="6" height="13" rx="3" />
        <path d="M5 10v2a7 7 0 0 0 14 0v-2" />
      </svg>
    ),
  },
  {
    href: "/inbox",
    label: "Inbox",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </svg>
    ),
  },
  {
    href: "/sent",
    label: "Sent",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 2 11 13" />
        <path d="M22 2 15 22l-4-9-9-4z" />
      </svg>
    ),
  },
];

/** Left sidebar for the authenticated area: brand, section nav, log out. */
export default function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="app-sidebar">
      <Link href="/inbox" className="app-sidebar-brand">
        <Logo size={26} title="" />
        <span>
          Dearly<span className="dot">.</span>
        </span>
      </Link>

      <nav className="app-sidebar-nav" aria-label="Dearly">
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href} className={pathname.startsWith(item.href) ? "active" : ""}>
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      <form action="/api/auth/signout" method="post" className="app-sidebar-foot">
        <button type="submit" className="app-nav-signout">
          Log out
        </button>
      </form>
    </aside>
  );
}
