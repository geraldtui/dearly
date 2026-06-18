"use client";

import Link from "next/link";
import ConversationLabelEditor from "@/components/ConversationLabelEditor";
import type { Conversation } from "@/lib/conversations";

/** A conversation plus the owner's saved label values for the inline editor. */
export type ChatListItem = Conversation & { nickname: string; alias: string };

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Left rail: one row per conversation, newest activity first (WhatsApp-style). */
export default function ChatList({
  conversations,
  selectedKey,
  newMode,
}: {
  conversations: ChatListItem[];
  selectedKey: string | null;
  newMode: boolean;
}) {
  return (
    <aside className="chat-list" aria-label="Conversations">
      <h2 className="chat-list-head">Chats</h2>

      {conversations.length === 0 ? (
        <p className="chat-list-empty">No conversations yet.</p>
      ) : (
        <ul className="chat-items">
          {conversations.map((c) => {
            const active = !newMode && c.key === selectedKey;
            return (
              <li key={c.key} className="chat-item-row">
                <Link
                  href={`/chats?c=${encodeURIComponent(c.key)}`}
                  className={`chat-item${active ? " active" : ""}`}
                  aria-current={active ? "true" : undefined}
                >
                  <span className="chat-item-avatar" aria-hidden="true">
                    {initial(c.name)}
                  </span>
                  <span className="chat-item-text">
                    <span className="chat-item-top">
                      <span className="chat-item-name">{c.name}</span>
                      <span className="chat-item-time">{dayLabel(c.lastAt)}</span>
                    </span>
                    <span className="chat-item-sub">
                      {c.viaEmail && <span className="chat-item-tag">via email</span>}
                      {c.count} note{c.count === 1 ? "" : "s"}
                    </span>
                  </span>
                </Link>
                <ConversationLabelEditor counterpartKey={c.key} nickname={c.nickname} alias={c.alias} />
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );
}
