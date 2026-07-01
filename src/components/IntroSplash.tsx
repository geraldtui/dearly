"use client";

import { useEffect, useState } from "react";

const SEEN_KEY = "sona:intro-seen";
const AUTO_DISMISS_MS = 5000;
const REDUCED_MOTION_MS = 500;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * Full-screen animated intro shown once per browser session on the homepage.
 * Auto-dismisses after a short delay, or immediately on tap/click.
 */
export default function IntroSplash() {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SEEN_KEY)) return;

    sessionStorage.setItem(SEEN_KEY, "1");
    setVisible(true);
    document.body.classList.add("splashing");

    const dismissAfter = prefersReducedMotion() ? REDUCED_MOTION_MS : AUTO_DISMISS_MS;
    const timer = window.setTimeout(dismiss, dismissAfter);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    setLeaving(true);
    document.body.classList.remove("splashing");
    window.setTimeout(() => setVisible(false), 750);
  }

  if (!visible) return null;

  return (
    <div
      className={`splash${leaving ? " gone" : ""}`}
      onClick={dismiss}
      role="button"
      tabIndex={0}
      aria-label="Enter Sona"
    >
      <div className="splash-inner">
        <div className="splash-word">
          Sona<span className="dot">.</span>
        </div>
        <div className="splash-line" />
        <div className="splash-tag">Voice notes, from the heart</div>
      </div>
      <div className="splash-skip">Tap anywhere to enter</div>
    </div>
  );
}
