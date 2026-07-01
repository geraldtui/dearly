import { test, expect } from "@playwright/test";

/**
 * The homepage shows a one-time-per-session intro splash overlay. Dismiss it
 * (tap anywhere) before asserting on the hero content underneath.
 */
async function enterHome(page: import("@playwright/test").Page) {
  await page.goto("/");
  const splash = page.locator(".splash");
  if (await splash.count()) {
    await splash.click({ position: { x: 5, y: 5 } });
    await expect(splash).toHaveCount(0, { timeout: 5000 });
  }
}

test.describe("Reference-styled splash homepage", () => {
  test("AC2: shows the hero brand, headline, and mock — no send form", async ({ page }) => {
    await enterHome(page);

    await expect(page.getByRole("link", { name: /^Sona/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: /Some things are better/ })).toBeVisible();
    await expect(page.getByText("An early preview", { exact: true })).toBeVisible();

    await expect(page.getByLabel("Your email")).toHaveCount(0);
    await expect(page.getByLabel("Their email")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /send with love/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /start recording/i })).toHaveCount(0);
  });

  test("AC3: hero and nav CTAs point to signup/login", async ({ page }) => {
    await enterHome(page);

    await expect(page.getByRole("link", { name: "Login", exact: true })).toHaveAttribute(
      "href",
      "/login"
    );
    await expect(page.getByRole("link", { name: "Sign up free" }).first()).toHaveAttribute(
      "href",
      "/signup"
    );
  });

  test("AC4: how-it-works steps are present", async ({ page }) => {
    await enterHome(page);

    await expect(page.getByRole("heading", { name: "Record", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Address it" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Send with love" })).toBeVisible();
  });

  test("AC3b: public send endpoint no longer exists", async ({ request }) => {
    const res = await request.post("/api/send", {
      multipart: { senderName: "x", recipientName: "y" },
    });
    expect(res.status()).toBe(404);
  });
});
