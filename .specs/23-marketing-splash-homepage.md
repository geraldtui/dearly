# Spec: Marketing Splash Homepage

- **Status**: Verified
- **Created**: 2026-07-01
- **Last Modified**: 2026-07-01
- **Feature area**: Public marketing / Homepage
- **Related**: `10-homepage-signup-promo.md`, `18-authenticated-homepage-redirect-and-route-rename.md`, `01-send-voice-note.md`, `03-waitlist-signup.md`, `22-rebrand-dearly-to-sona.md`

## User Story

As a visitor, I want the homepage to be a simple splash page that explains what Sona is and how to sign up, so that I understand the product — and so that the free "send a voice note without an account" form can no longer be abused to spam arbitrary email addresses.

## Context

**Why**: The current homepage (`src/app/page.tsx`) *is* the public send form: anyone can record audio and POST to `/api/send`, which emails an attachment to any address (rate-limited only by IP). This is a spam/abuse vector. Replacing the homepage with a marketing splash and removing the public send path closes the vector entirely; sending becomes an authenticated-only action via the existing `/voicenotes` flow (`/api/notes`).

**Decisions** (resolved with user):
- Fully remove the public send capability — delete the `/api/send` endpoint (not just hide the UI), so no anonymous send exists.
- Delete components only reachable from the old homepage (`Waitlist`, `SignupPopover`, `SignupPromoCard`, `PublicNav`) and their tests. Keep shared components (`VoiceRecorder`, `Notepad`) used by the authenticated composer.
- The orphaned waitlist path (`Waitlist` modal → `joinWaitlist` → `/api/waitlist`) was only reachable from the old homepage, so remove it too (route + client helper + test).
- Splash content: hero (headline + tagline + primary "Sign up free" CTA) + a features section + footer.
- CTAs: top-right "Log in" / "Sign up" **and** a prominent hero "Sign up free" button.

**Dependencies**: Auth pages/session (`06-account-auth.md`), authenticated homepage redirect (`18` — logged-in visitors to `/` are already redirected to `/voicenotes` by middleware, so the splash is only ever shown logged-out).

## Technical Specification

**Data Models**: No schema changes.

**API/Backend**:
- `src/app/api/send/route.ts` (DELETED) — removes the anonymous send endpoint.
- `src/app/api/send/__tests__/route.test.ts` (DELETED).
- `src/app/api/waitlist/route.ts` (DELETED) — waitlist only reachable from old homepage.
- `src/app/api/waitlist/__tests__/route.test.ts` (DELETED).

