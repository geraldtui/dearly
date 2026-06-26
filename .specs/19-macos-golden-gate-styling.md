# Spec: macOS Golden Gate Styling

- **Status**: Implemented
- **Created**: 2026-06-26
- **Last Modified**: 2026-06-26
- **Feature area**: UI/Design System
- **Related**: All UI specs (visual-only update)

## User Story

As a user, I want the entire site to look like macOS with glass effects and rounded corners, So that I have a modern, familiar, and polished visual experience.

## Context

**Why**: The current design uses warm sand tones with solid backgrounds. Users expect modern app UIs to match their OS aesthetics, particularly the macOS Golden Gate style introduced in macOS Big Sur and refined in Ventura/Sonoma. Glass morphism (backdrop-filter blur with translucency) creates visual depth, maintains familiar system design language, and provides a premium feel. This is a visual-only update with no functionality changes.

**Design Decisions**:
- Subtle glass effect: 10-20px backdrop-filter blur with light translucency
- Cool gray palette (typical macOS) replacing warm tones
- macOS elevation shadows (soft, layered)
- Dark mode support via `prefers-color-scheme`
- Keep gradient backgrounds with glass cards layered on top
- Keep 16px border radius (current)

## Technical Specification

**CSS Variables/Design Tokens**:
- `src/app/globals.css` (MODIFIED) — Update CSS custom properties for:
  - Light mode: cool grays (`--bg`, `--card`, `--accent`, `--accent-deep`, `--ink`, `--ink-soft`, `--line`)
  - Dark mode: `@media (prefers-color-scheme: dark)` block with inverted values
  - macOS shadow tokens: layered elevation shadows
  - Glass effect utilities: `backdrop-filter: blur()`, `background: rgba()`

**Glass Effect Application**:
- All `.card` elements: backdrop-filter blur + translucent backgrounds
- `.chat-list`: glass effect with border
- `.chat-thread`: glass panel with elevated shadow
- Modals (`.chat-label-overlay`, `.notepad-overlay`): backdrop blur
- Buttons and inputs: subtle glass with hover states

**Shadow System**:
- Replace existing `box-shadow` with macOS elevation system:
  - Level 1: `0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)`
  - Level 2: `0 4px 8px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.08)`
  - Level 3: `0 8px 16px rgba(0,0,0,0.15), 0 4px 6px rgba(0,0,0,0.10)`

**Background Gradients**:
- Update body background to cool gray gradient
- Adjust orb colors to blue/purple tones for macOS aesthetic

**State/Configuration**: None (CSS only)

## Acceptance Criteria

- [x] **AC1**: Cool gray color palette applied
  - Given the site in light mode
  - When a user views any page
  - Then colors use cool grays instead of warm sand tones

- [x] **AC2**: Glass effect on all cards
  - Given any card component (homepage form, thread list, modals)
  - When rendered
  - Then backdrop-filter blur (10-20px) and translucent background are applied

- [x] **AC3**: macOS elevation shadows
  - Given any elevated UI element
  - When rendered
  - Then soft, layered shadows match macOS shadow system

- [x] **AC4**: Dark mode support
  - Given the user has dark mode enabled in system preferences
  - When viewing the site
  - Then dark theme with appropriate glass effects is applied

- [x] **AC5**: Rounded corners consistent
  - Given all UI elements
  - When rendered
  - Then 16px border-radius is applied consistently

- [x] **AC6**: No functionality regression
  - Given all existing features
  - When visual updates are applied
  - Then all interactions, buttons, forms, and navigation work identically

## Edge Cases

- Reduced motion: Maintain glass effect but disable any blur animations if added later
- Browser compatibility: Provide fallback solid backgrounds for browsers without backdrop-filter support
- Performance: Glass effects should not cause janky scrolling or input lag

## Testing

- Manual visual QA in light and dark mode
- Test on Safari, Chrome, Firefox
- Verify no console errors or warnings
- Confirm all interactive elements remain clickable/usable
- Check performance with Chrome DevTools (60fps maintained)

## Changelog

### [2026-06-26] - Implemented
- **Author**: Claude AI
- **Status**: Implemented
- **Notes**: Complete macOS Golden Gate styling implementation. All acceptance criteria satisfied.
- **Deviations**: None
