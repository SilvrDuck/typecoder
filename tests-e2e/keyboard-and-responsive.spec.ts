import { test, expect } from "@playwright/test";

test("typing screen: Esc returns to landing", async ({ page }) => {
  await page.route("**/raw.githubusercontent.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/plain",
      body: "class FastAPI:\n    pass\n",
    });
  });
  await page.goto("/");
  await page.getByTestId("landing-type-right-away").click();
  await page.getByTestId("curated-start-fastapi").click();
  await expect(page.getByTestId("typing-surface")).toBeVisible({ timeout: 10000 });

  await page.keyboard.press("Escape");
  await expect(page.getByText(/Type real code/i)).toBeVisible({
    timeout: 3000,
  });
});

test("typing screen: ⌘+Enter (or Ctrl+Enter) restarts the current item", async ({ page }) => {
  await page.route("**/raw.githubusercontent.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/plain",
      body: "class FastAPI:\n    pass\n",
    });
  });
  await page.goto("/");
  await page.getByTestId("landing-type-right-away").click();
  await page.getByTestId("curated-start-fastapi").click();
  await expect(page.getByTestId("typing-surface")).toBeVisible({ timeout: 10000 });
  const surface = page.getByTestId("typing-surface");
  await surface.locator("textarea").focus();
  await page.keyboard.press("c");
  await page.keyboard.press("l");
  await expect(
    surface.locator('[data-index="0"]'),
  ).toHaveAttribute("data-status", "correct");

  // Restart
  const mod = process.platform === "darwin" ? "Meta" : "Control";
  await page.keyboard.press(`${mod}+Enter`);
  await expect(
    surface.locator('[data-index="0"]'),
  ).toHaveAttribute("data-status", "pending");
});

test("reduced-motion: app renders + interactive elements work", async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByTestId("landing-type-right-away")).toBeVisible();
  await page.getByTestId("landing-type-right-away").click();
  await expect(
    page.getByRole("heading", { name: /Pick a codebase/i }),
  ).toBeVisible();
  await context.close();
});

test("mobile layout: landing still shows both paths", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const page = await context.newPage();
  await page.goto("/");
  await expect(page.getByTestId("landing-type-right-away")).toBeVisible();
  await expect(page.getByTestId("landing-custom")).toBeVisible();
  await page.getByTestId("landing-type-right-away").click();
  // Cards should still render even if stacked
  await expect(
    page.getByRole("heading", { name: "Linux kernel" }),
  ).toBeVisible();
  await context.close();
});

test("tablet layout: custom hub renders consolidated flows", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 820, height: 1180 },
  });
  const page = await context.newPage();
  await page.goto("/");
  await page.getByTestId("landing-custom").click();
  await expect(page.getByTestId("lar-input")).toBeVisible();
  await expect(page.getByTestId("paste-textarea")).toBeVisible();
  await expect(page.getByTestId("pb-preview")).toBeVisible();
  await context.close();
});

test("typing surface: wrong character renders as error, backspace clears", async ({ page }) => {
  // Use the demo repo through the inline paste-config on the consolidated hub.
  await page.goto("/");
  await page.getByTestId("landing-custom").click();
  await page.getByTestId("paste-textarea").fill(
    JSON.stringify({
      version: 1,
      repo: "demo/tiny-codebase",
      title: "Test",
      items: [
        {
          level: "file",
          path: "src/scheduler.ts",
          label: "x",
          startLine: 1,
          endLine: 2,
        },
      ],
    }),
  );
  await page.getByTestId("paste-start").click();
  await expect(page.getByTestId("typing-surface")).toBeVisible({ timeout: 10000 });
  const surface = page.getByTestId("typing-surface");
  await surface.locator("textarea").focus();

  await page.keyboard.press("X"); // wrong
  await expect(
    surface.locator('[data-index="0"]'),
  ).toHaveAttribute("data-status", "wrong");

  await page.keyboard.press("Backspace");
  await expect(
    surface.locator('[data-index="0"]'),
  ).toHaveAttribute("data-status", "pending");
});
