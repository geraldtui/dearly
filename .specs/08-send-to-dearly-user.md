# Spec: Send a Voice Note to a Dearly User (Hybrid + Dual Delivery)

- **Status**: Verified
- **Created**: 2026-06-11
- **Last Modified**: 2026-06-16
- **Feature area**: Accounts (epic)
- **Related**: `docs/dearly-accounts-architecture.md`, `01-send-voice-note.md`, `07-account-data-and-storage.md`

## User Story

As a logged-in Dearly user, I want every voice note I send to be both emailed to the recipient as an MP3 attachment and kept in my Dearly account, so that the file always lives in two places.

## Context

**Why**: The default for a logged-in send is now **dual delivery** — the recipient always gets the MP3 attached to their email, and the sender always keeps a stored copy in Dearly (their "Sent" view). When the recipient is a Dearly user they *additionally* get the note in their in-app Inbox (the same stored row) with a "Listen on Dearly" link in the email. This trades the old inbox-space optimization for redundancy: the file reliably exists in the recipient's email and in Dearly. It reuses the existing recorder and client-side MP3 transcode. Scope is the authenticated flow (`/api/notes`) only; the public no-account flow (`01-send-voice-note.md`) is unchanged.

**Dependencies**:
- Auth/session (`06-account-auth.md`), schema/storage/RLS (`07-account-data-and-storage.md`).
- Existing send flow (`01-send-voice-note.md`, `/api/send`) for the non-user fallback.
- Existing recorder + MP3 transcode (`02-voice-recorder.md`, `src/lib/audio.ts`).

## Technical Specification

**Components/Modules**:
- `src/app/api/notes/route.ts` (MODIFIED) — authenticated POST: accepts MP3 + recipient email + subject/duration; looks up recipient in `profiles`. With audio, it **always** stores a `voice_notes` row and **always** emails the MP3 as an attachment (`bccSender: false` — the stored copy replaces the BCC).
  - **Recipient is a Dearly user** → row stored under the recipient's folder (`recipient_id` set) so it shows in their Inbox *and* the sender's Sent; the attachment email also carries a "Listen on Dearly" link. A failed email is non-fatal (the note is already delivered in-app).
  - **No account** → row stored under the sender's folder (`recipient_id = null`, sender's Sent only). If the email fails, the stored copy is rolled back so a retry can't duplicate it.
  - **No audio (simulated)** → a heads-up email is sent with no attachment and nothing is stored.
