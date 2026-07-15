# Spec: Self Notes Thread

- **Status**: Verified
- **Created**: 2026-07-11
- **Last Modified**: 2026-07-11
- **Feature area**: Accounts (epic) — Voice Notes / Threads
- **Related**: `14-chat-conversations.md`, `15-conversation-aliases.md`, `08-send-to-dearly-user.md`, `07-account-data-and-storage.md`

## User Story

As a Sona user, I want a "Self Notes" thread to be automatically ready for me, so that I can record a voice note to myself and have it emailed to the address I registered with.

## Context

**Why**: Sending a note to your own registered email already works end-to-end (self-send has no special-case blocks), but nothing surfaces it — a thread only appears once a `voice_notes` row exists, so a new user has no obvious way to discover or start one. This adds an always-present, pinned "Self Notes" thread so it's there from the moment you sign up.

**Decisions** (resolved with user):
- The thread is visible (pinned, empty) immediately on signup — not only after the first self-send.
- Created via the existing `handle_new_user` Postgres trigger (same moment the `profiles` row is created).
- Always pinned at the top of the sidebar, regardless of activity.
- Existing users are backfilled (one-time, via re-running `dev-schema.sql`).
- The user can rename it (like any thread nickname) but cannot remove/unpin it.

**Dependencies**: Thread grouping (`src/lib/threads.ts`), nicknames (`conversation_labels`, spec 15), self-send delivery (already works via `POST /api/notes`, spec 08), signup trigger (spec 07).

## Technical Specification

**Data Models** (`supabase/dev-schema.sql`, `src/lib/db/types.ts`):
- `conversation_labels` gains `pinned boolean not null default false`.
- `handle_new_user()` trigger additionally upserts a `conversation_labels` row per new user: `counterpart_key = 'id:' || new.id`, `nickname = 'Self Notes'`, `pinned = true`.
- One-time idempotent backfill statement (in `dev-schema.sql`, re-run in Supabase SQL editor): inserts the same row for every existing `profiles` row lacking one; on conflict, sets `pinned = true` without touching an existing nickname.
- `ThreadLabel` type gains `pinned: boolean`.

**Components/Modules**:
- `src/lib/threads.ts` (MODIFIED) — `Thread` gains `pinned: boolean` (default `false` from `buildThreads`). New pure function `ensureSelfThread(threads, userId, pinned)`: marks the existing `id:{userId}` thread `pinned` if present; otherwise, when `pinned` is true, synthesizes a zero-count placeholder thread (`name: "Self Notes"`, `counterpartId: userId`, `count: 0`, `canReply: true`) so it renders before any note exists. Re-sorts with pinned threads first, then by `lastAt` as today.
- `src/components/VoiceNotesClient.tsx` (MODIFIED) — `fetchData` selects `pinned` from `conversation_labels`, calls `ensureSelfThread` on the raw threads (before the existing email/nickname-resolution pass, so the placeholder gets the same treatment — nickname override, email lookup via `profiles` using its `counterpartId`).
- No changes needed to `ThreadLabelEditor` or `/api/threads/label` (partial upserts already leave `pinned` untouched).
- `src/app/api/notes/route.ts` (MODIFIED) — when the resolved recipient is the sender themselves, the email uses the sentinel `"Self Note"` as the From display name and sets `isSelfNote: true`; the stored `voice_notes.sender_name` is unaffected (still the real name).
- `src/lib/email.ts` (MODIFIED) — exports `SELF_NOTE_SENDER_NAME`; `senderFromAddress` keeps that sentinel whole instead of truncating to its first word. `noteEmailHtml`/`noteEmailText`/`sendVoiceNoteEmail` gain an `isSelfNote` option: when true, the body copy and default subject are personalized ("Your new self note is attached." / "Your self note on Sona") instead of naming the sender; non-self-note emails are unchanged.

**API/Backend**: No new endpoints.

## Acceptance Criteria

- [x] **AC1**: Self Notes exists immediately on signup
  - Given a brand-new user who just confirmed their account
  - When they open `/voicenotes`
  - Then a "Self Notes" thread is shown in the sidebar with zero messages, even though no note has been sent yet

- [x] **AC2**: Self Notes is always pinned first
  - Given a user with other active threads that have more recent activity
  - When the sidebar renders
  - Then "Self Notes" still appears at the top of the list, above all other threads

- [x] **AC3**: Sending a self note delivers to the registered email
  - Given the user opens "Self Notes" and records + sends a note
  - When it's submitted
  - Then it's stored, appears in the thread timeline, and is emailed as an MP3 attachment to the user's own registered email

