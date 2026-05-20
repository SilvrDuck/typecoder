import { test, expect } from "@playwright/test";

test("landing page renders with CodeType mark and tagline", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("CodeType")).toBeVisible();
  await expect(page.getByText(/Type real code/i)).toBeVisible();
});

test("no console errors on landing", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(errors, errors.join("\n")).toEqual([]);
});