- `src/lib/email.ts` (MODIFIED) — `sendVoiceNoteEmail`/`noteEmailHtml`/`noteEmailText` gain an optional `inboxUrl` that renders a "Listen on Dearly" CTA when the recipient has an account (now pointing at `/chats`). `sendNewNoteNotification` remains for the public flow (spec 01).
- Compose UI (UPDATED 2026-06-18) — the standalone `/compose` page + `ComposeForm` were superseded by the in-thread `ChatComposer` (`14-chat-conversations.md`); `/compose` now redirects to `/chats`. Sends still go through `POST /api/notes`; success/feedback is shown inline in the chat thread.
- `src/lib/api.ts` — `sendAccountNote` still reports `delivery`; it also accepts an optional `alias` (the sender's per-conversation display name, spec 15).
- `/api/notes` resolves `sender_name` from the per-conversation alias when set (spec 15), else the profile name, and persists `recipient_email` on the stored row (spec 14) so the thread stays replyable.
- `supabase/migrations/0002_sent_copies.sql` (existing) — nullable `recipient_id` already supports sender-only rows.

**API/Backend**:
- `POST /api/notes` (auth required) — multipart form-data (audio, recipientEmail, subject, durationSeconds).

## Acceptance Criteria

- [x] **AC1**: Recipient always gets the MP3 attached by email
  - Given a logged-in sender and a real recording
  - When the sender submits the note (recipient with OR without a Dearly account)
  - Then the recipient receives the email with the MP3 attached and the sender is NOT BCC'd

- [x] **AC2**: Sender always keeps a stored copy
  - Given a successful send with a real recording
  - When the note is processed
  - Then a `voice_notes` row + Storage object is stored that appears in the sender's Sent view (under the recipient's folder when they have an account, else `recipient_id = null` under the sender's folder)

- [x] **AC3**: Dearly-user recipients also get the in-app Inbox copy + listen link
  - Given a recipient email that matches a Dearly account and a real recording
  - When the sender submits the note
  - Then the same stored row appears in the recipient's Inbox, and their attachment email includes a "Listen on Dearly" link; a failed email is non-fatal because the note is already delivered in-app

- [x] **AC4**: Auth required
  - Given an unauthenticated request to `POST /api/notes`
  - When it is received
  - Then it is rejected (401) and nothing is stored

- [x] **AC5**: Sender identity is trusted from the session
  - Given the POST
  - When the row is written
  - Then `sender_id` is taken from the authenticated session (not client input), satisfying RLS

- [x] **AC6**: Size and validation limits
  - Given an oversized audio file or invalid email
  - When submitted
  - Then the request is rejected with a friendly error and nothing is stored

## Edge Cases

- Recipient email equals the sender's own account → allowed (note to self) or blocked; v1 allows it.
- Storage upload succeeds but row insert fails → the uploaded object is cleaned up (no orphan).
- Recipient email matching is case-insensitive (normalized lower-case).
- Simulated (audio-less) recording → a heads-up email is sent without an attachment and nothing is stored (there is no audio to keep), for any recipient.
- No-account email send fails after the copy was stored → the copy (row + object) is removed and an error returned, so retrying can't create duplicates.
- Dearly-user recipient with a failed attachment email → the send still succeeds (note is in their Inbox); the failure is logged, not surfaced as an error.

## Changelog

### [2026-06-18] - Re-verified (chat UI + aliases + recipient_email)
- **Author**: Claude AI
- **Status**: Verified
- **Validation Result**: COMPLIANT
- **Notes**: The dual-delivery contract on `POST /api/notes` (all 6 ACs) is unchanged, but its surroundings moved: the standalone `/compose` + `ComposeForm` were replaced by the in-thread `ChatComposer` (`14-chat-conversations.md`) and `/compose` now redirects to `/chats`; the "Listen on Dearly" `inboxUrl` CTA points at `/chats`; the stored row now also persists `recipient_email` (so email-only threads stay replyable); and `sender_name` is resolved from a per-conversation alias when set (`15-conversation-aliases.md`), falling back to the profile name. tsc, lint, the full unit suite, and the production build pass.

### [2026-06-16] - Verified (dual delivery)
- **Author**: Claude AI
- **Status**: Verified
- **Validation Result**: COMPLIANT
- **Branch**: `feature/dual-delivery-default`
- **Notes**: `/api/notes` now always stores the note + emails the MP3 attachment (`bccSender: false`); a shared `emailRecipient` helper removes branch duplication. Dearly-user recipients keep the Inbox row (owner = recipient folder) and get a "Listen on Dearly" CTA via the new optional `inboxUrl` on `sendVoiceNoteEmail`/`noteEmailHtml`/`noteEmailText`; their email failure is non-fatal. No-account sends roll back the stored copy on email failure. Simulated/no-audio sends a heads-up email and stores nothing. `ComposeForm` success copy updated. All 6 ACs satisfied; lint, tsc, production build, and 91 unit tests pass.

### [2026-06-16] - Requirement Change (dual delivery default) — Approved
- **Changed**: The default for `/api/notes` is now **dual delivery**: every send with audio emails the recipient the MP3 attachment **and** stores the sender's Dearly copy. Dearly-user recipients additionally keep the in-app Inbox row (same row) and get a "Listen on Dearly" link in the email (previously they got a notification-only email with no attachment). AC1/AC2 rewritten, AC3 repurposed; `sendVoiceNoteEmail` gains an optional `inboxUrl` CTA.
- **Reason**: User wants every voice note stored in two places — the recipient's email and their own Dearly account.
- **Scope**: Authenticated flow only. The public no-account flow (`01-send-voice-note.md`) is unchanged.
- **Author**: Claude AI

### [2026-06-11] - Verified (sent copies)
- **Author**: Claude AI
- **Status**: Verified
- **Validation Result**: COMPLIANT (static — DB change requires migration `0002_sent_copies.sql` to be applied)
- **Notes**: Fallback now calls `storeNote` (shared with the in-app branch — upload + insert + orphan cleanup) with `recipient_id = null` under the sender's storage folder, then emails with `bccSender: false`; on email failure the stored copy is rolled back via `removeStoredNote`. Simulated/audio-less sends store nothing. All 6 ACs satisfied; lint, tsc and production build pass.

### [2026-06-11] - Requirement Change
- **Changed**: The email fallback no longer BCCs the sender; instead the sender's copy is saved to blob storage (Storage + `voice_notes` row with null `recipient_id`) and appears under "Sent". AC3 rewritten; migration `0002_sent_copies.sql` added (nullable `recipient_id`).
- **Reason**: User wants their voice notes saved in Dearly instead of cluttering their email via BCC.
- **Scope**: Account sends only (`/api/notes`). The public no-account flow (`/api/send`, spec 01) keeps its BCC — confirmed with user.
- **Author**: Claude AI

### [2026-06-11] - Approved
- **Author**: Claude AI
- **Status**: Approved (planning — not yet implemented)
- **Notes**: Part of the Dearly Accounts epic. Hybrid send (6 ACs): in-app for users + notification email; existing email-with-attachment for non-users. Reuses recorder/transcode and the current send flow.

### [2026-06-11] - Implemented & Verified
- **Author**: Claude AI
- **Status**: Verified
- **Validation Result**: COMPLIANT (static — runtime pending Supabase env vars)
- **Branch**: `feature/dearly-accounts`
- **Notes**: Added `api/notes` (auth 401; sender identity from session; service-role recipient lookup; match → Storage upload + RLS insert + notification email with inbox link; no match → shared `sendVoiceNoteEmail` fallback; upload orphan cleanup on insert failure; 20MB/email validation). Added `newNoteNotificationHtml/Text` + extracted `sendVoiceNoteEmail` into `src/lib/email.ts` (also refactored `/api/send` to use it — DRY, behavior unchanged). Added `(app)/compose` page + `ComposeForm` (reuses `VoiceRecorder`; success copy reflects in-app vs email delivery) and `sendAccountNote` in `src/lib/api.ts` (shared `appendRecording` helper). All 6 ACs satisfied statically; lint + build pass.
