# Spec: Custom Subject Line for a Voice Note

- **Status**: Updated (was: Verified)
- **Created**: 2026-06-10
- **Last Modified**: 2026-06-10
- **Feature area**: Core send flow
- **Related**: `01-send-voice-note.md`

## User Story

As a sender, I want to enter a topic/subject line for my voice note, so that the recipient's email shows a meaningful subject and header instead of a generic Dearly title.

## Context

**Why**: The recipient email currently uses a fixed subject (`"<sender> sent you a voice note on Dearly"`) and a fixed "Dearly." masthead. Letting the sender set a short topic makes the email feel personal and easier to recognize in an inbox, and surfaces that topic as the email's header. The field is optional so the existing flow (and the "Dearly." masthead) is unaffected when left blank.

**Dependencies**:
- Builds on the send flow in `01-send-voice-note.md` (`page.tsx` form, `sendNote`, `/api/send`).

## Technical Specification

**Components/Modules**:
- `src/app/page.tsx` (MODIFIED) — add an optional full-width "Subject" field to the form; hold it in form state; clear it on reset.
- `src/lib/api.ts` (MODIFIED) — add `subject` to `SendNotePayload` and append it to the `multipart/form-data` body.
- `src/app/api/send/route.ts` (MODIFIED) — read `subject`, sanitize it, and use it as the email subject; pass it to the email templates; fall back to the existing default when blank.
- `src/lib/email.ts` (MODIFIED, added 2026-06-10) — `noteEmailHtml`/`noteEmailText` accept an optional `subject` and render it as the email masthead/header (HTML) and a leading header line (plaintext); fall back to the "Dearly." brand masthead when blank.

**State/Configuration**:
- New form field `subject: string` in `FormState`.
- Server constant for max subject length (e.g. `MAX_SUBJECT_LEN = 150`).

## Acceptance Criteria

- [ ] **AC1**: An optional subject field is available
  - Given the compose form
  - When the user views it
  - Then there is a "Subject" input that is not required to send (no validation error when empty)

- [ ] **AC2**: A provided subject becomes the email subject
  - Given the user typed a subject and sends a valid note
  - When the recipient email is delivered
  - Then the email subject equals the entered topic (and the BCC'd sender sees the same subject)

- [ ] **AC3**: A blank subject falls back to the default
  - Given the subject field is empty (or whitespace only)
  - When the note is sent
  - Then the email subject is the existing default `"<sender> sent you a voice note on Dearly"`

- [ ] **AC4**: The subject is sanitized server-side
  - Given a subject containing newlines/control characters or longer than `MAX_SUBJECT_LEN` (150)
  - When the request is processed
  - Then newlines/control chars are stripped and the subject is trimmed and capped at 150 characters (preventing header injection)

- [ ] **AC5**: The subject resets with the form
  - Given a sent note on the success screen
  - When the user clicks "Record another note"
  - Then the subject field is cleared along with the rest of the form

- [ ] **AC6**: The subject is the email's header (Added 2026-06-10)
  - Given a provided subject
  - When the recipient opens the email
  - Then the subject appears as the email's masthead/header (in both HTML and plaintext) instead of the "Dearly." brand; when blank, the "Dearly." masthead is shown

## Edge Cases

- Whitespace-only subject is treated as blank → default subject and "Dearly." masthead used.
- Over-length subject is truncated to the cap rather than rejected.
- Newline/CR characters are removed to avoid email header injection.
- Long subjects render in the masthead at a smaller serif size than the "Dearly." brand to stay readable.

## Changelog

### [2026-06-10] - Approved
- **Author**: Claude AI
- **Status**: Approved
- **Notes**: Reviewed and approved. Tightened AC4 to reference the concrete `MAX_SUBJECT_LEN` (150) cap. Scope confirmed small (0 new components, 3 modified files, 5 ACs).

### [2026-06-10] - Implemented
- **Author**: Claude AI
- **Status**: Implemented
- **Notes**: Added optional "Subject (optional)" field + `subject` form state (cleared on reset) in `src/app/page.tsx`; added `subject` to `SendNotePayload` and form-data in `src/lib/api.ts`; added `sanitizeSubject()` + `MAX_SUBJECT_LEN` and subject-with-fallback in `src/app/api/send/route.ts`. Lint/type checks pass. (No git repo present, so changes are in the working tree — no branch created.)

### [2026-06-10] - Verified
- **Author**: Claude AI
- **Status**: Verified
- **Validation Result**: COMPLIANT
- **Quality Score**: 10/10
- **Notes**: All 5 ACs satisfied; Clean Code followed (reused `Field`, small `sanitizeSubject`); all edge cases handled (whitespace→default, over-length→truncated, CR/LF→stripped). Lint/type checks pass.
- **Issues Fixed**: None

### [2026-06-10] - Requirement Change
- **Changed**: Subject now also renders as the email body masthead/header (HTML + plaintext), not just the email subject line. Added AC6.
- **Reason**: User requested the subject line be the email's header instead of the generic "Dearly." brand.
- **Impact**: `src/lib/email.ts` (`noteEmailHtml`/`noteEmailText` gained an optional `subject`); `src/app/api/send/route.ts` passes the sanitized subject to the templates. Implemented; lint/type checks pass.
- **Breaking Changes**: None (`subject` is optional; blank falls back to the "Dearly." masthead).
- **Author**: Claude AI
- **Note**: Status set to "Updated" — re-run `spec-verify` to confirm AC6 and promote back to Verified.

