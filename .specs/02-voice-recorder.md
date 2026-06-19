# Spec: Record a Voice Note in the Browser

- **Status**: Verified
- **Created**: 2026-06-10
- **Last Modified**: 2026-06-10
- **Feature area**: Recording
- **Related**: `01-send-voice-note.md`

## User Story

As a sender, I want to record a short voice note directly in the browser with visual feedback, so that I can capture and review my message before sending it.

## Context

**Why**: The voice note is the heart of the product. Recording must work in-browser with no install, give live feedback while speaking, and stay demoable even when a microphone isn't available.

**Dependencies**:
- Browser `MediaRecorder` + Web Audio API (`AudioContext`/`AnalyserNode`) for capture and live levels.
- Canvas 2D for waveform rendering.
- Produces the `Recording` object consumed by the send flow (`01-send-voice-note.md`).

## Technical Specification

**Data Models**:
- `Recording` interface in `src/types.ts` — `{ url, blob, mimeType, duration, bars, simulated }`.

**Components/Modules**:
- `src/components/VoiceRecorder.tsx` (OWNER) — phases `idle | recording | recorded`; mic capture with `MediaRecorder`; live RMS waveform via analyser; static seekable waveform + playback for the take; redo; 5-minute cap; simulated fallback when `getUserMedia` is denied/unavailable.
- `src/components/icons.tsx` — mic/stop/play/pause/redo glyphs.

**State/Configuration**:
- Constants: `MAX_SECONDS = 300`, `N_BARS = 64`.
- Reports the completed take upward via `onRecordingChange(recording | null)`.

## Acceptance Criteria

- [ ] **AC1**: Start recording with live feedback
  - Given the idle recorder
  - When the user taps the mic button and grants access
  - Then recording begins, a timer counts up against "/ 5:00", and a live waveform + progress meter animate

- [ ] **AC2**: Stop produces a reviewable take
  - Given an active recording
  - When the user stops (or the 5:00 cap is reached)
  - Then the recorder shows a static waveform with play/pause, elapsed duration, and a "Redo recording" option

- [ ] **AC3**: Playback and seeking work
  - Given a recorded take with audio
  - When the user presses play or clicks the waveform
  - Then audio plays/seeks and the waveform fills to reflect progress

- [ ] **AC4**: Graceful microphone fallback
  - Given the mic is denied or unavailable
  - When the user records
  - Then a simulated "Recording (demo)" waveform runs, the take is flagged `simulated`, and a note explains enabling the mic for a real recording

- [ ] **AC5**: Redo clears the take
  - Given a recorded take
  - When the user clicks "Redo recording"
  - Then the recording is cleared (object URL revoked) and the recorder returns to idle

## Edge Cases

- Component unmount and redo tear down the stream, audio context, timers, and animation frames to avoid leaks.
- Simulated takes have `url`/`blob` null; playback uses a timer-driven progress simulation.

## Changelog

### [2026-06-18] - Re-verified (longer recordings)
- **Author**: Claude AI
- **Status**: Verified
- **Validation Result**: COMPLIANT
- **Notes**: Raised the recording cap from 90s to 5 minutes — `MAX_SECONDS = 300` in `src/components/VoiceRecorder.tsx`, with the "up to" hint and the timer's max label now reading "5:00". The cap auto-stop, progress meter, simulated fallback, and teardown are otherwise unchanged. The 20MB upload limit and MP3 transcode bitrate comfortably accommodate the longer duration. AC1/AC2 wording updated to "5:00".

### [2026-06-10] - Verified
- **Author**: Claude AI
- **Status**: Verified
- **Validation Result**: COMPLIANT
- **Quality Score**: 9/10
- **Notes**: All 5 ACs satisfied in `src/components/VoiceRecorder.tsx` — `getUserMedia` capture with live analyser waveform/timer/meter, stop→reviewable take with play/seek, 90s cap, simulated fallback with `simulated` flag and demo note, and redo clearing the take. Teardown on unmount/redo confirmed.
- **Issues Fixed**: None
- **Note**: `VoiceRecorder` is a large component by line count, but cohesive (single responsibility) with small, well-named internal helpers — acceptable.
