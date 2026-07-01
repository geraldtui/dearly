# Spec: Reference-Matched Visual System & Splash Homepage

- **Status**: Verified
- **Created**: 2026-07-01
- **Last Modified**: 2026-07-01
- **Feature area**: UI/Design System / Homepage
- **Related**: `23-marketing-splash-homepage.md`, `19-macos-golden-gate-styling.md`, `22-rebrand-dearly-to-sona.md`

## User Story

As a visitor, I want the site to match the polished "Sona (standalone)" reference design — a glass/serif aesthetic with an animated intro splash and a hero landing — so that the product feels premium and consistent from the first screen.

## Context

**Why**: The current homepage (spec `23`) is a plain splash. The user provided a concrete reference HTML (`Sona (standalone).html`) and wants the entire site's visual system to match it, with the homepage reproducing the reference's intro splash + hero exactly.

**Decisions** (resolved with user):
- Scope: adopt the reference's design tokens (colors, glass system, gradients, fonts, orbs) **globally** in `globals.css` so all pages inherit the look, **and** rebuild the homepage to match the reference (nav, hero, glass "mock" card, 3-step strip, footer).
- Homepage CTAs point to our real destinations (**Sign up** / **Log in**), not the reference's removed anonymous "Compose/Record a note" page.
- Include the animated intro splash overlay (seal + "Sona." + line + tagline + "Tap anywhere to enter"), auto-dismiss ~2.3s, tap/click to skip — shown **once per browser session** (`sessionStorage`), respecting `prefers-reduced-motion`.

**Theme-system constraint**: The reference uses `:root[data-theme]` + `localStorage["sonus-theme"]`. The existing app uses `:root.dark`/`.light` classes + `localStorage["theme"]` via the global `ThemeToggle`, and every existing page depends on that. To avoid breaking the rest of the site, this spec **keeps the existing class-based theme system and `ThemeToggle`** and only ports the reference's **token values** into the existing `:root`, `:root.dark`, `:root.light`, and `prefers-color-scheme` scopes.

**Dependencies**: `ThemeToggle` (global), homepage from spec `23`, fonts already loaded in `layout.tsx`.

## Technical Specification

**Design tokens** — `src/app/globals.css` (MODIFIED):
- Port reference tokens into all theme scopes (`:root`, `@media (prefers-color-scheme: dark) :root:not(.light)`, `:root.dark`, `:root.light`): `--page-bg` (layered radial + linear gradient), `--card`, `--card-border`, `--card-inset`, `--glass-blur`, `--ink`, `--ink-soft`, `--accent`, `--accent-deep`, `--accent-fg`, `--accent-shadow`, `--line`, `--chip-bg`, `--chip-border`, `--field-bg`, `--field-border`, `--focus-ring`, `--orb1..4`, `--wave-line`, `--seal-hi`, `--glow-spot`.
- Preserve existing token names other pages rely on (`--shadow-1/2/3`, `--radius`, `--field-hover-border`, `--tint`, `--hover-surface`) so no other page breaks.
- `html, body` background → `var(--page-bg) fixed` with `--bg` fallback.

**Homepage** — `src/app/page.tsx` (REWRITTEN, client component):
- Structure mirrors the reference: `.orb.a/.b`, `.nav` (brand link → `/`, `ThemeToggle` slot, primary CTA), `.hero` (`.eyebrow`, serif `h1` with italic `<em>`, `.sub`, `.hero-cta` with Sign up + How-it-works, `.trust`), `.mock` glass recording card with animated waveform, `.steps` (3 `.step` cards), `.foot`.
- CTAs: primary "Sign up free" → `/signup`; ghost "Log in" → `/login` (replaces reference "Open Sona"/"Record a note"); "How it works" anchors to `#how`.
- Waveform bars rendered from a fixed height array (no per-render randomness).

**Intro splash** — `src/components/IntroSplash.tsx` (NEW, client component):
- Fixed overlay with seal + "Sona." + line + tagline + "Tap anywhere to enter"; auto-dismiss after ~2300ms (500ms if reduced motion); click to skip; fade/scale out.
- Shows once per session via `sessionStorage["sona:intro-seen"]`; if already seen, renders nothing. Adds/removes `body.splashing` to lock scroll while visible.

**Styles** — `src/app/globals.css` (MODIFIED): add reference component styles (`.orb`, `.nav`, `.nav-brand`, `.btn`, `.btn-primary`, `.btn-ghost`, `.eyebrow`, `.hero*`, `.mock*`, `.steps`, `.step`, `.foot`, `.splash*` intro, `@keyframes drift/pulse/bar/sealIn/wordIn/lineIn`, responsive breakpoints). Replace the old spec-`23` `.splash*`/`.orb` homepage rules.

