# Spec: Chat Conversations (WhatsApp-style)

- **Status**: Verified
- **Created**: 2026-06-18
- **Last Modified**: 2026-06-18
- **Feature area**: Accounts (epic)
- **Related**: `09-voice-note-inbox.md`, `13-contacts-sidebar.md`, `08-send-to-dearly-user.md`, `07-account-data-and-storage.md`

## User Story

As a logged-in Dearly user, I want the app to work like an instant-messaging client — a list of people on the left and the conversation in the middle where I can record and send a voice note inline — so that exchanging voice notes feels like chatting, not emailing.

## Context

**Why**: Today the authenticated app is split into Inbox, Sent, and a separate Compose page — an email mental model. Users think of voice notes as a back-and-forth with a person. This unifies each person's sent + received notes into a single conversation timeline with an inline recorder, replacing the Inbox/Sent/Compose split with one "Chats" experience.

**Decisions** (resolved with user): replace Inbox/Sent/Compose with a single Chats view; add a `recipient_email` column so any contact (Dearly user or email-only) is replyable; v1 loads on open and refreshes after sending (no live updates).

**Dependencies**: Auth/session (`06`), schema/RLS (`07`), hybrid send `/api/notes` (`08`), playback/signed URLs + `NotePlayer` (`09`), recorder `VoiceRecorder` (`02`). Reuses the conversation-grouping idea from `13` (which it supersedes for the authenticated UI).

## Technical Specification

**Data Models** (`src/lib/db/types.ts`, `supabase/migrations/0003_recipient_email.sql` NEW):
- Add nullable `recipient_email text` to `voice_notes`; persisted on every new send so email-only threads can be replied to. No RLS change.

**Components/Modules**:
- `src/lib/conversations.ts` (NEW, pure) — `Conversation` type `{ key, name, counterpartId, counterpartEmail, lastAt, viaEmail, canReply }`; `buildConversations(notes, userId)` merges sent+received per counterpart (key by account id, else `email:<lower>`, else `name:<lower>`), newest first; `messagesForConversation(notes, userId, key)` returns the timeline (oldest→newest) with a derived `outgoing` flag; `resolveSelectedKey(convos, requested)`.
- `src/components/ChatList.tsx` (NEW, client) — left conversation list (avatar, name, last-activity, "via email" tag), links to `?c=<key>`, active highlight, plus a "New chat" action.
- `src/components/ChatThread.tsx` (NEW, client) — middle timeline of voice-note bubbles (outgoing right / incoming left), each with `NotePlayer`, time, optional subject caption; header with the counterpart; renders `ChatComposer`.
- `src/components/ChatComposer.tsx` (NEW, client) — inline `VoiceRecorder` + send to the open conversation (or, in "new" mode, collect name + email first); posts via `sendAccountNote`; refreshes on success. Disabled with a hint when the counterpart can't be replied to (incoming-only, no email/account).
- `src/app/(app)/chats/page.tsx` (NEW) — fetches the user's notes (`sender_id = me` OR `recipient_id = me`), builds conversations, resolves selection + `new` mode from async `searchParams`, resolves the selected counterpart's email (account → `profiles` via service client; else stored `recipient_email`), renders `ChatList` + `ChatThread`.
- `src/app/(app)/inbox|sent|compose/page.tsx` (MODIFIED) — redirect to `/chats`.
- `src/components/AppSidebar.tsx` (MODIFIED) — nav becomes "Chats" + "New chat"; brand links to `/chats`.
- `src/lib/notes.ts` (MODIFIED) — `storeNote` writes `recipient_email`; `StoreNoteOpts` gains `recipientEmail`.
- `src/app/api/notes/route.ts` + `src/app/api/send/route.ts` (MODIFIED) — pass `recipientEmail` into `storeNote`.
- `src/app/globals.css` (MODIFIED) — chat list, thread, bubbles, composer styles; <840px collapse.

**API/Backend**: No new endpoints. Inline send reuses `POST /api/notes` (hybrid in-app vs email). Selection via `c` (conversation key) and `new` query params.

## Acceptance Criteria

- [x] **AC1**: Chats replaces the old sections
  - Given a logged-in user
  - When they open the app, `/inbox`, `/sent`, or `/compose`
  - Then the nav shows "Chats" + "New chat" and those old routes land on `/chats`

- [x] **AC2**: Conversation list merges per person
  - Given notes exchanged (sent and/or received) with two people
  - When `/chats` loads
  - Then the left list shows one row per person (avatar, name, newest activity first), email-only contacts tagged "via email", first conversation selected by default

- [x] **AC3**: Conversation timeline shows both directions
  - Given a selected conversation
  - When it renders
  - Then all notes with that person appear oldest→newest, outgoing right / incoming left, each playable, with a subject caption when present

- [x] **AC4**: Record and send inline
  - Given an open conversation with a replyable counterpart
  - When the user records a note and sends with the inline composer
  - Then it is delivered (in-app for Dearly users, email for others), `recipient_email` is stored, and the new note appears in the thread

- [x] **AC5**: Start a new chat
  - Given the user clicks "New chat"
  - When they enter a name + email, record, and send
  - Then the note is sent and the new conversation appears selected in the list

- [x] **AC6**: Non-replyable conversations are read-only
  - Given a conversation that is incoming-only from a guest sender (no account, no stored email)
  - When it is open
  - Then the timeline still plays back, and the composer is disabled with a clear hint

- [x] **AC7**: Empty state
  - Given a user with no notes
  - When `/chats` loads
  - Then a friendly empty state invites them to start a new chat

## Edge Cases

- Counterpart with no name → "Someone"; same name across two accounts stays separate (keyed by id).
- Stale/unknown `c` → first conversation (AC2 default).
- Simulated recording (no mic) → still sends (email path, no attachment), consistent with existing behavior.

## Changelog

### [2026-06-18] - Verified
- **Author**: Claude AI
- **Status**: Verified
- **Validation Result**: COMPLIANT
- **Branch**: `feature/chat-conversations`
- **Notes**: Added `src/lib/conversations.ts` (pure merge of sent+received per counterpart, keyed by account id → email → name) with unit tests; `ChatList` (left rail), `ChatThread` (timeline bubbles + delete + `NotePlayer`), and `ChatComposer` (inline `VoiceRecorder` + send, with a "new" mode for fresh contacts and a disabled state for non-replyable guest threads); `/chats` server page resolves conversations, the selected counterpart's reply email (stored or via `profiles`), and renders the two panes. Migration `0003_recipient_email.sql` + `storeNote`/both routes now persist `recipient_email`. `/inbox`, `/sent`, `/compose` redirect to `/chats`; `AppSidebar`, auth/post-login redirects, and public CTAs point at `/chats`; `middleware` protects `/chats`. Superseded `contacts.ts`, `ContactsSidebar`, `NotesList`, `NoteCard`, `ComposeForm` (+ tests) were removed. All 85 unit tests, lint, tsc, and the production build pass. **Migration `0003` must be applied to Supabase (preview + prod).**

### [2026-06-18] - Approved
- **Author**: Claude AI
- **Status**: Approved
- **Review**: Single cohesive capability (chat UI over existing notes). 7 ACs. Adds one nullable column (no RLS change) and reuses `/api/notes`, `NotePlayer`, `VoiceRecorder`. Supersedes the `13` contacts-sidebar UI for the authenticated app.
