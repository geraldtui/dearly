"use client";

/*
 * Dearly — Voice Recorder.
 * Real MediaRecorder + Web Audio live waveform, with a graceful simulated
 * fallback when the mic is unavailable/denied so the flow stays demoable.
 * Ported from the handoff bundle (recorder.jsx).
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { RecIcon } from "./icons";
import type { Recording } from "@/types";

const MAX_SECONDS = 300;
const N_BARS = 64;

function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

function fmt(t: number): string {
  const s = Math.max(0, Math.floor(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function downsample(arr: number[], n: number): number[] {
  if (!arr.length) return new Array(n).fill(0.06);
  const out: number[] = [];
  const size = arr.length / n;
  for (let i = 0; i < n; i++) {
    const s = Math.floor(i * size);
    const e = Math.floor((i + 1) * size);
    let m = 0;
    for (let j = s; j < e; j++) m = Math.max(m, arr[j] || 0);
    out.push(Math.max(0.06, m));
  }
  return out;
}

type Phase = "idle" | "recording" | "recorded";

export default function VoiceRecorder({
  recording,
  onRecordingChange,
}: {
  recording: Recording | null;
  onRecordingChange: (r: Recording | null) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [simulated, setSimulated] = useState(false);
  const [isPlaying, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  const streamRef = useRef<MediaStream | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const levelsRef = useRef<number[]>([]);
  const liveRef = useRef<number[]>([]);
  const startRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const liveCanvas = useRef<HTMLCanvasElement | null>(null);
  const recCanvas = useRef<HTMLCanvasElement | null>(null);
  const playRafRef = useRef<number>(0);

  const fitCanvas = (cv: HTMLCanvasElement) => {
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth;
    const h = cv.clientHeight;
    if (cv.width !== w * dpr || cv.height !== h * dpr) {
      cv.width = w * dpr;
      cv.height = h * dpr;
    }
    const ctx = cv.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h };
  };

  const drawLive = useCallback(() => {
    const cv = liveCanvas.current;
    if (!cv) return;
    const { ctx, w, h } = fitCanvas(cv);
    ctx.clearRect(0, 0, w, h);
    const arr = liveRef.current;
    const accent = cssVar("--accent", "#D4A396");
    const deep = cssVar("--accent-deep", "#A36A5E");
    const gap = 3;
    const bw = Math.max(2, w / 72 - gap);
    for (let i = 0; i < 72; i++) {
      const v = arr[arr.length - 72 + i] || 0;
      const bh = Math.max(3, v * h * 0.92);
      const x = i * (bw + gap);
      const y = (h - bh) / 2;
      ctx.fillStyle = i > 72 - 10 ? deep : accent;
      ctx.globalAlpha = 0.45 + 0.55 * (i / 72);
      roundRect(ctx, x, y, bw, bh, bw / 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }, []);

  const drawRecorded = useCallback(
    (prog: number) => {
      const cv = recCanvas.current;
      if (!cv) return;
      const { ctx, w, h } = fitCanvas(cv);
      ctx.clearRect(0, 0, w, h);
      const bars = recording?.bars || [];
      const deep = cssVar("--accent-deep", "#A36A5E");
      const line = "#e0cabe";
      const gap = 3;
      const bw = Math.max(2, w / bars.length - gap);
      bars.forEach((v, i) => {
        const bh = Math.max(3, v * h * 0.9);
        const x = i * (bw + gap);
        const y = (h - bh) / 2;
        const played = i / bars.length <= prog;
        ctx.fillStyle = played ? deep : line;
        roundRect(ctx, x, y, bw, bh, bw / 2);
        ctx.fill();
      });
    },
    [recording]
  );

  useEffect(() => {
    if (phase === "recorded") drawRecorded(progress);
  }, [phase, progress, recording, drawRecorded]);

  const teardownStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (ctxRef.current) {
      try {
        ctxRef.current.close();
      } catch {
        /* noop */
      }
      ctxRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  const commit = useCallback(
    (url: string | null, blob: Blob | null, mimeType: string | null, dur: number, sim: boolean) => {
      const bars = downsample(levelsRef.current, N_BARS);
      setPhase("recorded");
      setSimulated(sim);
      onRecordingChange({
        url,
        blob,
        mimeType,
        duration: Math.min(dur, MAX_SECONDS),
        bars,
        simulated: sim,
      });
    },
    [onRecordingChange]
  );

  const finalizeReal = useCallback(() => {
    const dur = (performance.now() - startRef.current) / 1000;
    const type = chunksRef.current[0]?.type || "audio/webm";
    const blob = new Blob(chunksRef.current, { type });
    const url = URL.createObjectURL(blob);
    teardownStream();
    commit(url, blob, type, dur, false);
  }, [commit, teardownStream]);

  const finalizeSim = useCallback(() => {
    commit(null, null, null, (performance.now() - startRef.current) / 1000, true);
  }, [commit]);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
    if (mediaRef.current && mediaRef.current.state !== "inactive") {
      mediaRef.current.stop(); // → finalizeReal
    } else {
      finalizeSim();
    }
  }, [finalizeSim]);

  const tick = useCallback(() => {
    if (analyserRef.current) {
      const a = analyserRef.current;
      const buf = new Uint8Array(a.fftSize);
      a.getByteTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) {
        const x = (buf[i] - 128) / 128;
        sum += x * x;
      }
      const rms = Math.min(1, Math.sqrt(sum / buf.length) * 2.4);
      levelsRef.current.push(rms);
      liveRef.current.push(rms);
    }
    const el = (performance.now() - startRef.current) / 1000;
    setElapsed(el);
    drawLive();
    if (el >= MAX_SECONDS) {
      stop();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [drawLive, stop]);

  const simStart = useCallback(() => {
    setSimulated(true);
    startRef.current = performance.now();
    levelsRef.current = [];
    liveRef.current = [];
    let t = 0;
    simTimerRef.current = setInterval(() => {
      t += 0.05;
      const env = 0.45 + 0.35 * Math.sin(t * 1.3) + 0.18 * Math.sin(t * 4.7);
      const v = Math.min(1, Math.max(0.04, env * (0.6 + Math.random() * 0.6)));
      levelsRef.current.push(v);
      liveRef.current.push(v);
      const el = (performance.now() - startRef.current) / 1000;
      setElapsed(el);
      drawLive();
      if (el >= MAX_SECONDS) stop();
    }, 50);
  }, [drawLive, stop]);

  const start = async () => {
    levelsRef.current = [];
    liveRef.current = [];
    chunksRef.current = [];
    setProgress(0);
    setElapsed(0);
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setPhase("recording");
      simStart();
      return;
    }
    streamRef.current = stream;
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      ctxRef.current = ctx;
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      src.connect(an);
      analyserRef.current = an;
    } catch {
      /* analyser optional */
    }
    const mr = new MediaRecorder(stream);
    mediaRef.current = mr;
    mr.ondataavailable = (e) => {
      if (e.data.size) chunksRef.current.push(e.data);
    };
    mr.onstop = finalizeReal;
    mr.start();
    setSimulated(false);
    setPhase("recording");
    startRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
  };

  const resetAll = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    cancelAnimationFrame(playRafRef.current);
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
    teardownStream();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPhase("idle");
    setPlaying(false);
    setProgress(0);
    setElapsed(0);
  }, [teardownStream]);

  /* sync external clear (redo / send-another) */
  useEffect(() => {
    if (!recording && phase === "recorded") resetAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  const redo = () => {
    if (recording?.url) URL.revokeObjectURL(recording.url);
    onRecordingChange(null);
    resetAll();
  };

  const pause = useCallback(() => {
    setPlaying(false);
    if (audioRef.current) audioRef.current.pause();
    cancelAnimationFrame(playRafRef.current);
  }, []);

  const playSim = useCallback(() => {
    if (!recording) return;
    setPlaying(true);
    const begin = performance.now() - progress * recording.duration * 1000;
    const step = () => {
      const p = (performance.now() - begin) / 1000 / recording.duration;
      if (p >= 1) {
        setProgress(0);
        setPlaying(false);
        return;
      }
      setProgress(p);
      playRafRef.current = requestAnimationFrame(step);
    };
    playRafRef.current = requestAnimationFrame(step);
  }, [progress, recording]);

  const togglePlay = () => {
    if (!recording) return;
    if (isPlaying) {
      pause();
      return;
    }
    if (recording.simulated || !recording.url) {
      playSim();
      return;
    }
    if (!audioRef.current) {
      const a = new Audio(recording.url);
      audioRef.current = a;
      a.ontimeupdate = () => setProgress(Math.min(1, a.currentTime / recording.duration));
      a.onended = () => {
        setPlaying(false);
        setProgress(0);
      };
    }
    audioRef.current
      .play()
      .then(() => setPlaying(true))
      .catch(() => playSim());
  };

  const seek = (e: React.MouseEvent) => {
    if (phase !== "recorded" || !recording) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setProgress(p);
    if (audioRef.current && !recording.simulated) {
      audioRef.current.currentTime = p * recording.duration;
    }
  };

  useEffect(() => () => resetAll(), [resetAll]);

  const liveClass = phase === "recording" ? "recorder live" : "recorder";
  return (
    <div className={liveClass}>
      <div className="section-label" style={{ marginTop: 0 }}>
        Your voice note
      </div>

      {phase === "idle" && (
        <div className="rec-idle">
          <button className="rec-btn" onClick={start} aria-label="Start recording">
            {RecIcon.mic()}
          </button>
          <div className="rec-hint">Tap to record — up to 5:00</div>
        </div>
      )}

      {phase === "recording" && (
        <div className="rec-live">
          <div className="rec-top">
            <div className="rec-status">
              <span className="pulse-dot" />
              {simulated ? "Recording (demo)" : "Recording"}
            </div>
            <div className="timer">
              {fmt(elapsed)} <span className="max">/ 5:00</span>
            </div>
          </div>
          <div className="wave-wrap">
            <canvas className="wave" ref={liveCanvas} />
          </div>
          <div className="meter">
            <i style={{ width: `${(elapsed / MAX_SECONDS) * 100}%` }} />
          </div>
          <div className="rec-controls">
            <button className="icon-btn stop" onClick={stop} aria-label="Stop recording">
              {RecIcon.stop()}
            </button>
          </div>
        </div>
      )}

      {phase === "recorded" && recording && (
        <div className="rec-live">
          <div className="recorded-row">
            <button className="icon-btn play" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
              {isPlaying ? RecIcon.pause() : RecIcon.play()}
            </button>
            <div className="wave-wrap seekable" onClick={seek}>
              <canvas className="wave" ref={recCanvas} />
            </div>
            <div className="dur">{fmt(progress * recording.duration)}</div>
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button className="btn btn-ghost" onClick={redo}>
              {RecIcon.redo(cssVar("--accent-deep", "#A36A5E"))} Redo recording
            </button>
          </div>
          {simulated && <div className="sim-note">Demo waveform — enable your mic for a real recording</div>}
        </div>
      )}
    </div>
  );
}
