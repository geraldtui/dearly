# Spec: Voice-Note Inbox & Playback

- **Status**: Verified
- **Created**: 2026-06-11
- **Last Modified**: 2026-06-11
- **Feature area**: Accounts (epic)
- **Related**: `docs/dearly-accounts-architecture.md`, `07-account-data-and-storage.md`, `08-send-to-dearly-user.md`

## User Story

As a logged-in Dearly user, I want an inbox of the voice notes sent to me (and ones I've sent), so that I can listen to them in-app and manage them without using email storage.

## Context

**Why**: This is where stored notes are consumed — the payoff of the accounts model. It reads `voice_notes` (scoped by RLS) and streams audio via short-lived signed URLs, and lets users delete notes (the "managed by Dearly" retention control for v1).

**Dependencies**:
- Auth/session (`06`), schema/storage/RLS (`07`), notes produced by send (`08`).

## Technical Specification

**Components/Modules**:
- `src/components/AppSidebar.tsx` (NEW) — client sidebar for the authenticated area: brand, nav items **Inbox** (`/inbox`), **Sent** (`/sent`), **Send a note** (`/compose`), and Log out; active item highlighted via `usePathname`. On small screens it collapses to a horizontal bar.
- `src/app/(app)/layout.tsx` (MODIFIED) — left-sidebar shell: renders `AppSidebar` beside the page content (replaces the old fixed top nav).
- `src/app/(app)/inbox/page.tsx` (NEW) — server component listing **received** notes ("Inbox"); shows sender, subject, date, listened state. The former in-page Received/Sent tabs are gone — views are sidebar items.
- `src/app/(app)/sent/page.tsx` (NEW) — server component listing **sent** notes ("Sent"), including email-fallback copies (`recipient_id = null`, shown with a "via email" hint).
- `src/components/NotesList.tsx` (NEW) — shared server-rendered list (cards or empty state) used by both pages.
- `src/components/NotePlayer.tsx` (NEW) — client audio player that fetches a signed URL on play.
- `src/app/api/notes/[id]/url/route.ts` (NEW) — auth: mint a short-lived signed URL for a note the user may access; mark `listened_at` on first play.
- `src/app/api/notes/[id]/route.ts` (NEW) — auth DELETE: remove the row and its Storage object.

**API/Backend**:
- `GET /inbox`, `GET /sent` (server-rendered, session-scoped; both behind auth middleware).
- `POST /api/notes/[id]/url` — returns a signed URL (and sets `listened_at`).
- `DELETE /api/notes/[id]` — deletes row + object.

## Acceptance Criteria

- [ ] **AC1**: Inbox lists received notes
  - Given a logged-in user with received notes
  - When they open `/inbox`
  - Then they see those notes (sender name, subject, date, listened state), newest first, and only notes where they are a participant (RLS)

- [ ] **AC2**: Playback via signed URL
  - Given a note in the inbox
  - When the user presses play
  - Then the app fetches a short-lived signed URL and plays the audio inline (no public/permanent link is exposed)

- [ ] **AC3**: Mark as listened
  - Given an unlistened received note
  - When the user plays it the first time
  - Then `listened_at` is set and the UI reflects the listened state

- [x] **AC4**: Sent view via the sidebar
  - Given a user who has sent notes
  - When they open "Sent" from the left sidebar (`/sent`)
  - Then they see notes where they are the sender — including stored email-fallback copies — and the sidebar marks "Sent" active

- [x] **AC7**: Left-sidebar navigation (Added 2026-06-11)
  - Given any authenticated page
  - When it renders
  - Then a left sidebar shows "Inbox", "Sent", "Send a note" and "Log out", highlights the current section, and there are no in-page Received/Sent tabs

- [ ] **AC5**: Delete a note
  - Given a note the user participates in
  - When they delete it
  - Then the row and its Storage object are removed and it disappears from the inbox

- [ ] **AC6**: Access control on note endpoints
  - Given a note the user is NOT a participant in
  - When they request its signed URL or deletion
  - Then the request is denied (403/404) and nothing is returned or changed

## Edge Cases

- Empty inbox → friendly empty state.
- Signed URL expiry → re-fetched on next play.
- Deleting a note already opened in another tab → graceful "not found" handling.

## Changelog

### [2026-06-11] - Verified (sidebar + Sent)
- **Author**: Claude AI
- **Status**: Verified
- **Validation Result**: COMPLIANT
- **Notes**: `AppSidebar` (Inbox/Sent/Send a note + Log out, active state via `usePathname`, collapses to a top bar under 840px) replaces the old top nav; `/sent` added (middleware-protected) and the in-page tabs removed; both pages share `NotesList`. Sent view includes email-fallback copies with a "via email" badge; playback works for sender-only rows (RLS sender select; no `listened_at` write since the recipient check never matches null). All 7 ACs satisfied; lint, tsc and production build pass.

### [2026-06-11] - Requirement Change
- **Changed**: The authenticated area now uses a left-sidebar layout; "Received"/"Sent" tabs became sidebar nav items "Inbox" (`/inbox`) and "Sent" (new `/sent` route). Added AC7; AC4 rewritten. Sent view also shows stored email-fallback copies (see spec 08).
- **Reason**: User wants clearer naming and a sidebar layout for the signed-in experience.
- **Author**: Claude AI

### [2026-06-11] - Approved
- **Author**: Claude AI
- **Status**: Approved (planning — not yet implemented)
- **Notes**: Part of the Dearly Accounts epic. Inbox + playback + delete (6 ACs). Audio served only via short-lived signed URLs; all access scoped by RLS and re-checked server-side.

### [2026-06-11] - Implemented & Verified
- **Author**: Claude AI
- **Status**: Verified
- **Validation Result**: COMPLIANT (static — runtime pending Supabase env vars)
- **Branch**: `feature/dearly-accounts`
- **Notes**: Added `(app)/inbox` server page (Received/Sent tabs via `?view=`, newest-first, RLS-scoped, friendly empty state), `NoteCard` (metadata, New badge, delete with refresh), `NotePlayer` (mints a fresh 5-min signed URL per play — handles expiry), `api/notes/[id]/url` (participant check via RLS → 404; sets `listened_at` on recipient's first play), `api/notes/[id]` DELETE (row via RLS then object via service role). Also `(app)/layout.tsx` nav (Inbox / Send a note / Log out). All 6 ACs satisfied statically; lint + build pass.
