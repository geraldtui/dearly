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
- `resend` (server-side email delivery)
- `@breezystack/lamejs` (client-side MP3 transcoding — see `02-voice-recorder.md` for capture)
- A running Node server for the route handler (not static-only); Resend API key kept server-side.

## Technical Specification

**Components/Modules**:
- `src/app/page.tsx` (MODIFIED/OWNER) — the main app: sender + recipient fields, validation, "Send with love" button, sending/sent states, success screen.
- `src/components/icons.tsx` — shared inline SVG icons used by the form and success screen.
- `src/lib/api.ts` — `sendNote()` client helper: transcodes the recording to MP3, builds `multipart/form-data`, POSTs to the API.
- `src/lib/audio.ts` — `encodeBlobToMp3()` client transcode used before attaching.
- `src/lib/validation.ts` — `emailOk()` shared email check.
- `src/lib/email.ts` — Resend client factory, `FROM_EMAIL`, branded HTML/text templates (`noteEmailHtml`, `noteEmailText`).

**API/Backend**:
- `POST /api/send` (`src/app/api/send/route.ts`, Node runtime) — validates fields, enforces a max audio size (20MB), sends via Resend `to` recipient, `bcc` sender, `replyTo` sender, with the MP3 as an attachment.

**State/Configuration**:
- Form state `{ sName, sEmail, rName, rEmail }`, `status: "idle" | "sending" | "sent"`, `sendError: string`.
- Env: `RESEND_API_KEY` (required), `DEARLY_FROM_EMAIL` (optional, defaults to Resend onboarding sender).

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

- [ ] **AC4**: The recipient receives the note and the sender is copied
  - Given a successful send
  - When Resend delivers the email
  - Then the email goes `to` the recipient, the sender is on `bcc`, `replyTo` is the sender, and the MP3 voice note is attached

- [ ] **AC5**: Send failures are recoverable
  - Given the API returns an error
  - When sending fails
  - Then status returns to "idle" and a human-readable error is shown so the user can retry

- [ ] **AC6**: "Record another note" resets the flow
  - Given the success screen
  - When the user clicks "Record another note"
  - Then the form, recording, and statuses clear back to the initial empty state

## Edge Cases

- Simulated (mic-denied) recordings have no audio blob → email is sent without an attachment, with copy explaining the note couldn't be captured.
- Audio over 20MB is rejected by the API with a clear message.
- Missing `RESEND_API_KEY` fails the request with a descriptive error rather than crashing.

## Changelog

### [2026-06-10] - Verified
- **Author**: Claude AI
- **Status**: Verified
- **Validation Result**: COMPLIANT
- **Quality Score**: 9/10
- **Notes**: All 6 ACs satisfied. `to`/`bcc`/`replyTo` and MP3 attachment confirmed in `src/app/api/send/route.ts` + `src/lib/api.ts`. Validation, sending/sent states, error recovery, and reset confirmed in `src/app/page.tsx`. All three documented edge cases handled.
- **Issues Fixed**: None
- **Minor (non-blocking)**: Inline join-card signup logic in `page.tsx` duplicates the modal signup logic in `Waitlist.tsx`; could be extracted to a shared hook/component.
