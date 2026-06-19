"use client";

import Link from "next/link";
import { FEAT_ICON } from "@/components/icons";
import { useUser } from "@/lib/supabase/use-user";

/**
 * Dearly-account pitch card on the sent screen (replaces the old waitlist
 * join card). Logged in, it becomes a shortcut to the Inbox.
 */
export default function SignupPromoCard({ onExplore }: { onExplore?: () => void }) {
  const { user, loading } = useUser();

  if (loading) return null;

  if (user) {
    return (
      <div className="join-card" role="complementary">
        <p className="join-eyebrow">
          <span className="spark" />
          Welcome back
        </p>
        <h3>Your voice notes are waiting.</h3>
        <Link href="/voicenotes" className="btn btn-primary home-promo-cta">
          Go to your voice notes
        </Link>
      </div>
    );
  }

  return (
    <div className="join-card" role="complementary">
      <p className="join-eyebrow">
        <span className="spark" />
        Never miss a note
      </p>
      <h3>Want an inbox for notes like this?</h3>
      <p className="home-promo-copy">
        Sign up free and voice notes sent to you land in your Dearly Inbox — easy to keep and replay, out of your email.
      </p>
      <div className="join-chips">
        <span className="chip">{FEAT_ICON.archive} Dearly Inbox</span>
        <span className="chip">{FEAT_ICON.reply} Listen in-app</span>
        <span className="chip">{FEAT_ICON.contacts} Saves email storage</span>
      </div>
      <div className="home-promo-actions">
        <Link href="/signup" className="btn btn-primary home-promo-cta">
          Sign up free
        </Link>
        <Link href="/login" className="home-promo-login">
          Already have an account? Log in
        </Link>
      </div>
      {onExplore && (
        <button className="home-promo-explore" onClick={onExplore}>
          or see everything Dearly can do
        </button>
      )}
    </div>
  );
}