**Components/Modules**:
- `src/app/page.tsx` (REWRITTEN) — server component (no `"use client"`). Renders a static marketing splash: top-right auth nav (Log in / Sign up), hero (`Sona.` brand, headline, tagline, "Sign up free" CTA → `/signup`, secondary "Log in" link → `/login`), a features section (3–4 feature cards: record, send to anyone, private threads, inbox), and the existing footer line. No recorder, no email input, no `/api/send` call.
- `src/components/Waitlist.tsx` (DELETED).
- `src/components/SignupPopover.tsx` (DELETED) + `src/components/__tests__/SignupPopover.test.tsx` (DELETED).
- `src/components/SignupPromoCard.tsx` (DELETED).
- `src/components/PublicNav.tsx` (DELETED) — auth links inlined into the splash (logged-in users never see the splash due to `18`'s redirect).
- `src/lib/api.ts` (MODIFIED) — remove `sendNote`, `SendNotePayload`, and `joinWaitlist`; keep `snakeCaseName`, `appendRecording`, `sendAccountNote`, `saveThreadLabel` (still used by the authenticated flow).
- `src/app/globals.css` (MODIFIED) — add splash-specific styles (hero, features grid, splash nav) reusing existing tokens (`--bg`, `--ink`, `--ink-soft`, `--accent`, `--accent-deep`, `--line`, `--radius`). Old homepage-only styles left in place unless clearly dead.

**Tests**:
- `e2e/send-note.spec.ts` (DELETED) — its scenarios (record + `/api/send`) no longer exist. The MP3 transcode unit coverage remains in `src/lib/__tests__` (audio); no public route to exercise.
- Add `e2e/splash.spec.ts` (NEW) — verifies the splash renders, shows Sign up / Log in, and has no send form.

**Migration Strategy**: Breaking change for the anonymous send flow (intended). Authenticated sending via `/voicenotes` is unaffected.

**State/Configuration**: No new env vars or state.

## Acceptance Criteria

- [x] **AC1**: Homepage is a static splash, not a send form
  - Given a logged-out visitor on `/`
  - When the page loads
  - Then they see the `Sona.` brand, a headline/tagline describing Sona, and a features section — and there is **no** email input, voice recorder, or send button

- [x] **AC2**: Auth entry points present
  - Given a logged-out visitor on the splash
  - When they view the top-right nav and the hero
  - Then a "Log in" link (→ `/login`) and "Sign up" link (→ `/signup`) appear top-right, and a prominent "Sign up free" CTA (→ `/signup`) appears in the hero

- [x] **AC3**: Public send capability is removed
  - Given any client (browser or script)
  - When it sends `POST /api/send`
  - Then the route does not exist (404) — no anonymous email can be sent

- [x] **AC4**: Dead code removed cleanly
  - Given the codebase after this change
  - When the project type-checks and lints
  - Then `Waitlist`, `SignupPopover`, `SignupPromoCard`, `PublicNav`, `sendNote`, `joinWaitlist`, `/api/send`, and `/api/waitlist` (and their tests) are gone with no dangling imports or references

- [x] **AC5**: Authenticated flow unaffected
  - Given a logged-in user
  - When they use `/voicenotes` to record and send a note
  - Then the composer, `sendAccountNote`, `/api/notes`, `VoiceRecorder`, and `Notepad` continue to work exactly as before

- [x] **AC6**: Quality gates pass
  - Given the change is complete
  - When `tsc --noEmit`, ESLint, unit tests, and E2E run
  - Then all pass (E2E no longer includes the removed send flow; a splash smoke test passes)

## Edge Cases

- Logged-in visitors to `/` are redirected to `/voicenotes` by middleware (spec `18`), so the splash's inlined auth links are effectively logged-out-only; no session check needed on the splash.
- Removing `/api/waitlist` also retires spec `03`'s live endpoint; the waitlist was only surfaced through the old homepage modal. Noted here rather than editing `03`.
- The splash is a server component (static), improving load and removing all client JS that the old form required.

## Changelog

### [2026-07-01] - Verified
- **Author**: Cursor AI
- **Status**: Verified
- **Validation Result**: COMPLIANT
- **Branch**: `feature/marketing-splash-homepage`
- **Notes**: All 6 ACs satisfied. Homepage (`src/app/page.tsx`) rewritten as a static server-component splash (brand, headline, tagline, hero "Sign up free" CTA, top-right Log in/Sign up, 4-card features grid, footer). Public send path removed end-to-end: deleted `/api/send`, `/api/waitlist` (+ tests), `sendNote`/`SendNotePayload`/`joinWaitlist` from `api.ts`, and the old homepage-only components (`Waitlist`, `SignupPopover`, `SignupPromoCard`, `PublicNav`) + orphaned `FEATURES`/`FEAT_ICON` exports. Shared `VoiceRecorder`/`Notepad`/`RecIcon` and the authenticated `/voicenotes` flow untouched. New `e2e/splash.spec.ts` (3 tests) replaces the removed `send-note.spec.ts`. Quality: `tsc --noEmit` ✅, ESLint ✅ (1 pre-existing font warning), 90 unit tests ✅, 3 E2E ✅, production build ✅ (`/` now static 172 B; `/api/send` & `/api/waitlist` absent from route list). Changes uncommitted on the feature branch per auto-sdd workflow.

### [2026-07-01] - Approved
- **Author**: Cursor AI
- **Status**: Approved
- **Notes**: Reviewed for completeness and conciseness (~90 lines, 6 testable ACs, specific file list). No critical issues or ambiguities: removal scope, splash content, and CTA placement were resolved with the user before drafting. Ready for implementation.

### [2026-07-01] - Draft
- **Author**: Cursor AI
- **Status**: Draft
- **Notes**: Initial spec. Converts the public send-form homepage into a static marketing splash and removes the anonymous send path end-to-end (`/api/send`, `sendNote`) plus now-orphaned components and the waitlist path. Decisions on removal scope, content, and CTAs resolved with the user.