- [x] **AC4**: Existing users are backfilled
  - Given a user who signed up before this feature shipped
  - When `dev-schema.sql` is re-run against their database
  - Then they also get a pinned "Self Notes" thread, without losing any nickname they'd already set for that thread

- [x] **AC5**: Self Notes can be renamed, not removed
  - Given the user opens the thread label editor on "Self Notes"
  - When they save a new nickname
  - Then the sidebar reflects the new name, it remains pinned at the top, and there is no option to unpin/remove it

- [x] **AC6**: Self-send email is personalized
  - Given a user sends themselves a voice note
  - When the delivery email is generated
  - Then the "From" display name reads "Self Note", the body reads "Your new self note is attached." (not "New voice note from Self Note attached."), and the default subject reads "Your self note on Sona" — the stored note itself still records the user's real name; emails to other people are unchanged

## Edge Cases

- A user who already messaged themselves before this feature existed has a real (non-empty) `id:{userId}` thread — backfill just adds `pinned = true` to it; no duplicate synthetic thread is created.
- If the schema change hasn't been applied yet (stale dev DB), the `pinned` column/lookup is simply absent from results, so no Self Notes thread is synthesized — behaves exactly like today until the migration runs.
- With Self Notes always present, the "no voice notes yet" empty state no longer applies to signed-up users — the app opens straight into the (empty) Self Notes thread, ready to record.

## Changelog

### [2026-07-12] - Verified (personalized self-note copy)
- **Author**: Cursor AI
- **Status**: Verified
- **Validation Result**: COMPLIANT
- **Branch**: `feature/self-notes-thread`
- **Notes**: Extended AC6. `noteEmailHtml`/`noteEmailText`/`sendVoiceNoteEmail` gain an `isSelfNote` option; when true, the body line becomes "Your new self note is attached." (with simulated/no-audio variants) instead of naming the sender, and the default subject becomes "Your self note on Sona". `POST /api/notes` passes `isSelfNote: true` alongside the existing `"Self Note"` sender-name swap for self-sends. Non-self-note emails are byte-for-byte unchanged (verified by existing tests still passing). 105 unit tests (4 new), tsc, lint, and the production build all pass.
- **Deviations**: None.

### [2026-07-12] - Verified (Self Note sender name)
- **Author**: Cursor AI
- **Status**: Verified
- **Validation Result**: COMPLIANT
- **Branch**: `feature/self-notes-thread`
- **Notes**: Added AC6. `POST /api/notes` detects a self-send (resolved recipient id === sender id) and swaps the email's `senderName` for the new `SELF_NOTE_SENDER_NAME` ("Self Note") sentinel — the stored `voice_notes.sender_name` still records the user's real name, so nothing else (threads, nicknames) is affected. `senderFromAddress` special-cases that sentinel so it isn't truncated to its first word like normal names are. 101 unit tests (2 new), tsc, and lint all pass.
- **Deviations**: None.

### [2026-07-11] - Verified
- **Author**: Cursor AI
- **Status**: Verified
- **Validation Result**: COMPLIANT (static — the trigger/backfill DDL must be applied to Supabase: re-run `dev-schema.sql`)
- **Branch**: `feature/self-notes-thread`
- **Notes**: `conversation_labels` gains `pinned` (+ idempotent column-add for existing installs); `handle_new_user()` now also seeds a pinned `Self Notes` label per new signup; a backfill statement grants it to every existing profile without clobbering an already-set nickname. New pure `ensureSelfThread(threads, userId, pinned)` in `threads.ts` pins the real self thread if present, else synthesizes a zero-count placeholder, then sorts pinned-first — unit-tested (4 new cases, including the "not pinned yet" no-op and "don't duplicate" cases). `VoiceNotesClient` fetches the `pinned` column and merges it in before the existing nickname/email-resolution pass, so the placeholder gets a real reply-capable counterpart (`counterpartId = userId`) with no other code changes needed for self-send (already worked). `VoiceNotesSidebar` guards the day-label against the placeholder's empty `lastAt`. `tsc --noEmit`, ESLint, 99 unit tests (4 new), and the production build all pass.
- **Deviations**: None.

### [2026-07-11] - Approved
- **Author**: Cursor AI
- **Status**: Approved
- **Notes**: Reviewed: 79 lines, single capability, 5 well-formed ACs, no code examples, no critical issues. Ready for implementation.

### [2026-07-11] - Draft
- **Author**: Cursor AI
- **Status**: Draft
- **Notes**: Initial draft from a `grill-me`-style clarification: pinned + always-visible (not send-triggered), created via the signup trigger, backfilled for existing users, renameable but not removable.
