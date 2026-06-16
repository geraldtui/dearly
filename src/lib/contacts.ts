/* Derive per-person contacts from notes for the Inbox/Sent sidebars. Pure, no I/O. */

import type { VoiceNote } from "@/lib/db/types";

export type ContactView = "received" | "sent";

export interface Contact {
  /** Stable grouping id used as the `c` query param. */
  key: string;
  name: string;
  count: number;
  /** ISO timestamp of the most recent note with this contact. */
  lastAt: string;
  /** True for Sent contacts delivered by email (no Dearly account). */
  viaEmail: boolean;
}

function counterpartId(note: VoiceNote, view: ContactView): string | null {
  return view === "received" ? note.sender_id : note.recipient_id;
}

function counterpartName(note: VoiceNote, view: ContactView): string {
  const raw = view === "received" ? note.sender_name : note.recipient_name;
  return raw?.trim() || "Someone";
}

/** Grouping id: the counterpart's account id, or a name-based key when absent. */
export function contactKey(note: VoiceNote, view: ContactView): string {
  const id = counterpartId(note, view);
  if (id) return id;
  return `name:${counterpartName(note, view).toLowerCase()}`;
}

/** Groups notes into contacts, most recent activity first. */
export function buildContacts(notes: VoiceNote[], view: ContactView): Contact[] {
  const byKey = new Map<string, Contact>();

  for (const note of notes) {
    const key = contactKey(note, view);
    const existing = byKey.get(key);
    if (existing) {
      existing.count += 1;
      if (note.created_at > existing.lastAt) existing.lastAt = note.created_at;
      continue;
    }
    byKey.set(key, {
      key,
      name: counterpartName(note, view),
      count: 1,
      lastAt: note.created_at,
      viaEmail: view === "sent" && !counterpartId(note, view),
    });
  }

  return [...byKey.values()].sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

/** Notes exchanged with one contact. */
export function notesForContact(notes: VoiceNote[], view: ContactView, key: string): VoiceNote[] {
  return notes.filter((note) => contactKey(note, view) === key);
}

/** The requested key when it matches a contact, else the first contact (default), else null. */
export function resolveSelectedKey(contacts: Contact[], requested: string | undefined): string | null {
  if (requested && contacts.some((c) => c.key === requested)) return requested;
  return contacts[0]?.key ?? null;
}
