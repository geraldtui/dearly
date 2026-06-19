# Spec: Authenticated Homepage Redirect & Route Rename

- **Status**: Verified
- **Created**: 2026-06-18
- **Last Modified**: 2026-06-18
- **Feature area**: Accounts (epic) / Navigation
- **Related**: `10-homepage-signup-promo.md`, `14-chat-conversations.md`, `17-chat-navigation-performance.md`

## User Story

As a registered Dearly user, I want to be redirected to my voice notes when I visit the homepage, so that I don't see the public send form and can get straight to my conversations.

## Context

**Why**: The homepage (`/`) currently shows the public send form to all users, including authenticated users. This creates a confusing experience where logged-in users see a form designed for non-users instead of being taken directly to their conversations. Additionally, the route `/chats` should be renamed to `/voicenotes` to better reflect the product terminology established in `10-homepage-signup-promo.md`.

**Decisions** (resolved with user):
- Homepage redirect for authenticated users: Server-side (middleware) → `/voicenotes`
- Route rename: `/chats` → `/voicenotes`
- Old `/chats` URL: Remove entirely (no backwards compatibility redirect)
- Existing redirects (`/inbox`, `/sent`) update to point to `/voicenotes`

**Dependencies**: Existing auth middleware (`06`), chat view (`14`), navigation components (`10`).

## Technical Specification

**Data Models**: No schema changes.

**API/Backend**: No new endpoints. Email inboxUrl in API responses updated to reference `/voicenotes`.

**Components/Modules**:
- `src/middleware.ts` (MODIFIED) — Add homepage redirect for authenticated users; update `PROTECTED_PREFIXES` from `/chats` to `/voicenotes`
- `src/app/(app)/chats/` (MOVED) — Rename directory to `src/app/(app)/voicenotes/`
- `src/app/(app)/voicenotes/page.tsx` (MOVED) — Update metadata title if needed
- `src/app/(app)/inbox/page.tsx` (MODIFIED) — Redirect target `/chats` → `/voicenotes`
- `src/app/(app)/sent/page.tsx` (MODIFIED) — Redirect target `/chats` → `/voicenotes`
- `src/app/(app)/compose/page.tsx` (MODIFIED) — Redirect target `/chats?new=1` → `/voicenotes`
- `src/components/PublicNav.tsx` (MODIFIED) — href `/chats` → `/voicenotes`
- `src/components/AppSidebar.tsx` (MODIFIED) — hrefs and pathname check `/chats` → `/voicenotes`
- `src/components/SignupPromoCard.tsx` (MODIFIED) — href `/chats` → `/voicenotes`
- `src/components/AuthForm.tsx` (MODIFIED) — router.push default `/chats` → `/voicenotes`
- `src/app/auth/callback/route.ts` (MODIFIED) — Redirect default `/chats` → `/voicenotes`
- `src/app/api/send/route.ts` (MODIFIED) — `inboxUrl` `/chats` → `/voicenotes`
- `src/app/api/notes/route.ts` (MODIFIED) — `inboxUrl` `/chats` → `/voicenotes`
- `src/app/api/send/__tests__/route.test.ts` (MODIFIED) — Update test assertions for `/voicenotes`
- `src/app/api/notes/__tests__/route.test.ts` (MODIFIED) — Update test assertions for `/voicenotes`

**Migration Strategy**: This is a breaking change for users who have bookmarked `/chats`. No redirect is provided per user's decision. `/inbox` and `/sent` bookmarks continue to work via existing redirect pages.

**State/Configuration**: No new state or env vars.

## Acceptance Criteria

- [x] **AC1**: Homepage redirects authenticated users
  - Given a logged-in user visits the homepage (`/`)
  - When the page loads
  - Then they are immediately redirected to `/voicenotes` via server-side redirect (no flash of homepage)

- [x] **AC2**: Homepage remains public for unauthenticated users
  - Given a visitor without an account visits the homepage
  - When the page loads
  - Then they see the public send form with no redirect

- [x] **AC3**: Main voice notes route is `/voicenotes`
  - Given any user navigating to the main conversations view
  - When they use navigation links or direct access
  - Then the URL is `/voicenotes` and the page displays the chat list and thread

- [x] **AC4**: Old `/chats` route is removed
  - Given a user visits `/chats` directly
  - When the page loads
  - Then they receive a 404 (route does not exist)

- [x] **AC5**: Navigation components use `/voicenotes`
  - Given any navigation component renders (`PublicNav`, `AppSidebar`, `SignupPromoCard`)
  - When a user clicks a link to the main chat view
  - Then they navigate to `/voicenotes`

- [x] **AC6**: Legacy redirects updated
  - Given a user visits `/inbox` or `/sent`
  - When the redirect executes
  - Then they land on `/voicenotes`

- [x] **AC7**: Auth flows redirect to `/voicenotes`
  - Given a user completes signup, login, or OAuth callback
  - When they are redirected to the authenticated area
  - Then they land on `/voicenotes` (not `/chats`)

## Edge Cases

- Users with `/chats` bookmarks will get 404 (acceptable per user decision)
- `/compose` redirects to `/voicenotes` (simplified from old `/chats?new=1`)
- Email notifications' `inboxUrl` updated to reference `/voicenotes`
- Middleware `PROTECTED_PREFIXES` includes `/voicenotes` (not `/chats`)
- `/inbox` and `/sent` redirects preserved for backwards compatibility

## Changelog

### [2026-06-18] - Verified
- **Author**: Claude AI
- **Status**: Verified
- **Validation Result**: COMPLIANT
- **Branch**: `feature/authenticated-homepage-redirect`
- **Notes**: All 7 ACs verified and satisfied. Implementation validated against spec requirements and Clean Code principles. Middleware adds server-side homepage redirect for authenticated users (`/` → `/voicenotes`). Route successfully renamed across 15 files. All navigation components, auth flows, legacy redirects, API responses, and tests updated. Old `/chats` route removed (404). Quality checks: TypeScript ✅, linter ✅, 100 unit tests ✅, build ✅. Changes are uncommitted on feature branch per auto-sdd workflow.

### [2026-06-18] - Implemented
- **Author**: Claude AI
- **Status**: Implemented
- **Branch**: `feature/authenticated-homepage-redirect`
- **Notes**: All 7 ACs implemented. Renamed directory `src/app/(app)/chats/` → `src/app/(app)/voicenotes/`. Updated middleware to add homepage redirect for authenticated users (`/` → `/voicenotes`) and changed `PROTECTED_PREFIXES` from `/chats` to `/voicenotes`. Updated all navigation components (`PublicNav`, `AppSidebar`, `SignupPromoCard`), auth flows (`AuthForm`, `auth/callback`), redirect pages (`/inbox`, `/sent`, `/compose`), API responses (`api/send`, `api/notes`), and test assertions. All quality checks passed: TypeScript (✓), linter (✓ with 1 pre-existing warning), 100 unit tests (✓), build (✓). Old `/chats` route removed (returns 404).

### [2026-06-18] - Approved
- **Author**: Claude AI
- **Status**: Approved
- **Notes**: Spec passed comprehensive review. All required sections complete. 7 testable ACs within recommended range. Clear technical specification with 15 specific files identified. No critical issues or ambiguities found. Ready for implementation.

### [2026-06-18] - Draft
- **Author**: Claude AI
- **Status**: Draft
- **Notes**: Initial specification created after clarifying requirements with user. Covers homepage redirect for authenticated users (server-side) and complete route rename from `/chats` to `/voicenotes` across 13 files plus directory rename. Old `/chats` URL removed entirely per user request.
