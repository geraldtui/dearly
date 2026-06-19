/* Merge a user's sent + received notes into per-person conversations. Pure, no I/O. */

import type { VoiceNote } from "@/lib/db/types";

export interface ConversationMessage extends VoiceNote {
  /** True when the logged-in user is the sender (render right-aligned). */
  outgoing: boolean;
}

export interface Conversation {
  /** Stable grouping id used as the `c` query param. */
  key: string;
  name: string;
  /** Counterpart's Dearly account id, if they have one. */
  counterpartId: string | null;
  /** Counterpart's email, if known (stored on outgoing notes). */
  counterpartEmail: string | null;
  count: number;
  /** ISO timestamp of the most recent note in the thread. */
  lastAt: string;
  /** True when the counterpart has no Dearly account (email/guest contact). */
  viaEmail: boolean;
  /** False for incoming-only guest threads with no account and no email. */
  canReply: boolean;
}

interface Counterpart {
  id: string | null;
  email: string | null;
  name: string;
  outgoing: boolean;
}

/** The other person in a note, relative to the logged-in user. */
function counterpartOf(note: VoiceNote, userId: string): Counterpart {
  const outgoing = note.sender_id === userId;
  if (outgoing) {
    return {
      id: note.recipient_id,
      email: note.recipient_email,
      name: note.recipient_name?.trim() || "Someone",
      outgoing,
    };
  }
  return {
    id: note.sender_id,
    email: null,
    name: note.sender_name?.trim() || "Someone",
    outgoing,
  };
}

/** Grouping id: account id, else email, else a normalized name. */
export function counterpartKey({
  id,
  email,
  name,
}: {
  id?: string | null;
  email?: string | null;
  name?: string | null;
}): string {
  if (id) return `id:${id}`;
  if (email) return `email:${email.toLowerCase()}`;
  return `name:${(name ?? "").trim().toLowerCase()}`;
}

function keyFor(c: Counterpart): string {
  return counterpartKey(c);
}

export function conversationKey(note: VoiceNote, userId: string): string {
  return keyFor(counterpartOf(note, userId));
}

/** Groups notes into conversations, most recent activity first. */
export function buildConversations(notes: VoiceNote[], userId: string): Conversation[] {
  const byKey = new Map<string, Conversation>();

  for (const note of notes) {
    const c = counterpartOf(note, userId);
    const key = keyFor(c);
    const existing = byKey.get(key);

    if (existing) {
      existing.count += 1;
      existing.counterpartId ??= c.id;
      existing.counterpartEmail ??= c.email;
      if (note.created_at > existing.lastAt) {
        existing.lastAt = note.created_at;
        existing.name = c.name;
      }
      existing.canReply = existing.canReply || Boolean(c.id || c.email);
      continue;
    }

    byKey.set(key, {
      key,
      name: c.name,
      counterpartId: c.id,
      counterpartEmail: c.email,
      count: 1,
      lastAt: note.created_at,
      viaEmail: !c.id,
      canReply: Boolean(c.id || c.email),
    });
  }

  return [...byKey.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

/** The timeline for one conversation, oldest first, with a derived `outgoing` flag. */
export function messagesForConversation(
  notes: VoiceNote[],
  userId: string,
  key: string
): ConversationMessage[] {
  return notes
    .filter((note) => conversationKey(note, userId) === key)
    .map((note) => ({ ...note, outgoing: note.sender_id === userId }))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

/** The requested key when it matches, else the first (most recent) conversation, else null. */
export function resolveSelectedKey(
  conversations: Conversation[],
  requested: string | undefined
): string | null {
  if (requested && conversations.some((c) => c.key === requested)) return requested;
  return conversations[0]?.key ?? null;
}
