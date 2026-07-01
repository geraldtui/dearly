import React from "react";

export const RecIcon = {
  mic: (c = "currentColor") => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2.5" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
      <line x1="12" y1="17.5" x2="12" y2="21" />
      <line x1="8.5" y1="21" x2="15.5" y2="21" />
    </svg>
  ),
  stop: () => (
    <svg width="20" height="20" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="3" fill="currentColor" />
    </svg>
  ),
  play: () => (
    <svg width="22" height="22" viewBox="0 0 24 24">
      <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
    </svg>
  ),
  pause: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
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
