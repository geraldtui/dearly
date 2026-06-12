# Spec: Dearly Account Authentication

- **Status**: Verified
- **Created**: 2026-06-11
- **Last Modified**: 2026-06-11
- **Feature area**: Accounts (epic)
- **Related**: `docs/dearly-accounts-architecture.md`, `07-account-data-and-storage.md`

## User Story

As a person, I want to create and log into a Dearly account with my email and password, so that I have an identity Dearly can deliver and store my voice notes under.

## Context

**Why**: Accounts are the foundation of the "stored by Dearly" model — every voice note is owned by a sender and a recipient account. This spec covers only authentication and the profile record; sending and the inbox are separate specs.

**Dependencies**:
- Supabase Auth + `profiles` table (defined in `07-account-data-and-storage.md`).
- `@supabase/ssr` for cookie-based sessions in the Next.js App Router.

## Technical Specification

**Components/Modules**:
- `src/lib/supabase/client.ts` (NEW) — browser Supabase client.
- `src/lib/supabase/server.ts` (NEW) — server client bound to request cookies.
- `middleware.ts` (NEW) — refresh session; gate `/app/**` (authenticated area) and redirect unauthenticated users to `/login`.
- `src/app/(auth)/signup/page.tsx` (NEW) — email + password sign-up form.
- `src/app/(auth)/login/page.tsx` (NEW) — login form.
- `src/app/auth/callback/route.ts` (NEW) — email-confirmation/redirect handler.
- `src/app/api/auth/signout/route.ts` (NEW) — clears the session.

**API/Backend**:
- Supabase Auth email/password (email confirmation enabled).
- On first successful auth, ensure a `profiles` row exists (DB trigger or server upsert; see spec 07).

**State/Configuration**:
- Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only).

## Acceptance Criteria

- [ ] **AC1**: Sign up with email + password
  - Given the signup page
  - When a visitor submits a valid email, password, and display name
  - Then a Supabase auth user is created, a confirmation email is sent, and a `profiles` row is provisioned for them

- [ ] **AC2**: Log in
  - Given a confirmed account
  - When the user submits correct credentials
  - Then a session cookie is set and they land in the authenticated area (`/app`)

- [ ] **AC3**: Invalid credentials are handled
  - Given wrong email/password (or unconfirmed email)
  - When the user submits
  - Then a friendly inline error is shown and no session is created

- [ ] **AC4**: Protected routes require auth
  - Given an unauthenticated visitor
  - When they navigate to `/app/**`
  - Then middleware redirects them to `/login`

- [ ] **AC5**: Log out
  - Given a logged-in user
  - When they choose "Log out"
  - Then the session is cleared and they return to a public page

## Edge Cases

- Duplicate email at signup → friendly "account already exists" message.
- Unconfirmed email at login → prompt to check email / resend confirmation.
- Session expiry → middleware refresh; if it fails, redirect to login.

## Changelog

### [2026-06-11] - Approved
- **Author**: Claude AI
- **Status**: Approved (planning — not yet implemented)
- **Notes**: Part of the Dearly Accounts epic. Scope: auth + profile provisioning only (5 ACs). Email+password chosen with the user; addressing/sending/inbox are separate specs.

### [2026-06-11] - Implemented & Verified
- **Author**: Claude AI
- **Status**: Verified
- **Validation Result**: COMPLIANT (static — runtime pending a Supabase project + env vars)
- **Branch**: `feature/dearly-accounts`
- **Notes**: Added `src/lib/supabase/client.ts`/`server.ts` (incl. server-only service client), `src/middleware.ts` (session refresh + gating), `(auth)/login` + `(auth)/signup` pages sharing `AuthForm` (friendly error mapping, confirm-email state), `auth/callback` code exchange, and `api/auth/signout`. Profile provisioning via DB trigger (spec 07). Note: the authenticated area lives at `/inbox` & `/compose` (the `(app)` route group), so middleware gates those prefixes rather than a literal `/app/**`. All 5 ACs satisfied statically; lint + production build pass. End-to-end auth requires applying the migration and setting Supabase env vars.
