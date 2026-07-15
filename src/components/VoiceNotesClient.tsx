"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import VoiceNotesSidebar, { type ThreadListItem } from "@/components/VoiceNotesSidebar";
import VoiceNoteThread, { type ThreadCounterpart } from "@/components/VoiceNoteThread";
import {
  buildThreads,
  counterpartKey,
  ensureSelfThread,
  messagesForThread,
  type ThreadMessage,
  type Thread,
} from "@/lib/threads";
import { sendAccountNote, type AccountNotePayload } from "@/lib/api";
import { createPendingSend, pendingForThread, type PendingSend } from "@/lib/pendingSends";
import type { VoiceNote, ThreadLabel } from "@/lib/db/types";

type LoadState = "loading" | "loaded" | "error";

/**
 * Client Component that manages voice note thread state entirely in React (no URL navigation).
 * Fetches all threads + messages once on mount, then switches between them
 * via local state for instant (<50ms) navigation.
 */
export default function VoiceNotesClient({ userId }: { userId: string }) {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [threads, setThreads] = useState<ThreadListItem[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [newMode, setNewMode] = useState(false);
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [pendingSends, setPendingSends] = useState<PendingSend[]>([]);

  // Fetch all data once on mount (or silently refresh after a background send/delete).
  const fetchData = async (opts: { silent?: boolean } = {}) => {
    try {
      if (!opts.silent) setLoadState("loading");
      setError("");
      const supabase = createClient();

      // Fetch notes
      const { data: notesData, error: notesError } = await supabase
        .from("voice_notes")
        .select("*")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: false });

      if (notesError) throw notesError;

      // Fetch labels
      const { data: labelRows, error: labelsError } = await supabase
        .from("conversation_labels")
        .select("counterpart_key, nickname, my_alias, pinned")
        .eq("owner_id", userId);

      if (labelsError) throw labelsError;

      const labels = new Map<string, Pick<ThreadLabel, "nickname" | "my_alias" | "pinned">>(
        (labelRows ?? []).map((l) => [
          l.counterpart_key,
          { nickname: l.nickname, my_alias: l.my_alias, pinned: l.pinned },
        ])
      );

      const rawNotes = (notesData ?? []) as VoiceNote[];
      setNotes(rawNotes);

      // Build threads, pin "Self Notes" (synthesizing it if empty), then fetch
      // emails for account-based contacts.
      const selfPinned = Boolean(labels.get(counterpartKey({ id: userId }))?.pinned);
      const rawThreads = ensureSelfThread(buildThreads(rawNotes, userId), userId, selfPinned);
      const threadsWithEmails = await Promise.all(
        rawThreads.map(async (c: Thread) => {
          const label = labels.get(c.key);
          let email = c.counterpartEmail;

          // If no stored email but has account ID, fetch from profiles
          if (!email && c.counterpartId) {
            try {
              const { data } = await supabase
                .from("profiles")
                .select("email")
                .eq("id", c.counterpartId)
                .maybeSingle<{ email: string }>();
              if (data?.email) email = data.email;
            } catch {
              // Ignore fetch errors for individual profiles
            }
          }

          return {
            ...c,
            counterpartEmail: email,
            name: label?.nickname || c.name,
            nickname: label?.nickname ?? "",
            alias: label?.my_alias ?? "",
          };
        })
      );

      setThreads(threadsWithEmails);

      // Auto-select first thread if available
      if (threadsWithEmails.length > 0 && !selectedKey && !newMode) {
        setSelectedKey(threadsWithEmails[0].key);
      }

      setLoadState("loaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load voice notes");
      setLoadState("error");
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Listen for new note requests from the sidebar (deprecated - now handled via prop)
  useEffect(() => {
    const handleNewNoteRequest = () => {
      setSelectedKey(null);
      setNewMode(true);
    };

    window.addEventListener('newNoteRequested', handleNewNoteRequest);
    return () => window.removeEventListener('newNoteRequested', handleNewNoteRequest);
  }, []);

  const handleSelectThread = (key: string) => {
    setIsTransitioning(true);
    setSelectedKey(key);
    setNewMode(false);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const handleNewThread = () => {
    setIsTransitioning(true);
    setSelectedKey(null);
    setNewMode(true);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const handleBackToList = () => {
    setIsTransitioning(true);
    setSelectedKey(null);
    setNewMode(false);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const handleSendSuccess = () => {
    // Refresh data silently (already in the middle of this flow, no full-skeleton flash)
    fetchData({ silent: true });
    setNewMode(false);
  };

  /** Fires the network request without blocking the UI; resolves or fails the pending entry. */
  const runPendingSend = (pending: PendingSend) => {
    sendAccountNote(pending.payload)
      .then(() => {
        setPendingSends((prev) => prev.filter((p) => p.id !== pending.id));
        fetchData({ silent: true });
      })
      .catch((e) => {
        const message = e instanceof Error ? e.message : "We couldn't send your note. Please try again.";
        setPendingSends((prev) =>
          prev.map((p) => (p.id === pending.id ? { ...p, status: "failed", error: message } : p))
        );
      });
  };

  const handleSend = (threadKey: string, payload: AccountNotePayload) => {
    const pending = createPendingSend(threadKey, payload);
    setPendingSends((prev) => [...prev, pending]);
    runPendingSend(pending);
  };

  const handleRetryPending = (id: string) => {
    const pending = pendingSends.find((p) => p.id === id);
    if (!pending) return;
    const retrying: PendingSend = { ...pending, status: "sending", error: "" };
    setPendingSends((prev) => prev.map((p) => (p.id === id ? retrying : p)));
    runPendingSend(retrying);
  };

  const handleDeleteSuccess = () => {
    // Refresh data
    fetchData();
  };

  // Loading state
  if (loadState === "loading") {
    return (
      <div className="chat-layout">
        <aside className="voice-notes-sidebar">
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <span>Sona<span className="dot">.</span></span>
            </div>
          </div>
          <div className="chat-loading">
            <span className="spinner" />
            <p>Loading voice notes...</p>
          </div>
        </aside>
        <section className="chat-thread chat-thread-empty">
          <div className="chat-empty">
            <span className="spinner" />
          </div>
        </section>
      </div>
    );
  }

  // Error state
  if (loadState === "error") {
    return (
      <div className="chat-layout">
        <aside className="voice-notes-sidebar">
          <div className="sidebar-header">
            <div className="sidebar-brand">
              <span>Sona<span className="dot">.</span></span>
            </div>
          </div>
          <div className="chat-error">
            <p className="err">{error}</p>
            <button className="btn btn-primary" onClick={() => fetchData()}>
              Retry
            </button>
          </div>
        </aside>
        <section className="chat-thread chat-thread-empty">
          <div className="chat-empty">
            <p>Failed to load voice notes</p>
          </div>
        </section>
      </div>
    );
  }

  // Determine thread mode and data
  let mode: "thread" | "new" | "empty" = "empty";
  let messages: ThreadMessage[] = [];
  let counterpart: ThreadCounterpart | null = null;

  if (newMode) {
    mode = "new";
  } else if (selectedKey) {
    const thread = threads.find((c) => c.key === selectedKey);
    if (thread) {
      messages = messagesForThread(notes, userId, selectedKey);
      mode = "thread";
      counterpart = {
        key: selectedKey,
        name: thread.name,
        email: thread.counterpartEmail,
        viaEmail: thread.viaEmail,
        canReply: Boolean(thread.counterpartEmail || thread.counterpartId),
        nickname: thread.nickname,
        alias: thread.alias,
      };
    }
  } else if (threads.length === 0) {
    mode = "empty";
  }

  // Determine mobile view state
  const mobileView = selectedKey || newMode ? "thread" : "list";

  return (
    <>
      {/* Mobile new message button - next to theme toggle */}
      <button
        type="button"
        className="mobile-new-msg-btn"
        onClick={handleNewThread}
        aria-label="New voice note"
        title="New voice note"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      </button>
      
      <div 
        className="chat-layout" 
        data-mobile-view={mobileView}
        data-transitioning={isTransitioning}
      >
        <VoiceNotesSidebar
          threads={threads}
          selectedKey={selectedKey}
          newMode={newMode}
          onSelectThread={handleSelectThread}
          onNewThread={handleNewThread}
        />
        <VoiceNoteThread
          mode={mode}
          messages={messages}
          pendingMessages={selectedKey ? pendingForThread(pendingSends, selectedKey) : []}
          counterpart={counterpart}
          onSend={(payload) => selectedKey && handleSend(selectedKey, payload)}
          onRetryPending={handleRetryPending}
          onSendSuccess={handleSendSuccess}
          onDeleteSuccess={handleDeleteSuccess}
          onNewNote={handleNewThread}
          onBack={handleBackToList}
        />
      </div>
    </>
  );
}
