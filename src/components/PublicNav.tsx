"use client";

import Link from "next/link";
import { useUser } from "@/lib/supabase/use-user";

/** Session-aware auth links for the public homepage (top-right corner). */
export default function PublicNav() {
  const { user, loading } = useUser();

  if (loading) return null;

  return (
    <nav className="public-nav" aria-label="Account">
      {user ? (
        <Link href="/chats" className="public-nav-cta">
          Chats
        </Link>
      ) : (
        <>
          <Link href="/login" className="public-nav-link">
            Log in
          </Link>
          <Link href="/signup" className="public-nav-cta">
            Sign up
          </Link>
        </>
      )}
    </nav>
  );
}
