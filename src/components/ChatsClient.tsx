"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import ChatList, { type ChatListItem } from "@/components/ChatList";
import ChatThread, { type ThreadCounterpart } from "@/components/ChatThread";
import {
  buildConversations,
  messagesForConversation,
  type ConversationMessage,
  type Conversation,
} from "@/lib/conversations";
import type { VoiceNote, ConversationLabel } from "@/lib/db/types";

type LoadState = "loading" | "loaded" | "error";

/**
 * Client Component that manages chat state entirely in React (no URL navigation).
 * Fetches all conversations + messages once on mount, then switches between them
 * via local state for instant (<50ms) navigation.
 */
export default function ChatsClient({ userId }: { userId: string }) {
  const router = useRouter();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [error, setError] = useState("");
  const [conversations, setConversations] = useState<ChatListItem[]>([]);
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

      const labels = new Map<string, Pick<ConversationLabel, "nickname" | "my_alias">>(
        (labelRows ?? []).map((l) => [l.counterpart_key, { nickname: l.nickname, my_alias: l.my_alias }])
      );

      const rawNotes = (notesData ?? []) as VoiceNote[];
      setNotes(rawNotes);

      // Build conversations and fetch emails for account-based contacts
      const rawConvos = buildConversations(rawNotes, userId);
      const convosWithEmails = await Promise.all(
        rawConvos.map(async (c: Conversation) => {
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

      setConversations(convosWithEmails);

      // Auto-select first conversation if available
      if (convosWithEmails.length > 0 && !selectedKey && !newMode) {
        setSelectedKey(convosWithEmails[0].key);
      }

      setLoadState("loaded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load conversations");
      setLoadState("error");
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Listen for new chat requests from the sidebar
  useEffect(() => {
    const handleNewChatRequest = () => {
      setSelectedKey(null);
      setNewMode(true);
    };

    window.addEventListener('newChatRequested', handleNewChatRequest);
    return () => window.removeEventListener('newChatRequested', handleNewChatRequest);
  }, []);

  const handleSelectConversation = (key: string) => {
    setSelectedKey(key);
    setNewMode(false);
  };

  const handleNewChat = () => {
    setSelectedKey(null);
    setNewMode(true);
  };

  const handleSendSuccess = () => {
    // Refresh data and auto-select newest conversation
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
        <aside className="chat-list" aria-label="Conversations">
          <h2 className="chat-list-head">Chats</h2>
          <div className="chat-loading">
            <span className="spinner" />
            <p>Loading conversations...</p>
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
        <aside className="chat-list" aria-label="Conversations">
          <h2 className="chat-list-head">Chats</h2>
          <div className="chat-error">
            <p className="err">{error}</p>
            <button className="btn btn-primary" onClick={fetchData}>
              Retry
            </button>
          </div>
        </aside>
        <section className="chat-thread chat-thread-empty">
          <div className="chat-empty">
            <p>Failed to load conversations</p>
          </div>
        </section>
      </div>
    );
  }

  // Determine thread mode and data
  let mode: "conversation" | "new" | "empty" = "empty";
  let messages: ConversationMessage[] = [];
  let counterpart: ThreadCounterpart | null = null;

  if (newMode) {
    mode = "new";
  } else if (selectedKey) {
    const convo = conversations.find((c) => c.key === selectedKey);
    if (convo) {
      messages = messagesForConversation(notes, userId, selectedKey);
      mode = "conversation";
      counterpart = {
        key: selectedKey,
        name: convo.name,
        email: convo.counterpartEmail,
        viaEmail: convo.viaEmail,
        canReply: Boolean(convo.counterpartEmail || convo.counterpartId),
      };
    }
  } else if (conversations.length === 0) {
    mode = "empty";
  }

  return (
    <div className="chat-layout">
      <ChatList
        conversations={conversations}
        selectedKey={selectedKey}
        newMode={newMode}
        onSelectConversation={handleSelectConversation}
      />
      <ChatThread
        mode={mode}
        messages={messages}
        counterpart={counterpart}
        onSendSuccess={handleSendSuccess}
        onDeleteSuccess={handleDeleteSuccess}
        onNewChat={handleNewChat}
      />
    </div>
  );
}
