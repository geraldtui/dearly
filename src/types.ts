export interface Recording {
  /** Object URL for playback; null when the take was simulated (no mic). */
  url: string | null;
  /** The recorded audio data, ready to attach to an email. Null when simulated. */
  blob: Blob | null;
  /** MIME type of the recorded blob (e.g. "audio/webm"). */
  mimeType: string | null;
  duration: number;
  /** Downsampled waveform bars (0..1) for the static waveform display. */
  bars: number[];
  /** True when the mic was unavailable and the take is a demo waveform. */
  simulated: boolean;
}
