"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@/lib/supabase/use-user";

const DISMISS_KEY = "dearly_signup_pop_dismissed";

/**
 * Signup pitch anchored to the email field the visitor focused first.
 * Hidden for logged-in users; dismissing it is remembered across visits.
 */
export default function SignupPopover() {
  const { user, loading } = useUser();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (loading || user || dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="signup-pop" role="complementary" aria-label="Sign up for Dearly">
      <button className="signup-pop-close" onClick={dismiss} aria-label="Dismiss">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </button>
      <h4>Sign up to store your contacts</h4>
      <p>Save the people you send to — no more retyping emails. Your notes get a Dearly Inbox too.</p>
      <Link href="/signup" className="signup-pop-cta">
        Sign up free
      </Link>
    </div>
  );
}
