# Spec: Send a Voice Note to a Dearly User (Hybrid)

- **Status**: Verified
- **Created**: 2026-06-11
- **Last Modified**: 2026-06-11
- **Feature area**: Accounts (epic)
- **Related**: `docs/dearly-accounts-architecture.md`, `01-send-voice-note.md`, `07-account-data-and-storage.md`

## User Story

As a logged-in Dearly user, I want to send a voice note by recipient email, so that Dearly delivers it to their in-app inbox if they have an account, or emails it to them if they don't.

## Context

**Why**: This is the heart of the accounts model — notes addressed to Dearly users are stored and delivered in-app (saving inbox space), while everyone else still receives the existing email-with-attachment. It reuses the existing recorder and client-side MP3 transcode.

**Dependencies**:
- Auth/session (`06-account-auth.md`), schema/storage/RLS (`07-account-data-and-storage.md`).
- Existing send flow (`01-send-voice-note.md`, `/api/send`) for the non-user fallback.
- Existing recorder + MP3 transcode (`02-voice-recorder.md`, `src/lib/audio.ts`).

## Technical Specification

**Components/Modules**:
- `src/app/api/notes/route.ts` (NEW) — authenticated POST: accepts MP3 + recipient email + subject/duration; looks up recipient in `profiles`.
  - **Match** → upload MP3 to Storage, insert `voice_notes` row, send notification email.
  - **No match** → store the sender's copy first (Storage upload + `voice_notes` row with `recipient_id = null`), then email the recipient the MP3 attachment **without BCC'ing the sender** — the stored copy under "Sent" replaces the BCC. If the email fails, the stored copy is cleaned up so a retry can't duplicate it.
- `src/lib/email.ts` (MODIFIED) — add a `newNoteNotificationEmail(...)` template (recipient name + listen link), reusing the existing branded style; `sendVoiceNoteEmail` gains a `bccSender` flag (default `true`; the account fallback passes `false` — the public no-account flow keeps its BCC).
- `supabase/migrations/0002_sent_copies.sql` (NEW) — `voice_notes.recipient_id` becomes nullable so email-fallback sends can be stored as sender-only rows (existing RLS already scopes them to the sender).
- `src/app/(app)/compose/page.tsx` (NEW) — authenticated compose screen reusing `VoiceRecorder`; recipient is entered by email.
- `src/lib/api.ts` (MODIFIED) — add a client helper to POST to `/api/notes`.

**API/Backend**:
- `POST /api/notes` (auth required) — multipart form-data (audio, recipientEmail, subject, durationSeconds).

## Acceptance Criteria

- [ ] **AC1**: In-app delivery to a Dearly user
  - Given a logged-in sender and a recipient email that matches a Dearly account
  - When the sender submits a recorded note
  - Then the MP3 is uploaded to Storage and a `voice_notes` row is created linking sender and recipient (no attachment emailed)

- [ ] **AC2**: Notification email for in-app delivery
  - Given an in-app delivery succeeded
  - When the row is created
  - Then the recipient gets a lightweight "you have a new voice note" email containing a link to their inbox (not the audio file)

- [x] **AC3**: Email fallback for non-users keeps the sender's copy in Dearly
  - Given a recipient email with no matching Dearly account
  - When the sender submits a recorded note
  - Then the recipient receives the email with the MP3 attached, the sender is NOT BCC'd, and the sender's copy is stored (Storage object + `voice_notes` row with `recipient_id = null`) so it appears in their Sent view

- [ ] **AC4**: Auth required
  - Given an unauthenticated request to `POST /api/notes`
  - When it is received
  - Then it is rejected (401) and nothing is stored

- [ ] **AC5**: Sender identity is trusted from the session
  - Given the POST
  - When the row is written
  - Then `sender_id` is taken from the authenticated session (not client input), satisfying RLS

- [ ] **AC6**: Size and validation limits
  - Given an oversized audio file or invalid email
  - When submitted
  - Then the request is rejected with a friendly error and nothing is stored

## Edge Cases

- Recipient email equals the sender's own account → allowed (note to self) or blocked; v1 allows it.
- Storage upload succeeds but row insert fails → the uploaded object is cleaned up (no orphan).
- Recipient email matching is case-insensitive (normalized lower-case).
- Email-fallback with a simulated (audio-less) recording → email is sent without an attachment and nothing is stored (there is no audio to keep).
- Email-fallback email send fails after the copy was stored → the copy (row + object) is removed and an error returned, so retrying can't create duplicates.

## Changelog

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
