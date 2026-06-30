# Spec: Hide Send Button Until Recording Exists

- **Status**: Verified
- **Created**: 2026-06-26
- **Last Modified**: 2026-06-26
- **Feature area**: UI/UX - Voice Note Composer
- **Related**: `01-send-voice-note.md`, `02-voice-recorder.md`

## User Story

As a user, I want the send button hidden until after I record my voice note, So that the UI is cleaner and the send action only appears when it's relevant.

## Context

**Why**: Currently the send button is always visible but disabled (grayed out) when no recording exists. This creates visual clutter and presents a non-functional element to users who haven't recorded yet. Hiding the button until a recording is complete creates a cleaner, more progressive disclosure UX where actions appear only when they become available.

**Design Decision** (resolved with user): Button hides again if user hits "Redo recording" - it only shows after completing a recording.

**Dependencies**: Existing `VoiceNoteComposer` component with `recording` state.

## Technical Specification

**Data Models**: No changes. Uses existing `Recording | null` state.

**API/Backend**: None required.

**Components/Modules**:
- `src/components/VoiceNoteComposer.tsx` (MODIFIED) - Conditionally render send button only when `recording` is not null:
  - Replace `disabled={sending || !recording}` with conditional rendering
  - Button appears only when `recording` exists (truthy)
  - Button disappears when recording is null (initial state or after redo)
  - Keep existing disabled state for `sending` (spinner state)

**CSS Changes**: None required. Existing button styles remain unchanged.

**State Flow**:
1. Initial: `recording = null` → button hidden
2. After recording: `recording = { ... }` → button appears
3. Click redo: `recording = null` → button hides again
4. Record again: `recording = { ... }` → button reappears

## Acceptance Criteria

- [x] **AC1**: Send button hidden on initial load
  - Given the voice note composer loads
  - When no recording exists yet
  - Then the send button is not visible (not just disabled)

- [x] **AC2**: Send button appears after recording
  - Given the user completes a recording
  - When the recording state changes from null to a Recording object
  - Then the send button becomes visible

- [x] **AC3**: Send button hides after redo
  - Given a completed recording with visible send button
  - When the user clicks "Redo recording"
  - Then the send button disappears again

- [x] **AC4**: Send button functionality unchanged
  - Given the send button is visible
  - When clicked while sending
  - Then it shows spinner and remains disabled (existing behavior)

- [x] **AC5**: Works in both new and reply modes
  - Given voice note composer in "new" mode or "reply" mode
  - When recording state changes
  - Then send button visibility updates correctly in both modes

## Edge Cases

- **Disabled reply state** (no counterpart email): Send button remains hidden (composer shows "can't reply" message)
- **Validation errors**: Send button visible if recording exists, but validation prevents send (existing error handling)
- **Sending state**: Button visible but shows spinner and disabled (existing behavior preserved)

## Changelog

### [2026-06-26] - Verified
- **Author**: Claude AI
- **Status**: Verified
- **Validation Result**: COMPLIANT ✅
- **Branch**: `feature/hide-send-until-recorded`
- **Notes**: All 5 ACs verified and satisfied. Send button conditionally rendered with `{recording && (...)}`. Button hidden on initial load, appears after recording, hides after redo. Functionality unchanged. Works in both new and reply modes. Clean Code principles followed. Type check and linter pass.

### [2026-06-26] - Implemented
- **Author**: Claude AI
- **Status**: Implemented
- **Branch**: `feature/hide-send-until-recorded`
- **Files Changed**: 
  - `src/components/VoiceNoteComposer.tsx` - Wrapped send button in `{recording && (...)}` conditional, removed `!recording` from disabled prop since button now only renders when recording exists
- **Notes**: Send button now completely hidden until recording exists. Button appears after recording, hides again after redo. Type check and linter pass.

### [2026-06-26] - Approved
- **Author**: Claude AI
- **Status**: Approved
- **Review**: Passed review. Clean, focused spec for hiding send button until recording exists. 5 ACs, single UI change, no ambiguities.

### [2026-06-26] - Draft
- **Author**: Claude AI
- **Status**: Draft
- **Notes**: Initial spec for hiding send button until recording exists. Simple conditional rendering change in VoiceNoteComposer.
