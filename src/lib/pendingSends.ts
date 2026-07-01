/* Client-side, in-memory tracking for optimistic (fire-and-forget) sends. Pure, no I/O. */

import type { AccountNotePayload } from "@/lib/api";

export type PendingSendStatus = "sending" | "failed";

export interface PendingSend {
  id: string;
  threadKey: string;
  status: PendingSendStatus;
  error: string;
  durationSeconds: number;
  createdAt: string;
  payload: AccountNotePayload;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createPendingSend(threadKey: string, payload: AccountNotePayload): PendingSend {
  return {
    id: makeId(),
    threadKey,
    status: "sending",
    error: "",
    durationSeconds: Math.round(payload.recording?.duration ?? 0),
    createdAt: new Date().toISOString(),
    payload,
  };
}

/** Pending sends for one thread, oldest first (matches `messagesForThread` ordering). */
export function pendingForThread(pending: PendingSend[], threadKey: string): PendingSend[] {
  return pending
    .filter((p) => p.threadKey === threadKey)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}
