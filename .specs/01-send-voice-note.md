# Spec: Send a Voice Note by Email

- **Status**: Verified
- **Created**: 2026-06-10
- **Last Modified**: 2026-06-20
- **Feature area**: Core send flow
- **Related**: `02-voice-recorder.md`, `03-waitlist-signup.md`, `08-send-to-dearly-user.md`

## User Story

As a person who wants to reach a loved one, I want to send my recorded voice note to their email, so that they receive it without me getting a copy in my inbox.

## Context

**Why**: Dearly's core purpose is letting someone send a short, heartfelt voice note to a dear one over email. Senders should not receive a BCC copy — the note goes only to the recipient. Logged-in users already keep a copy in Dearly (spec 08); the public homepage flow has no sender archive.

**Dependencies**:
- `nodemailer` (server-side email delivery over Amazon SES SMTP)
- `@breezystack/lamejs` (client-side MP3 transcoding — see `02-voice-recorder.md` for capture)
- A running Node server for the route handler (not static-only); SES SMTP credentials kept server-side.

## Technical Specification

**Components/Modules**:
- `src/app/page.tsx` (MODIFIED/OWNER) — the main app: sender + recipient fields, validation, "Send with love" button, sending/sent states, success screen.
- `src/lib/api.ts` — `sendNote()` client helper: transcodes the recording to MP3, builds `multipart/form-data`, POSTs to the API.
- `src/lib/email.ts` — `sendVoiceNoteEmail` / `sendNewNoteNotification` do **not** BCC the sender by default (`bccSender` is opt-in only).

**API/Backend**:
- `POST /api/send` (`src/app/api/send/route.ts`, Node runtime) — validates fields, enforces a max audio size (20MB), then checks whether the recipient has a Dearly account (service-role `profiles` lookup):
  - **Registered recipient** → the MP3 is stored in their Dearly Inbox (`voice_notes` row with `sender_id = null`) and a lightweight notification email is sent (`to` recipient, `replyTo` sender) — no attachment, **no sender BCC**.
  - **No account (or Supabase unavailable)** → classic email via SES `to` recipient, `replyTo` sender, MP3 attached — **no sender BCC**.

**State/Configuration**: Unchanged.

## Acceptance Criteria

- [x] **AC1**: Sender and recipient details are validated
  - Given the form
  - When a name is blank or an email fails `emailOk`
  - Then an inline error shows under that field once the user attempts to send

- [x] **AC2**: Sending requires a recording
  - Given a valid form but no recording
  - When the user clicks "Send with love"
  - Then a "Record a short message before sending." message appears and no request is made

- [x] **AC3**: A valid submission sends the email
  - Given a valid form and a recording
  - When the user sends
  - Then the button shows a "Sending…" spinner, `POST /api/send` is called, and on success the success screen ("On its way.") is shown naming the recipient and their email

- [x] **AC4**: Recipient receives the note; sender is not copied
  - Given a successful send to an email with no Dearly account
  - When SES delivers the email
  - Then the email goes `to` the recipient only (sender is **not** on `bcc`), `replyTo` is the sender, and the MP3 voice note is attached

- [x] **AC5**: Send failures are recoverable
  - Given the API returns an error
  - When sending fails
  - Then status returns to "idle" and a human-readable error is shown so the user can retry

- [x] **AC6**: "Record another note" resets the flow
  - Given the success screen
  - When the user clicks "Record another note"
  - Then the form, recording, and statuses clear back to the initial empty state

- [x] **AC7**: A registered recipient gets the note in their Dearly Inbox
  - Given a recipient email that matches a Dearly account and a real recording
  - When a free (no-account) sender sends
  - Then the MP3 is stored and a `voice_notes` row created, the recipient gets the "listen on Dearly" notification email, and the sender is **not** BCC'd

## Edge Cases

- Simulated (mic-denied) recordings → email without attachment; no sender BCC.
- In-app delivery: notification failure still rolls back the stored note (unchanged).
- Authenticated sends (`/api/notes`, spec 08) were already no-BCC; unchanged.

## Changelog

### [2026-06-20] - Verified
- **Author**: Claude AI
- **Status**: Verified
- **Notes**: Removed sender BCC from public `/api/send` flow. `sendVoiceNoteEmail` default flipped to no BCC; `/api/send` no longer passes `bccSender: true`. 102 unit tests pass.

### [2026-06-20] - Approved
- **Author**: Claude AI
- **Status**: Approved
- **Notes**: Per user request, removed sender BCC from the public send flow. AC4/AC7 rewritten; user story updated. `sendVoiceNoteEmail` and `sendNewNoteNotification` no longer BCC by default; `/api/send` stops passing `bccSender: true`. Authenticated flow (spec 08) already used `bccSender: false`.

### [2026-06-11] - Requirement Change (in-app delivery for registered recipients)
- **Changed**: `/api/send` now detects registered recipients and delivers to Dearly Inbox with notification email.
- **Author**: Claude AI

### [2026-06-10] - Verified
- **Author**: Claude AI
- **Status**: Verified (superseded by 2026-06-20 BCC removal)
