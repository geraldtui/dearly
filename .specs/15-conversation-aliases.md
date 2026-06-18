# Spec: Conversation Aliases & Nicknames

- **Status**: Verified
- **Created**: 2026-06-18
- **Last Modified**: 2026-06-18
- **Feature area**: Accounts (epic)
- **Related**: `14-chat-conversations.md`, `08-send-to-dearly-user.md`, `07-account-data-and-storage.md`

## User Story

As a logged-in Dearly user, I want to set how I sign my notes to a specific person (e.g. "Dad" when sending to my kids) and rename how a contact appears in my chats, so that conversations feel personal and use the names I choose.

## Context

**Why**: `sender_name` is currently my profile display name for everyone, and the counterpart name I see is derived from notes. Per-conversation labels let me (a) sign as "Dad"/"Mom" to specific people and (b) privately rename a contact.

**Decisions** (resolved with user): both labels are edited from a pencil revealed when hovering a conversation row in the chat list (alias also settable when starting a new chat); the alias is **forward-only** (already-delivered notes are unchanged — notes in a recipient's inbox can't be rewritten); the nickname is **private** (changes only what I see, never the other person's account or their view). Both are owned by me and scoped by RLS.

**Dependencies**: chat view + conversation keying (`14`), hybrid send `/api/notes` (`08`), schema/RLS (`07`).

## Technical Specification

**Data Models** (`supabase/migrations/0004_conversation_labels.sql` NEW; mirrored in `supabase/dev-schema.sql`):
- `conversation_labels(owner_id uuid, counterpart_key text, nickname text, my_alias text, updated_at timestamptz)`, PK `(owner_id, counterpart_key)`. RLS: owner-only for select/insert/update/delete (`auth.uid() = owner_id`). `counterpart_key` matches the `conversations.ts` key (`id:` / `email:` / `name:`).
- `src/lib/db/types.ts`: add `ConversationLabel`.

**Components/Modules**:
- `src/lib/conversations.ts` (MODIFIED) — export `counterpartKey({ id, email, name })` so the send route and the page derive the same key (DRY with existing `keyFor`).
- `src/app/api/conversations/label/route.ts` (NEW) — `POST { counterpartKey, nickname, alias }`; upserts the label for the logged-in owner (user-scoped client, RLS). Blank values clear the field.
- `src/app/api/notes/route.ts` (MODIFIED) — compute the recipient's `counterpartKey`; if the request carries a new-chat `alias`, upsert it; resolve effective `senderName = savedAlias || profile.display_name || email`.
- `src/lib/api.ts` (MODIFIED) — `saveConversationLabel(...)`; `sendAccountNote` payload gains optional `alias` (new chat only).
- `src/app/(app)/chats/page.tsx` (MODIFIED) — fetch the owner's labels, override each conversation's display `name` with its `nickname`, and pass each conversation's `counterpartKey` + current `nickname`/`alias` to the chat list.
- `src/components/ConversationLabelEditor.tsx` (NEW, client) — pencil button + modal form (their nickname, my alias) → `saveConversationLabel` → refresh; closes on Escape/backdrop.
- `src/components/ChatList.tsx` (MODIFIED) — render the editor per row; the pencil is revealed on row hover/focus (UPDATED 2026-06-18, moved here from the thread header).
- `src/components/ChatComposer.tsx` (MODIFIED) — optional "Your name to them" field in new-chat mode, passed as `alias`.
- `src/app/globals.css` (MODIFIED) — editor styles.

**API/Backend**: One new POST route; `/api/notes` resolves `sender_name` from the saved alias. No change to playback/delete.

**State/Configuration**: None beyond the new table.

## Acceptance Criteria

- [x] **AC1**: Rename a contact (nickname)
  - Given an existing chat
  - When I hover its row in the chat list, open the editor pencil, edit the contact's name, and save
  - Then the new name shows in my chat list and thread header, and persists on reload — without changing their account or what they see

- [x] **AC2**: Set my alias for a contact
  - Given a chat with a Dearly-user or email contact
  - When I set "your name to them" to "Dad" and send a note
  - Then the recipient sees the note from "Dad" (in-app sender name and email from-name)

- [x] **AC3**: Alias is forward-only
  - Given notes I already sent before setting the alias
  - When I set/change the alias
  - Then previously delivered notes keep their original sender name; only new sends use the alias

- [x] **AC4**: Labels are private and per-owner
  - Given two users
  - When each sets labels
  - Then RLS scopes labels to their owner; one user's labels never affect another's view

- [x] **AC5**: Set alias when starting a new chat
  - Given the new-chat composer
  - When I fill "your name to them" and send
  - Then the alias is saved for that contact and used as the sender name on that send

- [x] **AC6**: Clearing a label restores defaults
  - Given a saved nickname/alias
  - When I clear the field and save
  - Then the contact falls back to the derived name / my profile name

## Edge Cases

- Account contact keyed by id stays consistent across both directions; email contact keyed by email.
- Whitespace-only input is treated as empty (clears the field).
- Guest incoming-only thread (name-keyed) can still be renamed locally; it has no email/account so the alias has no send target.

## Changelog

### [2026-06-18] - Updated (editor moved to chat-list hover)
- **Author**: Claude AI
- **Status**: Verified
- **Changed**: The nickname/alias editor moved from the chat thread header into the chat list: the pencil is now revealed when hovering (or focusing) a conversation row, and clicking it opens a centered modal (Escape/backdrop to dismiss) instead of an anchored popover. `ConversationLabelEditor` now renders per row in `ChatList` (which receives each conversation's `nickname`/`alias`); `ChatThread`/`ThreadCounterpart` no longer carry the editor or its label fields.
- **Reason**: User wanted alias editing surfaced from the contact list on hover rather than the thread header.
- **Verification**: tsc and lint pass.

### [2026-06-18] - Verified
- **Author**: Claude AI
- **Status**: Verified
- **Validation Result**: COMPLIANT
- **Branch**: `feature/conversation-aliases`
- **Notes**: Added `conversation_labels` table + RLS (migration `0004`, mirrored in `dev-schema.sql`) and `ConversationLabel` type. Exported `counterpartKey()` from `conversations.ts` (DRY keying) with a test. New `POST /api/conversations/label` upserts the owner's nickname + alias; `/api/notes` resolves `sender_name` from a new-chat alias (persisted) or the saved alias, falling back to the profile name (forward-only). `/chats` page loads labels, overrides displayed names with the nickname, and feeds the editor; `ConversationLabelEditor` (header pencil) edits nickname + alias; `ChatComposer` adds an optional "your name to them" field for new chats. `api.ts` gains `saveConversationLabel` and an optional `alias` on `sendAccountNote`. tsc, lint, 87 unit tests, and the production build pass. **Migration `0004` must be applied (re-run `supabase/dev-schema.sql` in dev).**

### [2026-06-18] - Approved
- **Author**: Claude AI
- **Status**: Approved
- **Review**: Single cohesive capability (per-conversation labels). 6 ACs. One new owner-scoped table (RLS), one POST route, reuses conversation keying and the existing send flow.
