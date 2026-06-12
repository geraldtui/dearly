# Spec: Voice-Note Data Model & Storage

- **Status**: Verified
- **Created**: 2026-06-11
- **Last Modified**: 2026-06-11
- **Feature area**: Accounts (epic)
- **Related**: `docs/dearly-accounts-architecture.md`, `06-account-auth.md`, `08-send-to-dearly-user.md`

## User Story

As Dearly, I want a database schema and private audio storage with strict access rules, so that voice notes are stored securely and only visible to their sender and recipient.

## Context

**Why**: The accounts model requires durable storage that the send and inbox flows build on. This spec defines the Postgres tables, the Storage bucket, and the Row-Level Security (RLS) that guarantees privacy. No UI.

**Dependencies**:
- Supabase project + Auth from `06-account-auth.md`.

## Technical Specification

**Data Models** (Supabase Postgres — defined via SQL migration):
- `profiles` — `id` (uuid, = `auth.users.id`), `email` (unique, lower-cased), `display_name`, `created_at`.
- `voice_notes` — `id`, `sender_id`, `recipient_id`, `sender_name`, `recipient_name`, `subject` (nullable), `storage_path`, `duration_seconds`, `listened_at` (nullable), `created_at`.

**Storage**:
- Private bucket `voice-notes`; object key `{recipient_id}/{voice_note_id}.mp3`.
- No public access; reads via short-lived signed URLs only.

**Components/Modules**:
- `supabase/migrations/0001_accounts.sql` (NEW) — tables, indexes, RLS policies, and a trigger to insert a `profiles` row on new `auth.users`.
- `src/lib/db/types.ts` (NEW) — TypeScript types for `Profile` and `VoiceNote`.

## Acceptance Criteria

- [ ] **AC1**: Schema exists
  - Given the migration is applied
  - When inspecting the database
  - Then `profiles` and `voice_notes` exist with the fields above and a unique, lower-cased `profiles.email`

- [ ] **AC2**: Profile auto-provisioned
  - Given a new auth user is created
  - When the trigger runs
  - Then a matching `profiles` row is inserted with their email and display name

- [ ] **AC3**: Note visibility is restricted
  - Given a `voice_notes` row
  - When a user queries it
  - Then they can read it only if they are the `sender_id` or `recipient_id` (enforced by RLS)

- [ ] **AC4**: Insert is restricted to the sender
  - Given an authenticated user
  - When they insert a `voice_notes` row
  - Then RLS requires `sender_id = auth.uid()`

- [ ] **AC5**: Audio bucket is private
  - Given the `voice-notes` bucket
  - When an unauthenticated request asks for an object
  - Then access is denied; authorized access is only via a signed URL minted server-side

- [ ] **AC6**: Participants can delete their note
  - Given a note where the user is sender or recipient
  - When they delete it
  - Then RLS permits removing the row (and the app removes the Storage object)

## Edge Cases

- Email case/whitespace normalized to lower-case on write to make lookups reliable.
- Orphaned Storage objects avoided by deleting the object in the same operation as the row.

## Changelog

### [2026-06-11] - Approved
- **Author**: Claude AI
- **Status**: Approved (planning — not yet implemented)
- **Notes**: Part of the Dearly Accounts epic. Defines schema + Storage + RLS (6 ACs). Service-role key is server-only; clients never see private objects.

### [2026-06-11] - Implemented & Verified
- **Author**: Claude AI
- **Status**: Verified
- **Validation Result**: COMPLIANT (static — migration must be applied to a Supabase project)
- **Branch**: `feature/dearly-accounts`
- **Notes**: Added `supabase/migrations/0001_accounts.sql` (tables with lower-cased unique email check, indexes, RLS policies for select/insert/update/delete per spec, `handle_new_user` trigger, private `voice-notes` bucket) and `src/lib/db/types.ts`. All 6 ACs satisfied by the migration's DDL/policies; app code (specs 08/09) relies on them. Lint + build pass.
