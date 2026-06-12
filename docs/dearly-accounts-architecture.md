# Dearly Accounts — Epic Architecture

> **Status: planning only.** This document is the architecture reference for the
> "Dearly accounts" epic. No implementation has been done. It is split into four
> implementation-ready specs (`.specs/06`–`.specs/09`).

## Goal

Let people have a **Dearly account** so voice notes are **stored and managed by
Dearly** instead of filling up inboxes. Dearly users receive notes in an in-app
**inbox**; they can send notes to other people by email. The current email flow
is preserved as a **fallback** for recipients who don't have an account.

## Decisions (resolved with the user)

| Decision | Choice |
| --- | --- |
| This run | Plan the epic + write specs; **implement nothing yet** |
| Stack | **Supabase** — Postgres + Auth + Storage |
| Recipient model | **Hybrid** — Dearly account → in-app inbox; otherwise email send (current flow) |
| Auth | **Email + password** (Supabase Auth, with email confirmation) |
| Addressing | **By email** — recipient email is looked up against accounts |
| Notification | **Yes** — email a lightweight "you have a new voice note" link to in-app users |

## Stack & integration

- **Supabase Postgres** — application data (profiles, voice notes).
- **Supabase Auth** — email/password, sessions via cookies.
- **Supabase Storage** — a private bucket for the MP3 files; access via short-lived signed URLs.
- **Next.js App Router (existing)** — use `@supabase/ssr` for cookie-based sessions in Server Components, Route Handlers, and middleware.
- **Resend (existing)** — reused for the "new voice note" notification email and the existing non-user fallback send.
- **Hosting** — still Vercel; add Supabase env vars (below).

## Data model (Postgres)

**`profiles`** (1:1 with `auth.users`)
- `id` uuid PK → `auth.users.id`
- `email` text (unique, lower-cased)
- `display_name` text
- `created_at` timestamptz

**`voice_notes`**
- `id` uuid PK
- `sender_id` uuid → `profiles.id` (nullable for future system notes)
- `recipient_id` uuid → `profiles.id`
- `sender_name` text, `recipient_name` text (denormalized for display)
- `subject` text (nullable)
- `storage_path` text (object key in the audio bucket)
- `duration_seconds` int
- `listened_at` timestamptz (nullable)
- `created_at` timestamptz

## Storage

- Bucket `voice-notes` (private). Object key: `{recipient_id}/{voice_note_id}.mp3`.
- Audio uploaded server-side (Route Handler) after auth; downloads via **signed URLs** minted per request for the inbox player.

## Security (RLS — critical)

- `profiles`: a user can read their own row; minimal public lookup of `id` by exact email is done **server-side** with the service role (not exposed to clients).
- `voice_notes`: row visible only where `auth.uid() = sender_id OR auth.uid() = recipient_id`; insert restricted to `sender_id = auth.uid()`; recipient may update `listened_at`; sender/recipient may delete their own view.
- Storage bucket is private; no public URLs — only signed URLs minted for authorized users.
- The service-role key is **server-only** (never shipped to the client).

## Key flows

**Auth** (spec 06): sign up (email+password, confirm email) → `profiles` row created → login sets session cookie → authenticated area gated by middleware.

**Send** (spec 08): authenticated sender records a note (reusing the existing recorder + MP3 transcode) → server looks up recipient email in `profiles`:
- **Match** → upload MP3 to Storage, insert `voice_notes` row, send "new voice note" notification email with a link to the inbox.
- **No match** → fall back to the existing `/api/send` email-with-attachment flow (unchanged).

**Inbox** (spec 09): authenticated user sees received (and sent) notes, plays audio via signed URL, marks listened, and can delete (management/retention).

## Environment variables (added later, at implementation time)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # server-only
# Existing: RESEND_API_KEY, DEARLY_FROM_EMAIL, WAITLIST_NOTIFY_EMAIL
```

## Retention / management (initial policy)

- Notes persist until a participant deletes them (no auto-expiry in v1).
- Deleting a note removes its row and its Storage object.
- A per-user storage quota and auto-expiry are **out of scope for v1** (future spec).

## Recommended build sequence

1. **06 — Account auth** (foundation: nothing else works without sessions)
2. **07 — Data model + storage + RLS** (the schema the rest depends on)
3. **08 — Send to a Dearly user** (hybrid send + notification)
4. **09 — Inbox + playback + management** (consume what 08 produces)

## Open questions / future specs (not in this epic's v1)

- Username/@handle addressing (chosen: email-only for now).
- Storage quotas, auto-expiry, and "time capsule" scheduling.
- Contacts/address book (related to the waitlist roadmap in `03-waitlist-signup.md`).
- Push/mobile notifications.
