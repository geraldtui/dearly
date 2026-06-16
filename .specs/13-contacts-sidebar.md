# Spec: Contacts Sidebar for Inbox & Sent

- **Status**: Verified
- **Created**: 2026-06-16
- **Last Modified**: 2026-06-16
- **Feature area**: Accounts (epic)
- **Related**: `09-voice-note-inbox.md`, `08-send-to-dearly-user.md`, `07-account-data-and-storage.md`

## User Story

As a logged-in Dearly user, I want a contacts sidebar beside the Inbox/Sent navigation that lists the people I exchange notes with, so that I can pick a person and see only the voice notes I've received from (Inbox) or sent to (Sent) them.

## Context

**Why**: Today Inbox and Sent show one flat, newest-first list. As notes accumulate, finding everything from one person is hard. A per-person sidebar turns each view into a focused, conversation-style list without changing how notes are stored or played.

This adds a **second sidebar** between the existing `AppSidebar` (Send a note / Inbox / Sent) and the notes panel. It is contextual: on Inbox it lists the **senders** of received notes; on Sent it lists the **recipients** of sent notes (including email-fallback copies). Selecting a person filters the notes panel.

**Dependencies**:
- Auth/session (`06`), schema/RLS (`07`), notes produced by send (`08`), Inbox/Sent pages + `AppSidebar`/`NotesList` (`09`).

## Technical Specification

**Data Models**: No schema changes. Contacts are derived in-memory from the already-fetched `VoiceNote[]` (`src/lib/db/types.ts`).

**Components/Modules**:
- `src/lib/contacts.ts` (NEW) — pure helpers, no I/O:
  - `Contact` type: `{ key, name, count, lastAt, viaEmail }`.
  - `contactKey(note, view)` — the grouping id: the counterpart's account id when present, else `name:<lowercased name>` (handles null `sender_id` on anonymous-origin received notes and null `recipient_id` on email-fallback sent copies).
  - `buildContacts(notes, view)` — groups notes into `Contact[]`, sorted by `lastAt` (newest first); `viaEmail` true when the group has no account id in the `sent` view.
  - `notesForContact(notes, view, key)` — filters notes to one contact key.
  - `resolveSelectedKey(contacts, requested)` — returns `requested` if it matches a contact, else the first contact's key (default selection), else `null` when there are no contacts.
- `src/components/ContactsSidebar.tsx` (NEW, client) — renders the contact list as links to `?c=<key>` on the current pathname (`usePathname`); highlights the active contact; shows each person's name (initial avatar), note count, and a "via email" tag when `viaEmail`. Collapses to a horizontal scroller under 840px (matching `AppSidebar`).
- `src/app/(app)/inbox/page.tsx` (MODIFIED) — build sender contacts from received notes, resolve the selected key from `searchParams.c`, render `ContactsSidebar` + `NotesList` (filtered) inside a `.contacts-layout` wrapper.
- `src/app/(app)/sent/page.tsx` (MODIFIED) — same for recipient contacts from sent notes.
- `src/app/globals.css` (MODIFIED) — styles for `.contacts-layout`, `.contacts-sidebar`, contact rows, avatar, count, "via email" tag, and the <840px collapse.

**API/Backend**: None. Existing RLS-scoped `voice_notes` queries on `/inbox` and `/sent` are unchanged; grouping/filtering happen server-side after fetch. Selection is the `c` query param (Next 15 async `searchParams`).

**State/Configuration**: URL search param `c` (contact key) on `/inbox` and `/sent`.

## Acceptance Criteria

- [x] **AC1**: Inbox lists senders as contacts
  - Given a logged-in user with received notes from two different people
  - When they open `/inbox`
  - Then a contacts sidebar lists both senders (each with name and note count), newest activity first

- [x] **AC2**: Sent lists recipients as contacts
  - Given a user who has sent notes to two different recipients
  - When they open `/sent`
  - Then the contacts sidebar lists both recipients, and email-fallback recipients (no account) are grouped by name and tagged "via email"

