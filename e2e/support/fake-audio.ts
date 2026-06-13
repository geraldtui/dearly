import { mkdirSync, existsSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * Writes (once) a small mono 16-bit PCM WAV used as Chromium's fake microphone
 * input (`--use-file-for-fake-audio-capture`). A 440 Hz sine gives MediaRecorder
 * real, decodable audio so the transcode path runs end-to-end.
 */
export function ensureFakeAudio(): string {
  const filePath = resolve(__dirname, "../fixtures/fake-audio.wav");
  if (existsSync(filePath)) return filePath;

  const sampleRate = 44100;
  const seconds = 3;
  const freq = 440;
  const numSamples = sampleRate * seconds;

  const dataBytes = numSamples * 2; // 16-bit mono
  const buffer = Buffer.alloc(44 + dataBytes);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataBytes, 4);
  buffer.write("WAVE", 8);
  // fmt chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  // data chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataBytes, 40);

  for (let i = 0; i < numSamples; i++) {
    const sample = Math.sin((2 * Math.PI * freq * i) / sampleRate) * 0.6 * 0x7fff;
    buffer.writeInt16LE(Math.round(sample), 44 + i * 2);
  }

  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, buffer);
  return filePath;
}
