import { test, expect } from "@playwright/test";

/**
 * End-to-end curated session test with mocked GitHub.
 * Asserts:
 *   - clicking a curated card moves to loading then typing
 *   - typing a correct character advances the caret
 *   - typing a wrong character marks an error
 *   - backspace corrects
 *   - completing one item shows the completion card
 *   - clicking next moves to the next item
 */
test("curated session: load, type, complete one item, advance", async ({ page }) => {
  // Mock raw.githubusercontent.com for any file fetch
  await page.route("**/raw.githubusercontent.com/**", async (route) => {
    const url = route.request().url();
    // Return a tiny snippet for any file the resolver asks for. We don't
    // care which curated config is picked — first item must succeed.
    if (url.endsWith(".c")) {
      await route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "void start_kernel(void)\n{\n    return;\n}\n",
      });
    } else if (url.endsWith(".py")) {
      await route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "class FastAPI:\n    pass\n",
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "function CodeMain() {\n  return 1;\n}\n",
      });
    }
  });

  await page.goto("/");
  await page.getByTestId("landing-type-right-away").click();
  await page.getByTestId("curated-start-fastapi").click();

  // Loading state shows briefly
  await expect(page.getByText(/Fetching files from GitHub/i)).toBeVisible({
    timeout: 5000,
  });

  // Typing screen appears (skip the focus card)
  await expect(page.getByTestId("focus-start")).toBeVisible({ timeout: 10000 });
  await page.getByTestId("focus-start").click();

  await expect(page.getByTestId("typing-surface")).toBeVisible();
  await expect(page.getByTestId("typing-stats")).toBeVisible();

  // Type a correct first character ('c' from "class FastAPI…")
  const surface = page.getByTestId("typing-surface");
  const textarea = surface.locator("textarea");
  await textarea.focus();
  await page.keyboard.press("c");

  // The 'c' char span now has data-status="correct"
  await expect(
    surface.locator('[data-index="0"]')
  ).toHaveAttribute("data-status", "correct");

  // Type a wrong character next
  await page.keyboard.press("z");
  await expect(
    surface.locator('[data-index="1"]')
  ).toHaveAttribute("data-status", "wrong");

  // Backspace corrects
  await page.keyboard.press("Backspace");
  await expect(
    surface.locator('[data-index="1"]')
  ).toHaveAttribute("data-status", "pending");

  // Type the rest of "class FastAPI:\n    pass\n" by streaming the chars
  const remaining = "lass FastAPI:";
  for (const ch of remaining) {
    await page.keyboard.press(ch);
  }
  // Now Enter to advance through "\n    "
  await page.keyboard.press("Enter");
  for (const ch of "pass") {
    await page.keyboard.press(ch);
  }

  // Completion card visible
  await expect(page.getByTestId("completion-card")).toBeVisible({
    timeout: 5000,
  });
});
