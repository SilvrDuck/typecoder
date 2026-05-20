import { test, expect } from "@playwright/test";

/**
 * End-to-end: complete a 1-item demo-repo session (no network) by
 * typing through each character of the resolved snippet, taking the
 * engine's smart-Enter/Tab into account.
 */
test("session summary renders after completing items", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("landing-custom").click();
  await page.getByTestId("custom-paste").click();

  // Demo-repo file with no nested indentation so character replay is
  // simple. We pin a line range so the snippet is small and stable.
  await page.getByTestId("paste-textarea").fill(
    JSON.stringify({
      version: 1,
      repo: "demo/tiny-codebase",
      title: "Tiny demo",
      items: [
        {
          level: "file",
          path: "src/scheduler.ts",
          label: "Task type",
          startLine: 1,
          endLine: 4,
        },
      ],
    }),
  );
  await page.getByTestId("paste-start").click();

  await expect(page.getByTestId("focus-start")).toBeVisible({ timeout: 10000 });
  await page.getByTestId("focus-start").click();

  await page.getByTestId("typing-surface").locator("textarea").focus();

  // Drive the engine by reading the live target + cursor after each
  // keystroke. Stop when the cursor reaches the end. This works around
  // smart-Enter auto-indent that would otherwise misalign a naive replay.
  await page.evaluate(async () => {
    type W = Window & {
      __codetype?: {
        state: () => {
          session: { typingState: { target: string; cursor: number } };
        };
      };
    };
    const w = window as W;
    const target = w.__codetype!.state().session.typingState.target;
    const fire = (key: string) => {
      const ta = document.querySelector(
        '[data-testid="typing-surface"] textarea',
      ) as HTMLTextAreaElement | null;
      if (!ta) throw new Error("textarea not found");
      const evt = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
      });
      ta.dispatchEvent(evt);
    };
    let safety = target.length * 2 + 50;
    while (safety-- > 0) {
      const cursor = w.__codetype!.state().session.typingState.cursor;
      if (cursor >= target.length) break;
      const ch = target[cursor];
      if (ch === "\n") fire("Enter");
      else if (ch === "\t") fire("Tab");
      else fire(ch);
      // yield to React state update
      await new Promise((r) => setTimeout(r, 0));
    }
  });

  await expect(page.getByTestId("completion-card")).toBeVisible({
    timeout: 5000,
  });
  await page.getByTestId("completion-next").click();

  await expect(page.getByTestId("summary-card")).toBeVisible({ timeout: 5000 });
  await expect(page.locator("text=code wpm")).toBeVisible();
  await expect(page.locator("text=accuracy")).toBeVisible();
});

test("rate-limit error has a helpful message + Pick curated CTA", async ({ page }) => {
  // Return 429 Too Many Requests — maps cleanly to rate_limit without
  // depending on CORS-exposed x-ratelimit headers in cross-origin mocks.
  await page.route("**/raw.githubusercontent.com/**", async (route) => {
    await route.fulfill({ status: 429, body: "rate limited" });
  });

  await page.goto("/");
  await page.getByTestId("landing-type-right-away").click();
  await page.getByTestId("curated-start-fastapi").click();

  await expect(page.getByTestId("error-screen")).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByTestId("error-title")).toContainText(
    /rate limit/i,
  );
  await expect(page.getByTestId("error-detail")).toContainText(
    /your browser talking to GitHub directly/i,
  );
});

test("not-found error explains which path is missing", async ({ page }) => {
  await page.route("**/raw.githubusercontent.com/**", async (route) => {
    await route.fulfill({ status: 404, body: "not found" });
  });
  await page.goto("/");
  await page.getByTestId("landing-type-right-away").click();
  await page.getByTestId("curated-start-fastapi").click();
  await expect(page.getByTestId("error-screen")).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByTestId("error-detail")).toContainText(
    /Could not find .+ in this repository/i,
  );
});
