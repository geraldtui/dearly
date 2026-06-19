# Spec: Temporary Notepad

- **Status**: Verified
- **Created**: 2026-06-11
- **Last Modified**: 2026-06-11
- **Feature area**: Compose UX
- **Related**: `02-voice-recorder.md`

## User Story

As a sender, I want a temporary notepad to jot down my thoughts before recording, so that I can gather what I want to say without it affecting the form or being sent in the email.

## Context

**Why**: People often want to draft or outline a voice note before pressing record. A lightweight scratchpad makes this easy. It is purely private (never emailed) and stays hidden until the user opens it, so it never disrupts the existing compose layout (form → recorder → send).

**Dependencies**:
- Lives on the public compose screen rendered by `src/app/page.tsx` (alongside `02-voice-recorder.md`) and, in the authenticated app, inside the chat composer (`14-chat-conversations.md`).
- No backend; notes are stored only in the browser.

## Technical Specification

**Components/Modules**:
- `src/components/Notepad.tsx` (NEW) — a self-contained client component: a toggle button plus an overlay panel containing a textarea, a "Clear" control, and a close control. Reads/writes its text to `localStorage`. Manages its own open/closed and text state. Takes one optional prop, `inline` (default `false`): when `false` it renders as a fixed floating FAB (`.notepad-floating`) with the one-time awareness hint; when `true` it renders as an inline button (`.notepad-inline`, no hint) sized to sit in a control row.
- `src/app/page.tsx` (MODIFIED) — render `<Notepad />` (floating) within the compose view only (not on the success screen). It is a floating sibling and does not alter the existing form/recorder/send markup.
- `src/components/ChatComposer.tsx` (MODIFIED, 2026-06-18) — renders `<Notepad inline />` beside the optional subject input in the chat composer's subject row, so the scratchpad is available while composing a chat note.
- `src/app/globals.css` (MODIFIED) — add styles for the floating button and overlay panel using existing design tokens (`--card`, `--accent`, `--accent-deep`, `--radius`, shadows), positioned `fixed` so the card layout is untouched.

**Storage**:
- `localStorage` key `dearly:notepad` holds the note text (string).
- `localStorage` key `dearly:notepad-hint` (`"1"` once the awareness tip is dismissed).

**State/Configuration**:
- `open: boolean` (panel visibility, default `false`).
- `text: string` (note contents, hydrated from `localStorage` on mount).

## Acceptance Criteria

- [ ] **AC1**: Notepad is hidden by default
  - Given the compose screen
  - When it first loads
  - Then only a small floating notepad button is visible and the notepad panel is closed

- [ ] **AC2**: Open and close on demand
  - Given the notepad is closed
  - When the user selects the floating button
  - Then the notepad panel opens with a focused textarea; selecting the close control (or pressing Escape) hides it again

- [ ] **AC3**: Does not disrupt existing UI
  - Given the notepad button or open panel
  - When it is shown
  - Then the form fields, voice recorder, and send button keep their position and size (the notepad overlays via fixed positioning and never reflows the card)

- [ ] **AC4**: Text persists across refresh
  - Given the user typed text into the notepad
  - When the page is refreshed and the notepad is reopened
  - Then the previously typed text is restored from `localStorage`

- [ ] **AC5**: Clear empties the notepad
  - Given the notepad contains text
  - When the user selects "Clear"
  - Then the textarea is emptied and the stored value in `localStorage` is removed

- [ ] **AC6**: Never part of the email
  - Given text in the notepad
  - When the user sends a voice note
  - Then the notepad text is not included in the email and is independent of the Subject field (sending does not clear the notepad)

- [ ] **AC7**: Dismissable awareness indicator (Added 2026-06-11)
  - Given a user who has not yet dismissed the tip
  - When the compose screen loads
  - Then a small dismissable callout (with a pulse dot on the button) introduces the notepad; dismissing it — or opening the notepad — hides it and it stays hidden on future visits (persisted in `localStorage`)

## Edge Cases

- `localStorage` unavailable (private mode/SSR): the notepad still opens and works in-memory for the session without throwing.
- Hydration: text is read inside an effect (client-only) to avoid SSR mismatch.
- Long text: the textarea scrolls within the fixed panel; the panel itself does not grow to disrupt the viewport.

## Changelog

### [2026-06-18] - Re-verified (inline variant in chat composer)
- **Author**: Claude AI
- **Status**: Verified
- **Validation Result**: COMPLIANT
- **Notes**: `Notepad` gained an optional `inline` prop. Default (`inline={false}`) is unchanged: floating FAB + awareness hint on the public compose screen (`page.tsx`). When `inline` is true it renders as a static button (`.notepad-inline`, hint suppressed) and is now placed in the chat composer's subject row (`ChatComposer.tsx`, spec 14). Storage keys, open/close/Escape, persistence, and Clear behave identically across both variants. All ACs still hold; the scratchpad remains private and is never part of any send.

### [2026-06-11] - Draft
- **Author**: Claude AI
- **Status**: Draft
- **Notes**: Initial draft. Decisions resolved with user: floating button + overlay panel (no reflow), `localStorage` persistence, pure scratchpad (never emailed, independent of Subject).

### [2026-06-11] - Approved
- **Author**: Claude AI
- **Status**: Approved
- **Notes**: Reviewed and approved. Scope confirmed small (1 new component, 2 modified files, 6 ACs, no backend). AC3 captures the non-disruption requirement; AC6 confirms scratchpad-only behavior.

### [2026-06-11] - Implemented
- **Author**: Claude AI
- **Status**: Implemented
- **Notes**: Added `src/components/Notepad.tsx` (floating FAB + overlay panel, `localStorage` key `dearly:notepad`, Escape-to-close, focus-on-open, Clear). Rendered `<Notepad />` on the compose screen only (`status !== "sent"`) in `src/app/page.tsx`. Added `.notepad-*` styles (`z-index: 40`, below the `z-index: 60` modal) in `globals.css`. Lint and production build pass. (No local git repo, so changes are in the working tree — no branch created.)

### [2026-06-11] - Verified
- **Author**: Claude AI
- **Status**: Verified
- **Validation Result**: COMPLIANT
- **Quality Score**: 10/10
- **Notes**: All 6 ACs satisfied; edge cases handled (localStorage wrapped in try/catch, hydration in effect, textarea scrolls within a max-height panel). Clean Code followed (single self-contained component, no props, meaningful names). Notepad text is never referenced by `sendNote`/`reset`, confirming AC6.
- **Issues Fixed**: None

### [2026-06-11] - Requirement Change
- **Changed**: Added a one-time, dismissable awareness indicator (callout bubble + pulse dot on the button) so users discover the notepad. Added AC7 and the `dearly:notepad-hint` storage key.
- **Reason**: User wanted people to be aware of the feature without it being intrusive.
- **Impact**: `src/components/Notepad.tsx` (hint state + callout markup), `src/app/globals.css` (`.notepad-callout`, `.notepad-dot`, `notepadPulse`). Dismissal persists; opening the notepad also dismisses it. Lint and build pass.
- **Breaking Changes**: None.

### [2026-06-11] - Verified (AC7)
- **Author**: Claude AI
- **Status**: Verified
- **Validation Result**: COMPLIANT
- **Notes**: AC7 satisfied — hint shows only when not previously dismissed and the panel is closed, defaults dismissed during hydration to avoid flash, and persists dismissal via `dearly:notepad-hint`. Existing ACs unaffected. Lint and production build pass.
