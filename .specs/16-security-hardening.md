# Spec: API Security Hardening (Rate Limiting, Headers, Body Caps)

- **Status**: Verified
- **Created**: 2026-06-18
- **Last Modified**: 2026-06-18
- **Feature area**: Platform / Security
- **Related**: `01-send-voice-note.md`, `03-waitlist-signup.md`, `08-send-to-dearly-user.md`, `15-conversation-aliases.md`

## User Story

As a Dearly maintainer, I want low-effort hardening on the public and authenticated API surface, so that abuse (email/storage spam, oversized payloads, clickjacking, content sniffing) is throttled and the app ships sane security defaults.

## Context

**Why**: The app runs on Vercel with Next.js route handlers. Today there is **no rate limiting** on any endpoint — the unauthenticated `/api/send` (sends real SES email + writes Storage) and `/api/waitlist` (emails an inbox) are the highest-value abuse targets, and authenticated write routes are also unthrottled. There are **no security response headers** (`next.config.mjs` is bare) and **no request body-size guard** on JSON routes. These are classic, contained "low-hanging fruit" wins that don't require new infrastructure.

**Scope**: A best-effort **in-memory** per-IP / per-user limiter (no new dependencies; acceptable that it is per-instance on serverless — it still blunts bursts), global security headers, and Content-Length body caps. No Redis/Upstash, no auth changes, no WAF.

**Dependencies**: None new. Reuses `NextResponse`, `next.config.mjs` `headers()`, and existing route handlers. RLS, signed URLs, and subject header-injection stripping already exist and stay as-is.

## Technical Specification

**Components/Modules**:
- `src/lib/rate-limit.ts` (NEW) — pure, dependency-free fixed-window limiter: `rateLimit(key, { limit, windowMs }) → { allowed, remaining, resetAt }` backed by a module-level `Map`, with lazy expiry + periodic pruning. Exports `tooManyRequests(resetAt)` (a `429` `NextResponse` with `Retry-After`) and `__resetRateLimit()` for tests.
- `src/lib/http.ts` (NEW) — request helpers: `clientIp(req)` (first `x-forwarded-for` hop, else `"unknown"`) and `bodyTooLarge(req, maxBytes)` (returns a `413` `NextResponse` when `Content-Length` exceeds the cap, else `null`).
- `src/app/api/send/route.ts` (MODIFIED) — body cap + per-IP limit before any work.
- `src/app/api/waitlist/route.ts` (MODIFIED) — body cap + per-IP limit.
- `src/app/api/notes/route.ts` (MODIFIED) — per-user limit (after auth) + body cap.
- `src/app/api/conversations/label/route.ts` (MODIFIED) — per-user limit (after auth) + body cap.
- `next.config.mjs` (MODIFIED) — `async headers()` applying a global security header set to all routes.

**Limits** (per window):
- `/api/send`: 5 / 60s per IP. `/api/waitlist`: 5 / 60s per IP.
- `/api/notes`: 20 / 60s per user. `/api/conversations/label`: 30 / 60s per user.

**Body caps**: JSON routes 16KB; multipart routes (`/api/send`, `/api/notes`) `MAX_AUDIO_BYTES + 1MB` overhead (the precise audio cap still applies after parsing).

**Security headers** (all routes): `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), geolocation=(), microphone=(self)` (mic kept for the recorder), and a `Content-Security-Policy` allowlisting `'self'`, Google Fonts, Supabase (`connect-src`/`media-src`/`img-src`), `blob:`/`data:` media, and inline styles; `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`. `'unsafe-eval'` is added to `script-src` only in development (Next HMR).

## Acceptance Criteria

- [x] **AC1**: Public send is rate-limited
  - Given more than 5 `POST /api/send` from one IP within 60s
  - When the 6th arrives
  - Then it returns `429` with a `Retry-After` header and **no** email is sent and **nothing** is stored

- [x] **AC2**: Waitlist is rate-limited
  - Given more than 5 `POST /api/waitlist` from one IP within 60s
  - When the next arrives
  - Then it returns `429` with `Retry-After` and no email is sent

- [x] **AC3**: Authenticated writes are rate-limited per user
  - Given a logged-in user exceeding the limit on `/api/notes` or `/api/conversations/label`
  - When the next request arrives
  - Then it returns `429` (keyed by user id, after the auth check), leaving unauthenticated requests to still get `401`

- [x] **AC4**: Security headers are present
  - Given any response
  - When inspected
  - Then it carries HSTS, `nosniff`, `X-Frame-Options: DENY` (+ CSP `frame-ancestors 'none'`), `Referrer-Policy`, a `Permissions-Policy` that still allows `microphone=(self)`, and a CSP that permits the app's own assets, Google Fonts, and Supabase

- [x] **AC5**: Oversized bodies are rejected early
  - Given a request whose `Content-Length` exceeds the route cap
  - When received
  - Then it returns `413` before parsing the body or doing any work

- [x] **AC6**: Limits reset and degrade safely
  - Given the window elapses (or `Content-Length` is absent)
  - When a new request arrives
  - Then the counter resets and the request proceeds; a missing/garbled IP is bucketed under `"unknown"` and the limiter never throws (fails open on internal error)

## Edge Cases

- Serverless cold starts / multiple instances → counts are per-instance (best-effort by design; documented).
- Recorder still works: `Permissions-Policy` keeps `microphone=(self)` and CSP allows `blob:`/Supabase media + Google Fonts.
- Existing route tests reset the limiter in `beforeEach` so shared module state doesn't bleed across cases.
- The `Retry-After` value is whole seconds until `resetAt` (min 1).

## Changelog

### [2026-06-18] - Draft
- **Author**: Claude AI
- **Status**: Draft
- **Notes**: Decisions resolved with user — bundle = rate limiting + security headers + body caps; rate limiting is in-memory (no new deps, best-effort on serverless). Highest-value targets are the unauthenticated `/api/send` and `/api/waitlist`.

### [2026-06-18] - Approved
- **Author**: Claude AI
- **Status**: Approved
- **Review**: PASS — single cohesive capability, 6 testable ACs, 2 new small libs + 5 touched files, no new dependencies, no schema/API contract changes (only adds 429/413 failure modes). Conservative CSP tailored to the app's known asset origins to avoid breakage.

### [2026-06-18] - Implemented & Verified
- **Author**: Claude AI
- **Status**: Verified
- **Validation Result**: COMPLIANT
- **Branch**: `feature/security-hardening`
- **Notes**: Added `src/lib/rate-limit.ts` (fixed-window Map limiter + `tooManyRequests` + `__resetRateLimit`) and `src/lib/http.ts` (`clientIp`, `bodyTooLarge`). Wired per-IP limits into `/api/send` and `/api/waitlist`, per-user limits into `/api/notes` and `/api/conversations/label` (after auth), and Content-Length caps into all four. Added the security header set (incl. environment-aware CSP) via `next.config.mjs` `headers()`. New tests cover 429 (send/waitlist/notes) and 413 (body cap); existing route suites reset the limiter in `beforeEach`. tsc, lint, the full unit suite, and the production build pass.
