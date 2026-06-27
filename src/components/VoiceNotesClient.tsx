"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import VoiceNotesSidebar, { type ThreadListItem } from "@/components/VoiceNotesSidebar";
import VoiceNoteThread, { type ThreadCounterpart } from "@/components/VoiceNoteThread";
import {
  buildThreads,
  messagesForThread,
  type ThreadMessage,
  type Thread,
} from "@/lib/threads";
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

  // Fetch all data once on mount
  const fetchData = async () => {
    try {
      setLoadState("loading");
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
        .select("counterpart_key, nickname, my_alias")
        .eq("owner_id", userId);

      if (labelsError) throw labelsError;

      const labels = new Map<string, Pick<ThreadLabel, "nickname" | "my_alias">>(
        (labelRows ?? []).map((l) => [l.counterpart_key, { nickname: l.nickname, my_alias: l.my_alias }])
      );

      const rawNotes = (notesData ?? []) as VoiceNote[];
      setNotes(rawNotes);

      // Build threads and fetch emails for account-based contacts
      const rawThreads = buildThreads(rawNotes, userId);
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
    setSelectedKey(key);
    setNewMode(false);
  };

  const handleNewThread = () => {
    setSelectedKey(null);
    setNewMode(true);
  };

  const handleSendSuccess = () => {
    // Refresh data and auto-select newest thread
    fetchData();
    setNewMode(false);
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
              <span>Dearly<span className="dot">.</span></span>
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
              <span>Dearly<span className="dot">.</span></span>
            </div>
          </div>
          <div className="chat-error">
            <p className="err">{error}</p>
            <button className="btn btn-primary" onClick={fetchData}>
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

  return (
    <div className="chat-layout">
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
        counterpart={counterpart}
        onSendSuccess={handleSendSuccess}
        onDeleteSuccess={handleDeleteSuccess}
        onNewNote={handleNewThread}
      />
    </div>
  );
}