**Theme toggle position**: keep bottom-right on homepage (existing `.splash`/`.stage` rule generalized to the new homepage container as needed).

**State/Configuration**: `sessionStorage["sona:intro-seen"]`. No new env vars.

## Acceptance Criteria

- [x] **AC1**: Global tokens match the reference
  - Given any page in light or dark mode
  - When it renders
  - Then it uses the reference palette/fonts/glass tokens (serif brand font, layered gradient page background, glass cards) and no other page's layout breaks

- [x] **AC2**: Homepage reproduces the reference hero
  - Given a visitor on `/` (after any intro splash)
  - When the page renders
  - Then they see the orbs, nav (brand + theme toggle + primary CTA), the eyebrow + serif headline "Some things are better *heard*.", the sub copy, the hero CTAs, the trust line, and the animated glass "mock" recording card — matching the reference layout

- [x] **AC3**: Homepage CTAs use real destinations
  - Given the homepage
  - When a visitor uses the nav or hero CTAs
  - Then the primary CTA links to `/signup` and the secondary to `/login` (no anonymous compose/record page)

- [x] **AC4**: "How it works" steps present
  - Given the homepage
  - When scrolled to the steps strip (anchor `#how`)
  - Then three glass step cards (Record, Address it, Send with love) render as in the reference

- [x] **AC5**: Intro splash plays once per session
  - Given a visitor's first homepage load in a session
  - When the page loads
  - Then the animated "Sona." splash overlays the screen, auto-dismisses (~2.3s) or on tap, and does not replay on subsequent homepage loads in the same session; reduced-motion shortens it

- [x] **AC6**: Theme toggle works site-wide
  - Given the existing `ThemeToggle`
  - When toggled on the homepage or any page
  - Then light/dark switches using the ported tokens and persists (existing `localStorage["theme"]`)

- [x] **AC7**: Quality gates pass
  - Given the change
  - When `tsc --noEmit`, ESLint, unit tests, E2E, and build run
  - Then all pass (splash E2E updated to the new markup)

## Edge Cases

- `prefers-reduced-motion`: animations shortened/neutralized; splash dismisses quickly.
- Reference uses `data-theme`; app keeps class-based theming — only token *values* are ported, so `ThemeToggle` and all pages keep working.
- Browsers without `backdrop-filter`: existing `@supports` fallback keeps cards opaque.
- Homepage remains logged-out-only (authenticated users are redirected to `/voicenotes` by middleware per spec `18`).

## Changelog

### [2026-07-01] - Verified
- **Author**: Cursor AI
- **Status**: Verified
- **Notes**: Implemented on `feature/reference-visual-system`. Ported reference tokens into `globals.css` (light/dark/manual scopes), rewrote `src/app/page.tsx` as the reference hero (orbs, nav with inline theme toggle, eyebrow, serif headline, sub, CTAs → signup/login, trust, animated glass mock, 3-step strip, footer), added `src/components/IntroSplash.tsx` (once-per-session, tap/auto-dismiss, reduced-motion aware), made `ThemeToggle` accept a `className` for the inline nav variant, and updated `e2e/splash.spec.ts`. All 7 ACs satisfied. Quality gates: `tsc --noEmit` ✓, ESLint ✓ (only pre-existing font warning), 90 unit tests ✓, 4 E2E ✓, clean `next build` ✓.
- **Deviations**: Kept the app's existing class-based theme system (`.dark`/`.light`, `localStorage["theme"]`) instead of the reference's `data-theme`/`sonus-theme`, porting only the reference token *values* — this preserves theming across all existing pages. The homepage footer keeps the Gerald Tui author link from spec `23` (styled as `home-foot-link`) rather than the reference's plain "an early preview of Sona." footer.

### [2026-07-01] - Approved
- **Author**: Cursor AI
- **Status**: Approved
- **Notes**: Decisions (scope = global tokens + homepage rebuild; CTAs → Sign up/Log in; intro splash once-per-session) resolved with the user before drafting. Theme-system reconciliation documented (keep class-based theming, port reference token values). 7 testable ACs. Ready for implementation.

### [2026-07-01] - Draft
- **Author**: Cursor AI
- **Status**: Draft
- **Notes**: Initial spec to match the provided `Sona (standalone).html` reference across the site's visual tokens and reproduce its intro splash + hero homepage.
