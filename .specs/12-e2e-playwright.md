# Spec: End-to-End Browser Tests (Playwright)

- **Status**: Verified
- **Created**: 2026-06-12
- **Last Modified**: 2026-06-12
- **Feature area**: Developer tooling / Quality
- **Related**: `11-testing-foundation.md`, `01-send-voice-note.md`

## User Story

As a developer, I want a small set of real-browser end-to-end tests, so that I have confidence in the parts of the send flow the Vitest suites structurally cannot cover — the microphone capture, MP3 transcoding, and the wiring between the homepage form, recorder, and `/api/send`.

## Context

**Why**: The Vitest foundation (`11`) mocks Resend, Supabase, the recorder, and the audio pipeline, so the browser-only chain (`getUserMedia` → `MediaRecorder` → `encodeBlobToMp3` → multipart POST → success screen) is unverified. This spec adds a deliberately small Playwright layer covering that chain. It is scoped to the highest-risk, highest-value flows; broad UI coverage stays in Vitest.

**Dependencies**:
- `@playwright/test` + Chromium (installed from the public npm registry / CDN; the corporate Artifactory mirror forbids these packages, so they are installed with `--registry https://registry.npmjs.org/`).
- A tiny test-only hook exposing `encodeBlobToMp3` on `window` when `NEXT_PUBLIC_E2E=true`, so the transcoder can be tested deterministically without a microphone.

## Technical Specification

**Components/Modules**:
- `playwright.config.ts` (NEW) — `testDir: ./e2e`, Chromium project with fake-mic launch flags (`--use-fake-device-for-media-stream`, `--use-file-for-fake-audio-capture=<wav>`) and `microphone` permission; `webServer` runs `npm run dev` with `NEXT_PUBLIC_E2E=true` and dummy Supabase env.
- `e2e/support/fake-audio.ts` (NEW) — generates a short PCM WAV fixture (mono sine) used as the fake mic input; returns its absolute path.
- `e2e/support/multipart.ts` (NEW) — helper to pull a named file part (filename, content-type, bytes) out of a captured multipart body.
- `e2e/send-note.spec.ts` (NEW) — the three flows below.
- `src/lib/audio.ts` (MODIFIED) — when `NEXT_PUBLIC_E2E === "true"`, assign `encodeBlobToMp3` to `window.__encodeBlobToMp3` (no-op in production builds).
- `.github/workflows/e2e.yml` (NEW) — separate workflow on push to `develop`/`main` + `workflow_dispatch` (NOT on every PR, so E2E flakiness never blocks merges): install deps from public registry, `npx playwright install --with-deps chromium`, `npm run test:e2e`.
- `package.json` (MODIFIED) — `test:e2e` script.
- `.gitignore` (MODIFIED) — ignore `/test-results/`, `/playwright-report/`, `/blob-report/`, and the generated WAV fixture.

**State/Configuration**:
- `NEXT_PUBLIC_E2E` env flag gates the window transcode hook (and nothing else).

## Acceptance Criteria

- [x] **AC1**: MP3 transcode produces a valid file in a real browser
  - Given the app loaded with the E2E hook enabled
  - When a known WAV blob is passed to the production `encodeBlobToMp3` via `window.__encodeBlobToMp3`
  - Then the result is an `audio/mpeg` blob whose bytes begin with an MP3 frame sync (or `ID3`), proving in-browser transcoding works

- [x] **AC2**: The public send happy path works end-to-end
  - Given a visitor on the homepage with the fake microphone
  - When they fill both names and emails, record and stop, then click "Send with love"
  - Then `/api/send` receives a multipart POST carrying a non-trivial audio file part, and the "On its way." success screen is shown

- [x] **AC3**: Validation blocks an empty send
  - Given a visitor who has entered nothing
  - When they click "Send with love"
  - Then field errors and the "Record a short message before sending." message appear and no request is made to `/api/send`

- [x] **AC4**: E2E runs in CI without gating PRs
  - Given the `e2e.yml` workflow
  - When code is pushed to `develop`/`main` (or it is dispatched manually)
  - Then Playwright installs Chromium and runs the suite; the job does not run on ordinary PRs

## Edge Cases

- `/api/send` is intercepted in the browser tests, so Resend/Supabase are never contacted and no real keys are needed.
- AC2 tolerates the transcode fallback (the audio part may be `.mp3` or, if `decodeAudioData` fails, the original `.webm`/`.ogg`); the deterministic MP3 guarantee lives in AC1.
- Local runs on the corporate network require the one-time public-registry install of Playwright + browsers; CI runners are unaffected by the firewall.

## Changelog

### [2026-06-12] - Verified
- **Author**: Claude AI
- **Status**: Verified
- **Notes**: All 4 ACs satisfied. 3 Playwright tests pass against real Chromium (3 consecutive runs, no flakes; ~11s). Playwright 1.60 + Chromium installed via the public registry/CDN to bypass the Artifactory 403; lockfile entries resolve to `registry.npmjs.org`. `tsc --noEmit`, ESLint, and the Vitest suite (79 tests) remain green. Separate `e2e.yml` workflow added (push to develop/main + manual; not PR-gating).

### [2026-06-12] - Approved
- **Author**: Claude AI
- **Status**: Approved
- **Notes**: Scope agreed with user: a small Playwright layer for the browser-only send chain, installed via the public npm registry to bypass the Artifactory policy block, with a separate non-PR-gating CI workflow. Deterministic transcode test plus an integrated fake-mic happy path and a validation guard.
