# Spec: Testing Foundation

- **Status**: Verified
- **Created**: 2026-06-12
- **Last Modified**: 2026-06-12
- **Feature area**: Developer tooling / Quality
- **Related**: `01-send-voice-note.md`, `08-send-to-dearly-user.md`, `09-voice-note-inbox.md`, `10-homepage-signup-promo.md`

## User Story

As a developer, I want an automated test suite that runs locally and in CI, so that I can ship new features confident that existing send/inbox/auth behavior didn't break.

## Context

**Why**: The accounts epic added meaningful server-side logic (hybrid delivery, rollback paths, validation) with no automated coverage — every change is verified manually. This spec lays the testing foundation: Vitest + React Testing Library, suites for the highest-risk code (route handlers, shared utilities, key client components), and a CI workflow gating PRs. Playwright E2E and Supabase RLS tests are deferred to a follow-up spec.

**Dependencies**:
- Vitest, `@vitejs/plugin-react`, jsdom, Testing Library (react / jest-dom / user-event) as devDependencies.
- Node 22 `File`/`FormData` globals for building multipart requests in route tests.

## Technical Specification

**Components/Modules**:
- `vitest.config.ts` (NEW) — React plugin, `@/` alias, default `node` environment (component tests opt into jsdom via docblock), setup file.
- `src/test/setup.ts` (NEW) — registers `@testing-library/jest-dom` matchers and test env vars.
- `src/lib/__tests__/notes.test.ts` (NEW) — `sanitizeSubject` (control chars, whitespace, length cap), `durationLabel`, `storeNote` upload/insert/cleanup behavior, `removeStoredNote`.
- `src/lib/__tests__/validation.test.ts` (NEW) — `emailOk` accept/reject cases.
- `src/lib/__tests__/api.test.ts` (NEW) — `snakeCaseName` (exported for testing) slug rules.
- `src/lib/__tests__/email.test.ts` (NEW) — template HTML/text (masthead vs brand, escaping, audio lines) and `sendVoiceNoteEmail` / `sendNewNoteNotification` BCC + error behavior with a mocked Resend client.
- `src/app/api/send/__tests__/route.test.ts` (NEW) — validation 400s, oversized audio 413, email fallback when no account matches, in-app delivery for registered recipients, rollback when the notification email fails.
- `src/app/api/notes/__tests__/route.test.ts` (NEW) — 401 when logged out, validation, non-user email fallback with stored Sent copy (no BCC) + rollback on email failure, in-app delivery with tolerated notification failure.
- `src/components/__tests__/SignupPopover.test.tsx` (NEW) — render for logged-out users, hidden when logged in/dismissed, dismissal persisted.
- `src/components/__tests__/Notepad.test.tsx` (NEW) — open/close, text persistence, hint dismissal.
- `src/components/__tests__/ComposeForm.test.tsx` (NEW) — validation errors block send, successful send shows delivery-specific success copy.
- `src/lib/api.ts` (MODIFIED) — export `snakeCaseName` so it is directly testable.
- `package.json` (MODIFIED) — `test` / `test:watch` scripts, test devDependencies, `@types/node` bumped for Vitest peer range.
- `.github/workflows/ci.yml` (NEW) — on PRs and pushes to `develop`/`main`: install, lint, `tsc --noEmit`, `vitest run`.

**State/Configuration**:
- No runtime/product changes; tests mock Resend and Supabase modules (no network, no real keys).

## Acceptance Criteria

- [x] **AC1**: Test runner works locally
  - Given the repo after `npm install`
  - When a developer runs `npm test`
  - Then Vitest runs all suites in one command and exits non-zero on any failure

- [x] **AC2**: Utility behavior is covered
  - Given the shared helpers (`sanitizeSubject`, `durationLabel`, `emailOk`, `snakeCaseName`, email templates)
  - When their suites run
  - Then header-injection stripping, length caps, slug rules, email validation, masthead/escaping rules are asserted

- [x] **AC3**: Public send route is covered
  - Given `/api/send` with mocked email + Supabase modules
  - When its suite runs
  - Then it asserts validation 400s, 413 for oversized audio, email delivery for non-account recipients, in-app delivery (anonymous sender, BCC'd notification) for registered recipients, and rollback + 500 when the notification fails

- [x] **AC4**: Authenticated notes route is covered
  - Given `/api/notes` with mocked auth, Supabase, and email modules
  - When its suite runs
  - Then it asserts 401 when logged out, the Sent-copy + no-BCC email fallback with rollback on email failure, and in-app delivery where a failed notification does not fail the send

- [x] **AC5**: Key client components are covered
  - Given jsdom suites for `SignupPopover`, `Notepad`, and `ComposeForm`
  - When they run
  - Then popover visibility/dismissal persistence, notepad persistence/hint, and compose validation + success states are asserted

- [x] **AC6**: CI gates changes
  - Given a PR or a push to `develop`/`main`
  - When the GitHub Actions workflow runs
  - Then lint, type-check, and the Vitest suite all run and a failure blocks the check

## Edge Cases

- Route tests build real `multipart/form-data` `Request`s with Node's `File`/`FormData` — no Next server needed.
- Resend/Supabase are mocked at the module boundary; suites never read real API keys.
- Component tests opt into jsdom per-file so route/utility suites keep the faster node environment.

## Changelog

### [2026-06-12] - Verified
- **Author**: Claude AI
- **Status**: Verified
- **Notes**: All 6 ACs satisfied — 9 suites / 79 tests pass via `npm test`; `tsc --noEmit`, ESLint, and the production build are clean. `@types/node` (^22) and `typescript` (^5.9) were bumped to satisfy Vitest/Vite peer ranges; `snakeCaseName` exported for direct testing. CI workflow added at `.github/workflows/ci.yml`.

### [2026-06-12] - Created
- **Author**: Claude AI
- **Status**: Verified
- **Notes**: Scope agreed with user ("Yes, lets do it"): Vitest + RTL foundation, route-handler/utility/component suites, CI workflow. Playwright E2E and RLS tests deferred to a follow-up spec.
