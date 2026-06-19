import { defineConfig, devices } from "@playwright/test";
import { resolve } from "node:path";

const fakeAudio = resolve(process.cwd(), "e2e/fixtures/fake-audio.wav");
const PORT = 3100;

/**
 * E2E config for the browser-only send chain. Chromium runs with a fake
 * microphone fed by a generated WAV so MediaRecorder + MP3 transcoding run for
 * real. `/api/send` is intercepted in the tests, so no Resend/Supabase needed.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    permissions: ["microphone"],
    launchOptions: {
      args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
        `--use-file-for-fake-audio-capture=${fakeAudio}%noloop`,
        "--autoplay-policy=no-user-gesture-required",
      ],
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NEXT_PUBLIC_E2E: "true",
      // Dummy values so the browser Supabase client constructs without throwing;
      // the send route is mocked, so these are never used for real calls.
      NEXT_PUBLIC_SUPABASE_URL: "https://e2e.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "e2e-anon-key",
    },
  },
});
