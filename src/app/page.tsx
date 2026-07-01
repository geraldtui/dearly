"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import IntroSplash from "@/components/IntroSplash";

const WAVE_HEIGHTS = [
  30, 52, 74, 46, 88, 60, 100, 72, 40, 64, 90, 54, 78, 44, 96, 58, 34, 70, 50, 82, 62, 38, 86, 56,
  42,
];

const MicIcon = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="2.5" width="6" height="11" rx="3" />
    <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
    <path d="M12 17.5V21" />
  </svg>
);

const MailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 6.5h16v11H4z" />
    <path d="m4 7 8 6 8-6" />
  </svg>
);

const SendIcon = ({ size = 15 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4z" />
  </svg>
);

type Step = { icon: React.ReactNode; title: string; body: string };

const STEPS: Step[] = [
  {
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="2.5" width="6" height="11" rx="3" />
        <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
        <path d="M12 17.5V21" />
      </svg>
    ),
    title: "Record",
    body: "Tap once and speak from the heart. A minute is plenty.",
  },
  {
    icon: <MailIcon />,
    title: "Address it",
    body: "Add their name and email — that's all it takes.",
  },
  {
    icon: <SendIcon size={20} />,
    title: "Send with love",
    body: "They'll hear your voice land in their inbox in a moment.",
  },
];

export default function Home() {
  return (
    <div className="home">
      <IntroSplash />

      <div className="orb a" aria-hidden />
      <div className="orb b" aria-hidden />

      <nav className="home-nav">
        <Link href="/" className="nav-brand">
          Sona<span className="dot">.</span>
        </Link>
        <div className="nav-right">
          <ThemeToggle className="theme-toggle nav-theme-toggle" />
          <Link href="/login" className="btn btn-ghost">
            Login
          </Link>
          <Link href="/signup" className="btn btn-primary">
            Sign up free
          </Link>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <span className="spark" />
            An early preview
          </span>
          <h1>
            Some things are better <em>heard</em>.
          </h1>
          <p className="sub">
            Record a heartfelt message and send it to someone you love — in seconds, in your own
            unmistakable voice.
          </p>
          <div className="hero-cta">
            <Link href="/signup" className="btn btn-primary">
              <MicIcon />
              Record a note
            </Link>
            <a href="#how" className="btn btn-ghost">
              How it works
            </a>
          </div>
          <div className="trust">
            <span className="dots">
              <i />
              <i />
              <i />
            </span>
            No app to install — record right in your browser.
          </div>
        </div>

        <div className="mock-wrap">
          <div className="mock-glow" aria-hidden />
          <div className="mock" aria-hidden>
            <div className="mock-head">
              <span className="mock-to">
                <span className="mock-avatar">E</span>To Emily
              </span>
              <span className="mock-status">
                <span className="rec" />
                Recording
              </span>
            </div>
            <div className="mock-wave">
              {WAVE_HEIGHTS.map((h, i) => (
                <i
                  key={i}
                  style={{
                    height: `${h}%`,
                    animationDelay: `${i * 0.06}s`,
                    opacity: i > 15 ? 0.4 : undefined,
                  }}
                />
              ))}
            </div>
            <div className="mock-foot">
              <span className="mock-time">0:12</span>
              <span className="mock-send">
                Send with love
                <SendIcon />
              </span>
            </div>
          </div>
        </div>
      </header>

      <section className="steps" id="how">
        {STEPS.map((step) => (
          <div className="step" key={step.title}>
            <div className="n">{step.icon}</div>
            <h3>{step.title}</h3>
            <p>{step.body}</p>
          </div>
        ))}
      </section>

      <footer className="home-foot">
        Made with <span className="heart">♥</span> by{" "}
        <a href="https://geraldtui.com" className="home-foot-link" target="_blank" rel="noreferrer">
          Gerald Tui
        </a>{" "}
        — an early preview of Sona.
      </footer>
    </div>
  );
}
