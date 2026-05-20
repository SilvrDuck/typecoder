import { test, expect } from "@playwright/test";

/**
 * Live GitHub smoke test. Skipped in CI to avoid rate-limit flake.
 *
 * Run locally with: `pnpm playwright tests-e2e/live-github-smoke.spec.ts`.
 * The dev server must be reachable (Playwright config starts it).
 *
 * Verifies the FastAPI curated session resolves against the real
 * `raw.githubusercontent.com` HEAD and lands the user on the typing
 * surface with non-empty content.
 */
test.skip(!!process.env.CI, "skip live-network smoke in CI");

test("FastAPI curated session resolves against real GitHub", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await page.getByTestId("landing-type-right-away").click();
  await page.getByTestId("curated-start-fastapi").click();

  await expect(page.getByText(/Fetching files from GitHub/i)).toBeVisible({
    timeout: 5000,
  });
  await expect(page.getByTestId("focus-start")).toBeVisible({ timeout: 30_000 });
  await page.getByTestId("focus-start").click();

  await expect(page.getByTestId("typing-surface")).toBeVisible();
  // The typing surface contains target characters from FastAPI source.
  // We assert non-empty by checking at least one pending span exists.
  await expect(
    page.getByTestId("typing-surface").locator('[data-status="pending"]').first(),
  ).toBeVisible({ timeout: 5000 });
});
