import React from "react";

/* Feature-roadmap icons teased on the waitlist. */
export const FEAT_ICON: Record<string, React.ReactNode> = {
  contacts: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 7.5a3 3 0 0 1 0 5" />
      <path d="M17.5 19a5 5 0 0 0-3-4.6" />
    </svg>
  ),
  video: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="6" width="13" height="12" rx="2.5" />
      <path d="M15.5 10.5 21 7.5v9l-5.5-3z" />
    </svg>
  ),
  clock: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 1.8" />
    </svg>
  ),
  reply: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 8 4 12.5 9 17" />
      <path d="M4 12.5h9a6 6 0 0 1 6 6v.5" />
    </svg>
  ),
  archive: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 4.5h11A2.5 2.5 0 0 1 18.5 7v12.5H7.5A2.5 2.5 0 0 1 5 17z" />
      <path d="M5 4.5A2.5 2.5 0 0 0 7.5 17" />
      <path d="M10 8.5h5" />
    </svg>
  ),
  family: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="7.5" cy="9" r="2.4" />
      <circle cx="16.5" cy="9" r="2.4" />
      <path d="M3.5 18a4 4 0 0 1 8 0" />
      <path d="M12.5 18a4 4 0 0 1 8 0" />
    </svg>
  ),
};

export const FEATURES = [
  { k: "contacts", t: "Saved contacts", d: "Keep your dear ones close — no retyping names or emails." },
  { k: "video", t: "Video notes", d: "Send a face, not just a voice." },
  { k: "clock", t: "Time capsules", d: "Schedule a note for a birthday — or years from now." },
  { k: "reply", t: "Voice replies", d: "Let them write back, in their own voice." },
  { k: "archive", t: "Private keepsake", d: "Every note you send, gathered in one tender archive." },
  { k: "family", t: "Family circles", d: "One note, lovingly delivered to the whole family." },
] as const;

export const RecIcon = {
  mic: (c = "#fff") => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <line x1="12" y1="17.5" x2="12" y2="21" />
      <line x1="8.5" y1="21" x2="15.5" y2="21" />
    </svg>
  ),
  stop: () => (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="3" fill="#fff" />
    </svg>
  ),
  play: () => (
    <svg width="22" height="22" viewBox="0 0 24 24">
      <path d="M8 5.5v13l11-6.5z" fill="#fff" />
    </svg>
  ),
  pause: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
      <rect x="6.5" y="5.5" width="4" height="13" rx="1.4" />
      <rect x="13.5" y="5.5" width="4" height="13" rx="1.4" />
    </svg>
  ),
  redo: (c: string) => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9a9 9 0 1 1-2 5.5" />
      <path d="M3 4v5h5" />
    </svg>
  ),
};
