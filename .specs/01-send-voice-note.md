# Spec: Send a Voice Note by Email

- **Status**: Verified
- **Created**: 2026-06-10
- **Last Modified**: 2026-06-10
- **Feature area**: Core send flow
- **Related**: `02-voice-recorder.md`, `03-waitlist-signup.md`

## User Story

As a person who wants to reach a loved one, I want to send my recorded voice note to their email, so that they receive it (and I keep a copy) without needing an account.

## Context

**Why**: Dearly's core purpose is letting someone send a short, heartfelt voice note to a dear one over email. The sender wants confidence the note was delivered and a copy for themselves.

**Dependencies**:
- `nodemailer` (server-side email delivery over Amazon SES SMTP)
- `@breezystack/lamejs` (client-side MP3 transcoding — see `02-voice-recorder.md` for capture)
- A running Node server for the route handler (not static-only); SES SMTP credentials kept server-side.

## Technical Specification

**Components/Modules**:
- `src/app/page.tsx` (MODIFIED/OWNER) — the main app: sender + recipient fields, validation, "Send with love" button, sending/sent states, success screen.
- `src/components/icons.tsx` — shared inline SVG icons used by the form and success screen.
- `src/lib/api.ts` — `sendNote()` client helper: transcodes the recording to MP3, builds `multipart/form-data`, POSTs to the API.
- `src/lib/audio.ts` — `encodeBlobToMp3()` client transcode used before attaching.
- `src/lib/validation.ts` — `emailOk()` shared email check.
- `src/lib/email.ts` — SES SMTP transport (Nodemailer) + `sendEmail` helper, `FROM_EMAIL`, branded HTML/text templates (`noteEmailHtml`, `noteEmailText`).

**API/Backend**:
- `POST /api/send` (`src/app/api/send/route.ts`, Node runtime) — validates fields, enforces a max audio size (20MB), then checks whether the recipient has a Dearly account (service-role `profiles` lookup):
  - **Registered recipient** → the MP3 is stored in their Dearly Inbox (`voice_notes` row with `sender_id = null`, sender name denormalized) and a lightweight notification email is sent (`to` recipient, `bcc` sender as their record, `replyTo` sender) — no attachment email.
  - **No account (or Supabase unavailable)** → classic email via SES `to` recipient, `bcc` sender, `replyTo` sender, with the MP3 attached.
- Shared helpers in `src/lib/notes.ts` (subject sanitizing, store/rollback) and `src/lib/email.ts` (`sendNewNoteNotification`) — reused by the authenticated `/api/notes` flow (spec 08).

**State/Configuration**:
- Form state `{ sName, sEmail, rName, rEmail }`, `status: "idle" | "sending" | "sent"`, `sendError: string`.
- Env: `SES_SMTP_HOST` / `SES_SMTP_USER` / `SES_SMTP_PASSWORD` (required), `SES_SMTP_PORT` (optional, default 587), `DEARLY_FROM_EMAIL` (must be a verified SES sender).

## Acceptance Criteria

- [ ] **AC1**: Sender and recipient details are validated
  - Given the form
  - When a name is blank or an email fails `emailOk`
  - Then an inline error shows under that field once the user attempts to send

- [ ] **AC2**: Sending requires a recording
  - Given a valid form but no recording
  - When the user clicks "Send with love"
  - Then a "Record a short message before sending." message appears and no request is made

- [ ] **AC3**: A valid submission sends the email
  - Given a valid form and a recording
  - When the user sends
  - Then the button shows a "Sending…" spinner, `POST /api/send` is called, and on success the success screen ("On its way.") is shown naming the recipient and their email

- [x] **AC4**: A recipient without a Dearly account receives the note by email, sender copied
  - Given a successful send to an email with no Dearly account
  - When SES delivers the email
  - Then the email goes `to` the recipient, the sender is on `bcc`, `replyTo` is the sender, and the MP3 voice note is attached

- [ ] **AC5**: Send failures are recoverable
  - Given the API returns an error
  - When sending fails
  - Then status returns to "idle" and a human-readable error is shown so the user can retry

- [x] **AC6**: "Record another note" resets the flow
  - Given the success screen
  - When the user clicks "Record another note"
  - Then the form, recording, and statuses clear back to the initial empty state

- [x] **AC7**: A registered recipient gets the note in their Dearly Inbox (Added 2026-06-11)
  - Given a recipient email that matches a Dearly account and a real recording
  - When a free (no-account) sender sends
  - Then the MP3 is stored and a `voice_notes` row created (`sender_id = null`, recipient linked), the recipient gets the "listen on Dearly" notification email instead of an attachment, and the sender is BCC'd that notification as their record

## Edge Cases

- Simulated (mic-denied) recordings have no audio blob → email is sent without an attachment, with copy explaining the note couldn't be captured (no in-app delivery — there is nothing to store).
- Audio over 20MB is rejected by the API with a clear message.
- Missing SES SMTP config (`SES_SMTP_HOST`/`SES_SMTP_USER`/`SES_SMTP_PASSWORD`) fails the request with a descriptive error rather than crashing.
- Supabase unconfigured/unreachable → the recipient-account lookup silently returns "no account" and the classic email path is used (the public flow never depends on Supabase).
- In-app delivery: if the notification email fails, the stored note is rolled back and an error returned, so the anonymous sender can retry without duplicates (unlike the logged-in flow, neither party would otherwise know).

## Changelog

### [2026-06-11] - Requirement Change (in-app delivery for registered recipients)
- **Changed**: `/api/send` now detects registered recipients (service-role `profiles` lookup) and delivers their note to the Dearly Inbox (stored MP3, `sender_id = null`) with a notification email BCC'd to the free sender, instead of an attachment email. Added AC7; AC4 scoped to non-account recipients. Shared logic extracted to `src/lib/notes.ts` (store/rollback, subject sanitizing — also used by `/api/notes`) and `sendNewNoteNotification` in `src/lib/email.ts`.
- **Reason**: Notes from non-account senders previously bypassed registered users' Inboxes and consumed their email storage — the exact thing accounts exist to avoid.
- **Breaking Changes**: None visible to senders; the success flow is unchanged. The public flow still works without Supabase (lookup degrades to the email path).
- **Author**: Claude AI

### [2026-06-11] - Re-verified
- **Author**: Claude AI
- **Status**: Verified
- **Validation Result**: COMPLIANT
- **Notes**: Re-validated after the homepage signup changes (spec 10) restructured `page.tsx`. All 6 ACs still satisfied; the send flow (validation, recording requirement, sending/sent states, error recovery, reset) is untouched. The previously noted minor issue — inline join-card signup duplicating `Waitlist.tsx` logic — is resolved: the success-screen card is now `SignupPromoCard` and waitlist signup happens only in the modal.

### [2026-06-10] - Verified
- **Author**: Claude AI
- **Status**: Verified
- **Validation Result**: COMPLIANT
- **Quality Score**: 9/10
- **Notes**: All 6 ACs satisfied. `to`/`bcc`/`replyTo` and MP3 attachment confirmed in `src/app/api/send/route.ts` + `src/lib/api.ts`. Validation, sending/sent states, error recovery, and reset confirmed in `src/app/page.tsx`. All three documented edge cases handled.
- **Issues Fixed**: None
- **Minor (non-blocking)**: Inline join-card signup logic in `page.tsx` duplicates the modal signup logic in `Waitlist.tsx`; could be extracted to a shared hook/component.
