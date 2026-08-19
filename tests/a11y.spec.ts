import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// axe reports on the accessibility tree, which does not differ meaningfully between
// engines. The behavioural specs are what the other two browsers are for.
test.skip(({ browserName }) => browserName !== "chromium", "axe runs on chromium only");

const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const PAGES = [
  "/",
  "/installation/",
  "/guides/theming/",
  "/components/alert/",
  "/components/alert-dialog/",
  "/components/badge/",
  "/components/button/",
  "/components/card/",
  "/components/dialog/",
  "/components/dropdown-menu/",
  "/components/field/",
  "/components/input/",
  "/components/label/",
  "/components/native-select/",
  "/components/textarea/",
];

/**
 * Scoped to `main` so the report covers partialkit's markup, not Starlight's chrome.
 * Expressive Code renders the code panels and owns their scroll containers.
 */
function scan(page: Page) {
  return new AxeBuilder({ page }).include("main").exclude(".expressive-code").withTags(TAGS);
}

async function visit(page: Page, path: string, theme: "light" | "dark") {
  await page.goto(path);
  await page.evaluate((value) => localStorage.setItem("starlight-theme", value), theme);
  await page.reload();
}

for (const theme of ["light", "dark"] as const) {
  for (const path of PAGES) {
    test(`${path} has no violations in ${theme} mode`, async ({ page }) => {
      await visit(page, path, theme);

      const results = await scan(page).analyze();
      expect(results.violations).toEqual([]);
    });
  }
}

test("the lab fixture has no violations", async ({ page }) => {
  await page.goto("/tests/lab.html");

  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(results.violations).toEqual([]);
});

test("an open dialog has no violations", async ({ page }) => {
  await page.goto("/tests/lab.html");
  await page.click("#open-basic");
  await expect(page.locator("#basic")).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(results.violations).toEqual([]);
});

test("an open dropdown menu has no violations", async ({ page }) => {
  await page.goto("/tests/lab.html");
  await page.click("#start-trigger");
  await expect(page.locator("#start-menu")).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(results.violations).toEqual([]);
});
