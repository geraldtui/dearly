# Spec: Asynchronous Voice Note Sending

- **Status**: Verified
- **Created**: 2026-07-01
- **Last Modified**: 2026-07-01
- **Feature area**: Accounts (epic) — Voice Notes / Threads
- **Related**: `14-chat-conversations.md`, `17-chat-navigation-performance.md`, `08-send-to-dearly-user.md`

## User Story

As a Sona user replying in a voice-note thread, I want sending to happen in the background so that clicking Send doesn't block me, and I want the thread to show the note as "Sending..." until it's delivered, so that I always know its status.

## Context

**Why**: Today `VoiceNoteComposer` awaits `POST /api/notes` before clearing the recorder, so the user stares at a spinner (upload + MP3 transcode + email/storage) before they can record the next note. This makes back-and-forth conversation feel slow.

**Constraint**: There is no background job/queue infrastructure (no worker, no queue service) — only Next.js API routes. "Asynchronous" here means **client-side optimistic sending**: the composer resets immediately and the network request (`sendAccountNote`) continues via `fetch` without blocking the UI. Closing the tab mid-request loses that one in-flight send (same risk that exists implicitly today).

**Decisions** (resolved with user):
- Pending-send tracking is lifted to the top-level `VoiceNotesClient` (not the composer), so it survives switching threads — a send started in thread A keeps resolving/failing even if the user moves to thread B and back.
- Failed sends show a "Failed to send" bubble with a **Retry** button that resends the original payload (no re-recording).
- **Scope**: this covers **replying within an existing thread** (the common, fast back-and-forth case). Starting a brand-new thread (`mode="new"`, no existing counterpart) keeps today's synchronous blocking send — there's no thread timeline yet to attach a pending bubble to, and it's a comparatively rare, deliberate action. This is a deliberate v1 scope limit, documented here for visibility.

**Dependencies**: `sendAccountNote` (`src/lib/api.ts`), thread grouping (`src/lib/threads.ts`), `VoiceNoteComposer`/`VoiceNoteThread`/`VoiceNotesClient` (`14`, `17`).

## Technical Specification

**Data Models**: No schema changes. Purely client-side, in-memory state.

**Components/Modules**:
- `src/lib/pendingSends.ts` (NEW, pure) — `PendingSend` type (`id`, `threadKey`, `status: "sending" | "failed"`, `error`, `durationSeconds`, `createdAt`, `payload: AccountNotePayload`); `createPendingSend(threadKey, payload)`; `pendingForThread(pending, threadKey)` (filter + sort oldest-first, matching `messagesForThread`).
- `src/components/VoiceNotesClient.tsx` (MODIFIED) — owns `pendingSends: PendingSend[]` state. `handleSend(threadKey, payload)` creates a pending entry, appends it, and fires `sendAccountNote` without awaiting the UI; on success removes the pending entry and calls `fetchData()` (the real message replaces it); on failure marks it `"failed"` with the error message. `handleRetryPending(id)` re-runs the same payload. Passes `pendingForThread(pendingSends, selectedKey)` + the two handlers into `VoiceNoteThread`.
- `src/components/VoiceNoteThread.tsx` (MODIFIED) — accepts `pendingMessages`, `onSend`, `onRetryPending`. Renders a new `PendingBubble` after the real messages in the "thread" branch (outgoing side): spinner + "Sending…" while `status === "sending"`, or "Failed to send" + Retry button while `"failed"`. Passes `onSend` into `VoiceNoteComposer` (reply mode only).
- `src/components/VoiceNoteComposer.tsx` (MODIFIED) — new optional `onSend?: (payload) => void` prop. Reply-mode send path becomes synchronous: builds the payload, clears the recording/subject/touched state immediately, and calls `onSend(payload)` instead of awaiting `sendAccountNote` itself. New-mode send path (`sendNew`) is unchanged (still blocking, per scope decision above).
- `src/app/globals.css` (MODIFIED) — `.msg.pending .msg-bubble` (reduced opacity while sending), `.msg.failed .msg-bubble` (error tint), `.msg-pending-status` (spinner/error row), `.msg-retry` button.

