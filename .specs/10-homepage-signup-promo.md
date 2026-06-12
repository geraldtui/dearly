# Spec: Homepage Signup Promotion

- **Status**: Verified
- **Created**: 2026-06-11
- **Last Modified**: 2026-06-11
- **Feature area**: Accounts (epic) / Public homepage
- **Related**: `06-account-auth.md`, `09-voice-note-inbox.md`, `docs/dearly-accounts-architecture.md`

## User Story

As a new visitor, I want to sign up for a Dearly account from the homepage, so that I know I can keep sending free voice notes by email while an account adds features like the Dearly Inbox.

## Context

**Why**: The accounts epic (06–09) added signup/login/inbox, but the homepage doesn't surface them — visitors can't discover accounts exist. A signup popover appears the moment a visitor first focuses an email input ("Sign up to store your contacts") — a deliberate prompt at the point of friction (typing addresses) — plus a session-aware top-right nav and a signup card on the sent screen. This formalizes and replaces the ad-hoc top-right auth links added earlier.

**Dependencies**:
- Auth pages and session handling from `06-account-auth.md` (`/signup`, `/login`, Supabase browser client).
- Inbox from `09-voice-note-inbox.md` (the promo's payoff destination).

## Technical Specification

**Components/Modules**:
- `src/lib/supabase/use-user.ts` (NEW) — client hook returning the current auth user (or `null`); fails gracefully to logged-out when Supabase is unconfigured/unreachable.
- `src/components/PublicNav.tsx` (NEW) — session-aware top-right nav: logged out → "Log in" + "Sign up"; logged in → "Inbox". Replaces the inline nav markup in `page.tsx`.
- `src/components/SignupPopover.tsx` (NEW) — small popover anchored below the first email input the visitor focuses: "Sign up to store your contacts" pitch, "Sign up free" CTA to `/signup`, dismiss (X) remembered in `localStorage`. Hidden when logged in.
- `src/components/SignupPromoCard.tsx` (NEW) — signup benefits card on the sent screen (replaces the old waitlist join card), with benefit chips, "Sign up free" CTA, "Log in" link, and a "see what else is coming" link that opens the waitlist modal. Logged in → "Go to your Inbox" CTA.
- `src/app/page.tsx` (MODIFIED) — `Field` accepts `onFocus`/`children` so email fields can anchor the popover (first-focused field wins); renders `PublicNav`, the popover, and the success card.
- `src/app/globals.css` (MODIFIED) — popover styles (arrow, pop-in animation) + promo card styles, reusing existing tokens/chip patterns.

**State/Configuration**:
- `localStorage` key `dearly_signup_pop_dismissed` remembers popover dismissal; reads the existing Supabase session client-side. No new env.

## Acceptance Criteria

- [x] **AC1**: Signup popover appears deliberately, not on load
  - Given a logged-out visitor on the homepage
  - When they focus an email input for the first time (sender or recipient)
  - Then a popover anchored to that field pitches "Sign up to store your contacts" with a "Sign up free" CTA linking to `/signup` — and it does not appear before any email field is focused

- [x] **AC2**: Popover is dismissable and stays dismissed
  - Given the popover is shown
  - When the visitor clicks its close button
  - Then it disappears and does not reappear on later visits (`localStorage`)

- [x] **AC3**: Existing flow undisturbed
  - Given the popover is shown
  - When a visitor records and sends a note by email without an account
  - Then the existing form/recorder/send flow works exactly as before (the popover floats above the form and never blocks input)

- [x] **AC4**: Logged-in visitors get the inbox path
  - Given a logged-in user on the homepage
  - When the page renders and they focus the email fields
  - Then no signup popover appears, the nav shows "Inbox", and the sent-screen card shows "Go to your Inbox"

- [x] **AC5**: Graceful degradation without Supabase
  - Given Supabase env vars are missing or the session check fails
  - When the homepage renders
  - Then it renders the logged-out state without errors (email sending unaffected)

## Edge Cases

- Session check is client-side only; the brief logged-out flash before the session resolves is acceptable.
- The popover anchors to whichever email field is focused first and stays put (it persists past blur so the CTA remains clickable).
- The success screen shows `SignupPromoCard` in place of the old waitlist join card (see `03-waitlist-signup.md`).

## Changelog

### [2026-06-11] - Updated
- **Author**: Claude AI
- **Status**: Verified
- **Notes**: Per user request, replaced the under-form promo card with `SignupPopover` — a dismissable popover anchored to the email inputs, triggered on first focus, leading with the "store your contacts" pitch (user's explicit copy choice; contacts ship later). `HomeAuthPromo` was renamed to `SignupPromoCard` and now serves only the sent screen. ACs rewritten for the popover behavior; lint/tsc clean.

### [2026-06-11] - Updated
- **Author**: Claude AI
- **Status**: Verified
- **Notes**: Per user request, the success-screen "Be first in line" waitlist card now pitches Dearly Inbox signup instead. `HomeAuthPromo` gained a `success` variant (join-card styling, signup CTA, waitlist link) and the inline waitlist form/state was removed from `page.tsx`.

### [2026-06-11] - Verified
- **Author**: Claude AI
- **Status**: Verified
- **Notes**: All 5 ACs satisfied. `useUser` hook (graceful fallback to logged-out), `PublicNav` (fixed top-right, session-aware), `HomeAuthPromo` (benefits card between send button and footer, hidden on success screen). ESLint clean (one pre-existing font warning), `tsc --noEmit` clean, production build passes.

### [2026-06-11] - Approved
- **Author**: Claude AI
- **Status**: Approved
- **Notes**: Decisions resolved with user: compact benefits card below the form (form-first design kept) + session-aware swap to an Inbox CTA. Subsumes the earlier unspecced top-right auth links. 5 ACs, 3 new client files, no backend.
