import { test, expect } from "@playwright/test";

test("URL hash updates as the user navigates", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("landing-type-right-away")).toBeVisible();

  await page.getByTestId("landing-type-right-away").click();
  await expect(page).toHaveURL(/#\/curated$/);

  await page.goBack(); // hashchange back to landing
  await expect(page.getByTestId("landing-type-right-away")).toBeVisible({
    timeout: 5000,
  });

  await page.getByTestId("landing-custom").click();
  await expect(page).toHaveURL(/#\/custom$/);
});

test("Deep-link to curated session restores the right config", async ({ page }) => {
  // Mock the GitHub fetch so the curated session resolves deterministically.
  await page.route("**/raw.githubusercontent.com/**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/plain",
      body: "class FastAPI:\n    pass\n",
    });
  });

  // Encoded { kind: "curated", id: "fastapi" }
  const encoded = "eyJraW5kIjoiY3VyYXRlZCIsImlkIjoiZmFzdGFwaSJ9";
  await page.goto(`/#/typing?s=${encoded}`);

  // Should land on the typing screen with the FastAPI source label.
  await expect(page.getByTestId("typing-surface")).toBeVisible({
    timeout: 10000,
  });
  // URL must keep the session payload (the app round-trips through writeUrl
  // with the cursor=0, results=[] expansion, so the hash will differ but
  // must still be a typing route with an `s` param).
  await expect(page).toHaveURL(/#\/typing\?s=/);
});

test("Share button copies a config-only URL", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
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
  await expect(page.getByTestId("typing-surface")).toBeVisible({
    timeout: 10000,
  });

  await page.getByTestId("typing-share").click();
  await expect(page.getByTestId("typing-share")).toHaveText(/Copied/);

  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toMatch(/#\/typing\?s=/);
});
