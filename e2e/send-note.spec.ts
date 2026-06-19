import { test, expect, type Route } from "@playwright/test";
import { extractFilePart, looksLikeMp3 } from "./support/multipart";

// Builds a tiny mono 16-bit PCM WAV ArrayBuffer in the browser so we can feed
// the production transcoder a known-good input without a microphone.
const WAV_BUILDER = `
(function makeWav() {
  const sampleRate = 44100, seconds = 1, freq = 440;
  const n = sampleRate * seconds;
  const buf = new ArrayBuffer(44 + n * 2);
  const dv = new DataView(buf);
  const ws = (o, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(o + i, s.charCodeAt(i)); };
  ws(0, "RIFF"); dv.setUint32(4, 36 + n * 2, true); ws(8, "WAVE");
  ws(12, "fmt "); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, sampleRate, true); dv.setUint32(28, sampleRate * 2, true);
  dv.setUint16(32, 2, true); dv.setUint16(34, 16, true);
  ws(36, "data"); dv.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) dv.setInt16(44 + i * 2, Math.sin((2 * Math.PI * freq * i) / sampleRate) * 0.6 * 0x7fff, true);
  return new Blob([buf], { type: "audio/wav" });
})()
`;

test.describe("Dearly send flow (real browser)", () => {
  test("AC1: encodeBlobToMp3 produces a valid MP3 in the browser", async ({ page }) => {
    await page.goto("/");

    // The transcode hook is attached on module load when NEXT_PUBLIC_E2E=true.
    await expect
      .poll(() => page.evaluate(() => typeof (window as any).__encodeBlobToMp3 === "function"), {
        timeout: 15_000,
      })
      .toBe(true);

    const result = await page.evaluate(async (wavExpr) => {
      // eslint-disable-next-line no-eval
      const wav: Blob = eval(wavExpr);
      const mp3: Blob = await (window as any).__encodeBlobToMp3(wav);
      const head = new Uint8Array(await mp3.slice(0, 4).arrayBuffer());
      return { type: mp3.type, size: mp3.size, head: Array.from(head) };
    }, WAV_BUILDER);

    expect(result.type).toBe("audio/mpeg");
    expect(result.size).toBeGreaterThan(100);
    const [b0, b1] = result.head;
    const isMp3 = (b0 === 0xff && (b1 & 0xe0) === 0xe0) || result.head.slice(0, 3).join() === "73,68,51"; // "ID3"
    expect(isMp3, `unexpected MP3 header: ${result.head}`).toBe(true);
  });

  test("AC2: records and sends a note end-to-end", async ({ page }) => {
    let captured: Buffer | null = null;
    await page.route("**/api/send", async (route: Route) => {
      captured = route.request().postDataBuffer();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true, delivery: "email", id: "e2e-test" }),
      });
    });

    await page.goto("/");

    await page.getByLabel("Your email").fill("eleanor@example.com");
    await page.getByLabel("Their email").fill("mom@example.com");

    await page.getByRole("button", { name: "Start recording" }).click();
    const stop = page.getByRole("button", { name: "Stop recording" });
    await expect(stop).toBeVisible();
    await page.waitForTimeout(1800);
    await stop.click();

    // Recorded phase: the play control appears once a take exists.
    await expect(page.getByRole("button", { name: "Play" })).toBeVisible();

    await page.getByRole("button", { name: /send with love/i }).click();

    await expect(page.getByRole("heading", { name: "On its way." })).toBeVisible();

    expect(captured, "no /api/send body captured").not.toBeNull();
    const audio = extractFilePart(captured!, "audio");
    expect(audio, "no audio part in the upload").not.toBeNull();
    // The transcode may fall back to webm/ogg in some environments; either way
    // a non-trivial audio payload must have been produced and sent. The strict
    // MP3 guarantee is covered deterministically by AC1.
    expect(audio!.bytes.length).toBeGreaterThan(1000);
    if (audio!.filename.endsWith(".mp3")) {
      expect(audio!.contentType).toContain("audio/mpeg");
      expect(looksLikeMp3(audio!.bytes)).toBe(true);
    }
  });

  test("AC3: validation blocks an empty send", async ({ page }) => {
    let sendCalled = false;
    await page.route("**/api/send", async (route: Route) => {
      sendCalled = true;
      await route.fulfill({ status: 200, body: "{}" });
    });

    await page.goto("/");
    await page.getByRole("button", { name: /send with love/i }).click();

    await expect(page.getByText("Your email is needed")).toBeVisible();
    await expect(page.getByText("Record a short message before sending.")).toBeVisible();
    await expect(page.getByText("On its way.")).toHaveCount(0);
    expect(sendCalled).toBe(false);
  });
});
