import { test, expect } from "@playwright/test";

async function startDemoSession(
  page: import("@playwright/test").Page,
  items: Array<Record<string, unknown>>,
) {
  await page.goto("/");
  await page.getByTestId("landing-custom").click();
  await page.getByTestId("custom-paste").click();
  await page.getByTestId("paste-textarea").fill(
    JSON.stringify({
      version: 1,
      repo: "demo/tiny-codebase",
      title: "Test",
      items,
    }),
  );
  await page.getByTestId("paste-start").click();
  await expect(page.getByTestId("typing-surface")).toBeVisible({ timeout: 10000 });
}

test("Shift+Tab returns to the previous item", async ({ page }) => {
  await startDemoSession(page, [
    {
      level: "file",
      path: "src/scheduler.ts",
      label: "first",
      startLine: 1,
      endLine: 2,
    },
    {
      level: "file",
      path: "src/parser.py",
      label: "second",
      startLine: 1,
      endLine: 2,
    },
  ]);

  // Drive through item 1 with the engine-aware loop
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
      ) as HTMLTextAreaElement;
      ta.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }),
      );
    };
    let safety = target.length * 2 + 50;
    while (safety-- > 0) {
      const cur = w.__codetype!.state().session.typingState.cursor;
      if (cur >= target.length) break;
      const ch = target[cur];
      fire(ch === "\n" ? "Enter" : ch === "\t" ? "Tab" : ch);
      await new Promise((r) => setTimeout(r, 0));
    }
  });

  await expect(page.getByTestId("completion-card")).toBeVisible({ timeout: 5000 });
  await page.getByTestId("completion-next").click();

  // Now on item 2 — typing surface directly
  await expect(page.getByTestId("typing-surface")).toBeVisible();

  // Shift+Tab should bring us back to item 1
  await page.keyboard.press("Shift+Tab");
  // Cursor in store is back to 0
  const cursor = await page.evaluate(() => {
    type W = Window & {
      __codetype?: { state: () => { session: { cursor: number } } };
    };
    return (window as W).__codetype!.state().session.cursor;
  });
  expect(cursor).toBe(0);
});

test("Esc on loading screen returns to landing", async ({ page }) => {
  // Make GitHub hang so the loading screen sticks
  await page.route("**/raw.githubusercontent.com/**", async () => {
    // never fulfill — request will hang
    await new Promise(() => {});
  });
  await page.goto("/");
  await page.getByTestId("landing-type-right-away").click();
  await page.getByTestId("curated-start-fastapi").click();
  await expect(page.getByText(/Fetching files from GitHub/i)).toBeVisible({
    timeout: 5000,
  });
  await page.keyboard.press("Escape");
  await expect(page.getByText(/Type real code/i)).toBeVisible({ timeout: 3000 });
});

test("Skip uses in-app confirmation, not native confirm()", async ({ page }) => {
  await startDemoSession(page, [
    {
      level: "file",
      path: "src/scheduler.ts",
      label: "first",
      startLine: 1,
      endLine: 2,
    },
    {
      level: "file",
      path: "src/parser.py",
      label: "second",
      startLine: 1,
      endLine: 2,
    },
  ]);

  // Attach dialog listener BEFORE the click to assert no native confirm.
  let nativeDialogOpened = false;
  page.on("dialog", async (d) => {
    nativeDialogOpened = true;
    await d.dismiss();
  });

  await page.getByTestId("typing-skip").click();
  await expect(page.getByTestId("skip-confirm")).toBeVisible();
  expect(nativeDialogOpened).toBe(false);

  // Cancel
  await page.getByTestId("skip-confirm-no").click();
  await expect(page.getByTestId("skip-confirm")).toHaveCount(0);

  // Open again, then confirm
  await page.getByTestId("typing-skip").click();
  await page.getByTestId("skip-confirm-yes").click();
  // Advanced to item 2 — typing surface remains
  await expect(page.getByTestId("typing-surface")).toBeVisible({ timeout: 3000 });
});
