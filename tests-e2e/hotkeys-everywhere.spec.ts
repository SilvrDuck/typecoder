import { test, expect } from "@playwright/test";

test("TypeRightAway: 1/2/3 hotkeys start curated sessions", async ({ page }) => {
  await page.route("**/raw.githubusercontent.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/plain",
      body: "class FastAPI:\n    pass\n",
    });
  });
  await page.goto("/");
  await page.getByTestId("landing-type-right-away").click();
  await expect(page.getByTestId("hotkey-hints")).toBeVisible();

  await page.keyboard.press("3"); // FastAPI is 3rd
  await expect(page.getByTestId("typing-surface")).toBeVisible({ timeout: 10000 });
});

test("Esc on TypeRightAway returns to landing", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("landing-type-right-away").click();
  await expect(page.getByRole("heading", { name: /Pick a codebase/i })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByText(/Type real code/i)).toBeVisible();
});

test("Esc on CustomHub returns to landing", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("landing-custom").click();
  await expect(page.getByRole("heading", { name: /Custom session/i })).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByText(/Type real code/i)).toBeVisible();
});

test("All menu screens show keyboard hint chips", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("landing-type-right-away").click();
  await expect(page.getByTestId("hotkey-hints")).toBeVisible();

  await page.getByLabel(/Go to landing/i).click();
  await page.getByTestId("landing-custom").click();
  await expect(page.getByTestId("hotkey-hints")).toBeVisible();
});
