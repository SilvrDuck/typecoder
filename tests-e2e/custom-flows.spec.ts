import { test, expect } from "@playwright/test";

test("prompt builder is reactive when template changes", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("landing-custom").click();
  await page.getByTestId("custom-prompt").click();

  // Default template is trace-execution
  await expect(page.getByTestId("pb-best-for")).toContainText(
    /Understanding how execution moves/i,
  );

  // Switch template
  await page.getByTestId("pb-template").selectOption("focus-tests");
  await expect(page.getByTestId("pb-best-for")).toContainText(
    /Understanding behavior through examples/i,
  );
  await expect(page.getByTestId("pb-bullets")).toContainText(/high-signal tests/i);
  await expect(page.getByTestId("pb-preview")).toContainText(/Focus on tests/i);
});

test("prompt builder reveals custom focus field for Custom template", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByTestId("landing-custom").click();
  await page.getByTestId("custom-prompt").click();

  await expect(page.getByTestId("pb-custom-focus-row")).toHaveCount(0);
  await page.getByTestId("pb-template").selectOption("custom");
  await expect(page.getByTestId("pb-custom-focus-row")).toBeVisible();

  await page.getByTestId("pb-custom-focus").fill("understand plugin loading");
  await expect(page.getByTestId("pb-preview")).toContainText(
    "Custom focus: understand plugin loading",
  );
});

test("prompt builder copy prompt updates button label", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");
  await page.getByTestId("landing-custom").click();
  await page.getByTestId("custom-prompt").click();
  await page.getByTestId("pb-repo").fill("vitejs/vite");
  await page.getByTestId("pb-copy-prompt").click();
  await expect(page.getByTestId("pb-copy-prompt")).toContainText(/Copied/);
});

test("paste config rejects malformed JSON", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("landing-custom").click();
  await page.getByTestId("custom-paste").click();
  await page.getByTestId("paste-textarea").fill("{ not json");
  await expect(page.getByTestId("paste-errors")).toBeVisible();
  await expect(page.getByTestId("paste-errors")).toContainText(/Invalid JSON|JSON/i);
});

test("paste config rejects invalid schema", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("landing-custom").click();
  await page.getByTestId("custom-paste").click();
  await page.getByTestId("paste-textarea").fill(
    JSON.stringify({ version: 2, repo: "a/b", title: "x", items: [] }),
  );
  await expect(page.getByTestId("paste-errors")).toBeVisible();
});

test("paste config accepts a valid config and shows preview", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("landing-custom").click();
  await page.getByTestId("custom-paste").click();
  await page.getByTestId("paste-textarea").fill(
    JSON.stringify({
      version: 1,
      repo: "vitejs/vite",
      title: "Test session",
      items: [{ level: "file", path: "src/x.ts", label: "x" }],
    }),
  );
  await expect(page.getByTestId("paste-preview")).toBeVisible();
  await expect(page.getByTestId("paste-preview")).toContainText("Test session");
  await expect(page.getByTestId("paste-start")).toBeVisible();
});

test("load any repo rejects malformed repo input", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("landing-custom").click();
  await page.getByTestId("custom-load").click();
  await page.getByTestId("lar-input").fill("not-a-real-repo-input");
  await page.getByTestId("lar-load").click();
  await expect(page.getByTestId("lar-parse-error")).toBeVisible();
});

test("load any repo: mocked GitHub returns suggested session", async ({ page }) => {
  // Mock both api.github.com and raw URLs
  await page.route("**/api.github.com/repos/**", async (route) => {
    if (route.request().url().includes("/git/trees/")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sha: "abc",
          truncated: false,
          tree: [
            { path: "src/index.ts", type: "blob", sha: "1", size: 800 },
            { path: "src/cli.ts", type: "blob", sha: "2", size: 1200 },
            { path: "src/util.ts", type: "blob", sha: "3", size: 600 },
            { path: "package.json", type: "blob", sha: "4", size: 200 },
          ],
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ default_branch: "main", private: false }),
      });
    }
  });

  await page.goto("/");
  await page.getByTestId("landing-custom").click();
  await page.getByTestId("custom-load").click();
  await page.getByTestId("lar-input").fill("vitejs/vite");
  await page.getByTestId("lar-load").click();
  await expect(page.getByTestId("lar-loaded")).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId("lar-suggested")).toBeVisible();
});
