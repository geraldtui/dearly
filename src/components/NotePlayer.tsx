"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface NotePlayerProps {
  noteId: string;
  /** Refresh the inbox after first play so the listened state updates. */
  refreshOnPlay?: boolean;
}

/**
 * Inline audio player that fetches a short-lived signed URL on demand.
 * The URL is re-fetched on each fresh play attempt after expiry.
 */
export default function NotePlayer({ noteId, refreshOnPlay = false }: NotePlayerProps) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");

  const fetchSignedUrl = async (): Promise<string> => {
    const res = await fetch(`/api/notes/${noteId}/url`, { method: "POST" });
    if (!res.ok) throw new Error("We couldn't load the audio.");
    const data = (await res.json()) as { url: string };
    return data.url;
  };

  const play = async () => {
    if (playing) {
      audioRef.current?.pause();
      return;
    }
    setError("");
    setLoading(true);
    try {
      const audio = audioRef.current!;
      // Always mint a fresh URL: signed URLs are short-lived by design.
      audio.src = await fetchSignedUrl();
      await audio.play();
      if (refreshOnPlay) router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Playback failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="note-player">
      <button
        type="button"
        className="note-play"
        onClick={play}
        disabled={loading}
        aria-label={playing ? "Pause" : "Play voice note"}
      >
        {loading ? (
          <span className="spinner" />
        ) : playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 8 5.5Z" />
          </svg>
        )}
      </button>
      <audio
        ref={audioRef}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      {error && <span className="err">{error}</span>}
    </div>
  );
}
