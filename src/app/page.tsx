import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sona — voice logs for the ones you love",
  description:
    "Record a heartfelt voice note in your browser and keep every note you send and receive in one tidy place. Sign up free.",
};

type Feature = { icon: React.ReactNode; title: string; body: string };

const FEATURES: Feature[] = [
  {
    title: "Record in your browser",
    body: "Tap once and capture up to five minutes of voice. Nothing to download.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="2.5" width="6" height="11" rx="3" />
        <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
        <line x1="12" y1="17.5" x2="12" y2="21" />
        <line x1="8.5" y1="21" x2="15.5" y2="21" />
      </svg>
    ),
  },
  {
    title: "Send to any inbox",
    body: "We deliver your note as an MP3 email — with your own subject line — to anyone.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    ),
  },
  {
    title: "Keep them in tidy threads",
    body: "Notes you send and receive live in calm, private threads — out of your email clutter.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-3.8-.8L3 20.5l1.9-4.2A8.4 8.4 0 0 1 4 11.5 8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5Z" />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <div className="splash">
      <nav className="splash-nav" aria-label="Account">
        <Link href="/login" className="public-nav-link">
          Log in
        </Link>
        <Link href="/signup" className="public-nav-cta">
          Sign up
        </Link>
      </nav>

      <main className="splash-main">
        <section className="splash-hero">
          <h1 className="brand splash-brand">
            Sona<span className="dot">.</span>
          </h1>
          <p className="splash-headline">Voice logs for the ones you love.</p>
          <p className="splash-tagline">
            Record a heartfelt voice note in seconds and keep every note you send and receive
            in calm, private threads.
          </p>
          <div className="splash-cta">
            <Link href="/signup" className="btn btn-primary splash-cta-btn">
              Sign up free
            </Link>
            <Link href="/login" className="splash-cta-login">
              Already have an account? Log in
            </Link>
          </div>
        </section>

        <section className="splash-features" aria-label="Features">
          {FEATURES.map((f) => (
            <div className="splash-feature" key={f.title}>
              <div className="splash-feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </section>

        <p className="foot splash-foot">
          Made with <span className="heart">♥</span> by <Link href="https://www.geraldtui.com" target="_blank" className="splash-author-link">Gerald Tui</Link>

        </p>
      </main>
    </div>
  );
}