**State/Configuration**: `pendingSends` is in-memory only (React state on `VoiceNotesClient`); it is not persisted to storage and is lost on a full page reload (acceptable — the actual send request also runs client-side, so a reload while sending abandons that request either way, same as today).

## Acceptance Criteria

- [x] **AC1**: Reply send is non-blocking
  - Given a recorded reply in an existing thread
  - When the user clicks Send
  - Then the composer clears and is ready to record another note immediately, before the network request resolves

- [x] **AC2**: Thread shows the note as "Sending…"
  - Given a reply send just started
  - When the thread renders
  - Then a pending bubble appears at the bottom of that thread's timeline (outgoing side) with a spinner and "Sending…"

- [x] **AC3**: Pending state persists across thread switches
  - Given a reply is sending in thread A
  - When the user switches to thread B and back to thread A before it resolves
  - Then thread A still shows the correct "Sending…" (or resolved/failed) status

- [x] **AC4**: Successful send resolves automatically
  - Given the background request for a pending send succeeds
  - When the response returns
  - Then the pending bubble disappears and the real stored message appears in its place (via a data refresh), with no user action required

- [x] **AC5**: Failed send shows Retry
  - Given the background request for a pending send fails
  - When the response returns
  - Then the bubble shows "Failed to send" with a Retry button that resends the same recording/payload without re-recording

- [x] **AC6**: Concurrent sends across threads are independent
  - Given sends started in thread A and thread B
  - When both are in flight
  - Then each resolves or fails on its own without affecting the other's bubble

## Edge Cases

- New-thread (`mode="new"`) sends remain synchronous/blocking in v1 — no pending bubble, matches current behavior (deliberate scope limit, see Context).
- Full page reload while a send is pending → the pending entry (and the in-flight request) is lost; if the request had already reached the server before reload, the note may still be delivered but won't show until the next natural refresh.
- Retrying a failed send re-triggers MP3 upload with the already-encoded blob (no re-transcoding needed since the payload's `Recording` is retained as-is).
- Deleting/navigating away entirely (closing the app) does not cancel the underlying `fetch` — it simply stops being tracked in UI state.

## Testing

- Unit tests for `src/lib/pendingSends.ts` (`createPendingSend` fields, `pendingForThread` filter + order).
- Manual QA: send a reply, confirm composer clears instantly and a "Sending…" bubble appears; switch threads mid-send and confirm it resolves correctly; simulate a failure (e.g. throttle/offline) and confirm Retry works.

## Changelog

### [2026-07-01] - Verified
- **Author**: Cursor AI
- **Status**: Verified
- **Notes**: Implemented on `feature/async-voice-note-sending`. Added `src/lib/pendingSends.ts` (pure `PendingSend` model + `createPendingSend`/`pendingForThread`, unit-tested). `VoiceNoteComposer` splits reply sends (`sendReply`: clears state synchronously, hands the payload to the parent via `onSend`) from new-note sends (`sendNew`: unchanged blocking flow). `VoiceNotesClient` owns `pendingSends` state and `runPendingSend`/`handleSend`/`handleRetryPending`, firing `sendAccountNote` without awaiting the UI; success silently refetches (`fetchData({ silent: true })` — added a `silent` option so the background refresh doesn't flash the full loading skeleton over the thread) and failure marks the entry `"failed"`. `VoiceNoteThread` renders a new `PendingBubble` (spinner/"Sending…" or "Failed to send" + Retry) after the real messages. All 6 ACs verified; `tsc --noEmit`, ESLint, 95 unit tests (5 new), 4 E2E, and a clean production build all pass.
- **Deviations**: None beyond the scope already documented in Context (new-thread sends stay synchronous). Added one unplanned improvement: made the post-send data refresh silent (no full loading-skeleton flash) so the optimistic UI actually feels seamless — this also improves the pre-existing new-note send flow's refresh, not just the new reply path.

### [2026-07-01] - Approved
- **Author**: Cursor AI
- **Status**: Approved
- **Notes**: Decisions resolved with the user: pending state lifted to `VoiceNotesClient` (persists across thread switches), failures show a Retry button. Scoped to reply-in-thread sends (new-thread sends stay synchronous in v1, called out explicitly). 6 testable ACs. Ready for implementation.
