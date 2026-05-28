import { test, expect } from "@playwright/test";

test("landing page renders with CodeType mark and tagline", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("CodeType");
  await expect(page.getByText(/Type real code/i)).toBeVisible();
  await expect(page.getByText(/Understand real codebases/i)).toBeVisible();
});

test("landing shows only two main paths", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("landing-type-right-away")).toBeVisible();
  await expect(page.getByTestId("landing-custom")).toBeVisible();
  // No repo input, config editor, or schema visible on landing
  await expect(page.locator("input")).toHaveCount(0);
  await expect(page.locator("textarea")).toHaveCount(0);
});

test("Type right away shows three curated cards", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("landing-type-right-away").click();
  await expect(page.getByRole("heading", { name: "Linux kernel" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "VS Code" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "FastAPI" })).toBeVisible();
  await expect(page.getByText("torvalds/linux")).toBeVisible();
  await expect(page.getByText("microsoft/vscode")).toBeVisible();
  await expect(page.getByText("fastapi/fastapi")).toBeVisible();
});

test("Custom opens consolidated hub with all flows on one page", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("landing-custom").click();
  await expect(page.getByRole("heading", { name: /Custom session/i })).toBeVisible();
  await expect(page.getByTestId("lar-input")).toBeVisible();
  await expect(page.getByTestId("paste-textarea")).toBeVisible();
  await expect(page.getByTestId("pb-preview")).toBeVisible();
});

test("Enter key on landing triggers Type right away", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: /Pick a codebase/i })).toBeVisible();
});

test("no console errors on landing or main flows", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("landing-type-right-away").click();
  await page.waitForLoadState("networkidle");
  await page.goto("/");
  await page.getByTestId("landing-custom").click();
  await page.waitForLoadState("networkidle");
  expect(errors, errors.join("\n")).toEqual([]);
});
