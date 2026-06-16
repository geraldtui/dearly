/*
 * Client-side audio transcoding. The browser's MediaRecorder produces WebM/Ogg
 * (Opus), but mail clients only render an inline play button for MP3 attachments
 * — so we decode the recorded blob to PCM and re-encode it to MP3 in the browser
 * before sending. No server or native binary required.
 */

const MP3_KBPS = 128;
const BLOCK_SIZE = 1152; // multiple of 576 — the MP3 frame size lame expects

/** Decode any browser-recorded audio Blob and re-encode it as a mono MP3 Blob. */
export async function encodeBlobToMp3(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();

  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AudioCtx();
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    try {
      await ctx.close();
    } catch {
      /* noop */
    }
  }

  const sampleRate = audioBuffer.sampleRate;
  const samples = toInt16Mono(audioBuffer);

  const lame = await import("@breezystack/lamejs");
  const encoder = new lame.Mp3Encoder(1, sampleRate, MP3_KBPS);
  const chunks: Uint8Array[] = [];

  for (let i = 0; i < samples.length; i += BLOCK_SIZE) {
    const chunk = samples.subarray(i, i + BLOCK_SIZE);
    const buf = encoder.encodeBuffer(chunk);
    if (buf.length > 0) chunks.push(buf);
  }
  const end = encoder.flush();
  if (end.length > 0) chunks.push(end);

  // Copy into a fresh ArrayBuffer-backed Uint8Array so Blob gets a clean BlobPart.
  return new Blob(
    chunks.map((c) => new Uint8Array(c)),
    { type: "audio/mpeg" }
  );
}

// Test-only: expose the transcoder so the Playwright E2E suite can verify it
// in a real browser without a microphone. Gated by NEXT_PUBLIC_E2E so it is
// dead code in production builds.
if (typeof window !== "undefined" && process.env.NEXT_PUBLIC_E2E === "true") {
  (window as unknown as { __encodeBlobToMp3?: typeof encodeBlobToMp3 }).__encodeBlobToMp3 =
    encodeBlobToMp3;
}

/** Downmix all channels to mono and convert Float32 [-1,1] PCM to 16-bit. */
function toInt16Mono(audioBuffer: AudioBuffer): Int16Array {
  const channels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const out = new Int16Array(length);

  const channelData: Float32Array[] = [];
  for (let c = 0; c < channels; c++) channelData.push(audioBuffer.getChannelData(c));

  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) sum += channelData[c][i];
    const mono = sum / channels;
    const clamped = Math.max(-1, Math.min(1, mono));
    out[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
  }
  return out;
}
