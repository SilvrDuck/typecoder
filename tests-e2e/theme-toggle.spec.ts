import { test, expect } from "@playwright/test";

test("theme toggle flips data-theme on the html element", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("theme-toggle")).toBeVisible();

  const initial = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(initial === "dark" || initial === "light").toBe(true);

  await page.getByTestId("theme-toggle").click();
  const afterClick = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(afterClick).not.toBe(initial);

  // Persists across reload via localStorage.
  await page.reload();
  const afterReload = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(afterReload).toBe(afterClick);
});

test("system preference: prefers-color-scheme: light gives light theme by default", async ({
  browser,
}) => {
  const context = await browser.newContext({ colorScheme: "light" });
  const page = await context.newPage();
  await page.goto("/");
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(theme).toBe("light");
  await context.close();
});

test("system preference: prefers-color-scheme: dark gives dark theme by default", async ({
  browser,
}) => {
  const context = await browser.newContext({ colorScheme: "dark" });
  const page = await context.newPage();
  await page.goto("/");
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  expect(theme).toBe("dark");
  await context.close();
});