- [x] **AC3**: Selecting a contact filters the notes panel
  - Given a contacts sidebar with the second person highlighted-able
  - When the user clicks a person
  - Then the notes panel shows only notes received from (Inbox) / sent to (Sent) that person, and that contact is marked active

- [x] **AC4**: First contact selected by default
  - Given a view with one or more contacts and no `c` in the URL
  - When the page loads
  - Then the first contact is selected and its notes are shown (no "nothing selected" state)

- [x] **AC5**: Empty state when there are no notes
  - Given a user with no notes in the current view
  - When they open it
  - Then the contacts sidebar shows a friendly empty hint and the notes panel shows the existing empty state (with "Send a note")

- [x] **AC6**: Note actions still work within the filtered list
  - Given a filtered notes panel
  - When the user plays or deletes a note
  - Then playback (signed URL) and delete behave as before, and the list reflects the change

## Edge Cases

- A note whose counterpart has no name → shown as "Someone".
- Unknown/stale `c` value in the URL → falls back to the first contact (AC4).
- Same display name from two different accounts → kept separate (keyed by account id, not name).

## Changelog

### [2026-06-16] - Layout: flat connected notes column
- **Author**: Claude AI
- **Changed**: The notes panel is no longer a centered floating `.card`. Inbox/Sent now render a flat, left-aligned `.notes-panel` (with a simple `.notes-head`/`.notes-title` header) inside a left-justified `.contacts-notes` column, so content flows continuously: nav sidebar → contact list → notes. Removed the unused `.inbox-card` rule.
- **Reason**: User felt the centered card looked out of place; the third column should connect to the contact list.

### [2026-06-16] - Layout: connected three-column shell
- **Author**: Claude AI
- **Changed**: The authenticated shell is now an in-flow three-column flex layout — nav sidebar → contacts column → notes — instead of a fixed nav with a centered card. `(app)/layout.tsx` uses `.app-shell`/`.app-main` (replacing `.app-stage`/`.app-content`); `AppSidebar` and `ContactsSidebar` are sticky full-height columns sharing the same top edge; the notes panel (`.contacts-notes`) fills the remaining width. Compose keeps a centered card (`.app-main:has(.contacts-layout)` opts only Inbox/Sent into full-bleed).
- **Reason**: User wanted the contact list visually connected to the left sidebar (sidebar → contacts → voice notes), not floating inside the page.
- **Verification**: lint, tsc, production build, and 89 unit tests still pass.

### [2026-06-16] - Verified
- **Author**: Claude AI
- **Status**: Verified
- **Validation Result**: COMPLIANT
- **Branch**: `feature/contacts-sidebar`
- **Notes**: Added `src/lib/contacts.ts` (pure `contactKey`/`buildContacts`/`notesForContact`/`resolveSelectedKey`), `ContactsSidebar.tsx` (client; links to `?c=`, active highlight, initial avatar, count, "via email" tag, <840px horizontal collapse), and wired `/inbox` (senders) and `/sent` (recipients) to derive contacts from RLS-scoped notes, resolve the selected key from async `searchParams`, and filter via shared `NotesList`. Styling added to `globals.css`. Unit tests in `contacts.test.ts` cover grouping, name-key fallback, viaEmail, default/stale selection, and empty list. All 6 ACs satisfied; lint, tsc, production build, and 89 unit tests pass. No schema/API changes.

### [2026-06-16] - Approved
- **Author**: Claude AI
- **Status**: Approved (planning — not yet implemented)
- **Review**: PASS — single capability, 6 testable ACs, concise (<200 lines), no schema/API changes, affected files listed. No issues found.

### [2026-06-16] - Draft
- **Author**: Claude AI
- **Notes**: New contextual contacts sidebar for Inbox/Sent. Contextual list (Inbox=senders, Sent=recipients), first contact selected by default, email-fallback recipients grouped by name and tagged "via email". No schema/API changes — pure derive-and-filter over RLS-scoped notes via a `c` query param.
