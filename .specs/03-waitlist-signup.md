# Spec: Join the Feature Waitlist

- **Status**: Verified
- **Created**: 2026-06-10
- **Last Modified**: 2026-06-10
- **Feature area**: Growth / waitlist
- **Related**: `01-send-voice-note.md`

## User Story

As an early-preview visitor, I want to leave my email to be notified about upcoming features, so that I hear when capabilities like saved contacts and video notes arrive.

## Context

**Why**: Dearly is an early preview. Capturing interested visitors' emails lets the team gauge demand and notify people when teased features ship. Signups are surfaced to the team by email.

**Dependencies**:
- `resend` (server-side delivery of the signup notification).
- Shares `emailOk()` validation and the Resend client/templates in `src/lib/email.ts`.

## Technical Specification

**Components/Modules**:
- `src/components/Waitlist.tsx` (OWNER) — roadmap modal listing six upcoming features; email input with validation; submitting + joined states; Escape/overlay-click to close.
- `src/app/page.tsx` — entry points: footer "see what's coming" link (opens modal) and the success-screen "Be first in line" join card (inline signup + "+ 3 more" opens modal).
- `src/lib/api.ts` — `joinWaitlist(email, source)` client helper.
- `src/components/icons.tsx` — `FEATURES` list + `FEAT_ICON` glyphs.

**API/Backend**:
- `POST /api/waitlist` (`src/app/api/waitlist/route.ts`, Node runtime) — validates email, emails the signup (with `source`) to the configured inbox via Resend.

**State/Configuration**:
- Env: `WAITLIST_NOTIFY_EMAIL` (inbox for signups). If unset, the signup still succeeds in the UI but is only logged server-side.
- `source` distinguishes `"modal"` vs `"success"` origin.

## Acceptance Criteria

- [ ] **AC1**: Open the roadmap
  - Given the main screen or success screen
  - When the user clicks "see what's coming" / "+ 3 more"
  - Then the waitlist modal opens listing the upcoming features

- [ ] **AC2**: Email is validated before submit
  - Given the waitlist or success-card email input
  - When the email is blank or invalid and the user submits
  - Then an inline error is shown and no request is made

- [ ] **AC3**: Valid signup is recorded and confirmed
  - Given a valid email
  - When the user clicks "Notify me"
  - Then `POST /api/waitlist` is called with the email and source, and on success a "You're on the list." confirmation replaces the form

- [ ] **AC4**: Signup notifies the team
  - Given a successful signup and a configured `WAITLIST_NOTIFY_EMAIL`
  - When the request is processed
  - Then an email containing the signup address and source is sent to that inbox

- [ ] **AC5**: Failures are surfaced
  - Given the API returns an error
  - When joining fails
  - Then a readable error is shown and the user can retry

## Edge Cases

- Modal can be dismissed with Escape, the close button, or clicking the overlay.
- Success-card signup pre-fills the sender's email; the modal pre-fills it too when opened from the form.

## Changelog

### [2026-06-10] - Verified
- **Author**: Claude AI
- **Status**: Verified
- **Validation Result**: COMPLIANT
- **Quality Score**: 9/10
- **Notes**: All 5 ACs satisfied. Modal entry points (`page.tsx` footer link + "+ 3 more"), validation before submit, confirmation state, and team notification via `src/app/api/waitlist/route.ts` confirmed. `source` distinguishes `"modal"` vs `"success"`. Dismissal and email prefill edge cases handled.
- **Issues Fixed**: None
- **Minor (non-blocking)**: Signup form/logic duplicated between `Waitlist.tsx` and the success-card in `page.tsx` (see `01-send-voice-note.md`); candidate for extraction.
