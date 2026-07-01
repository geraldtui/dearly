import { test, expect } from "@playwright/test";

test.describe("Marketing splash homepage", () => {
  test("AC1: shows brand, headline, and features — no send form", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /Sona/ })).toBeVisible();
    await expect(page.getByText("Voice logs for the ones you love.")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Record in your browser" })).toBeVisible();

    await expect(page.getByLabel("Your email")).toHaveCount(0);
    await expect(page.getByLabel("Their email")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /send with love/i })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /start recording/i })).toHaveCount(0);
  });

  test("AC2: exposes Sign up and Log in entry points", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("link", { name: "Sign up", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Log in", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up free" })).toHaveAttribute("href", "/signup");
  });

  test("AC3: public send endpoint no longer exists", async ({ request }) => {
    const res = await request.post("/api/send", {
      multipart: { senderName: "x", recipientName: "y" },
    });
    expect(res.status()).toBe(404);
  });
});
