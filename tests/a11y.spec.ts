import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

function scan(page: Page) {
  return new AxeBuilder({ page }).withTags(TAGS);
}

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((value) => localStorage.setItem("pk-theme", value), theme);
  await page.reload();
}

for (const theme of ["light", "dark"] as const) {
  test(`the site has no violations in ${theme} mode`, async ({ page }) => {
    await page.goto("/");
    await setTheme(page, theme);

    const results = await scan(page).analyze();
    expect(results.violations).toEqual([]);
  });
}

test("the lab fixture has no violations", async ({ page }) => {
  await page.goto("/tests/fixtures/lab.html");

  const results = await scan(page).analyze();
  expect(results.violations).toEqual([]);
});

test("an open dialog has no violations", async ({ page }) => {
  await page.goto("/tests/fixtures/lab.html");
  await page.click("#open-basic");
  await expect(page.locator("#basic")).toBeVisible();

  const results = await scan(page).analyze();
  expect(results.violations).toEqual([]);
});

test("an open menu has no violations", async ({ page }) => {
  await page.goto("/tests/fixtures/lab.html");
  await page.click("#start-trigger");
  await expect(page.locator("#start-menu")).toBeVisible();

  const results = await scan(page).analyze();
  expect(results.violations).toEqual([]);
});
