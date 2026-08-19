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
 * Violations partialkit knowingly ships, because closing them would mean parting
 * ways with shadcn/ui. Each one is narrow: a rule plus the markup it applies to,
 * so anything else still fails the build.
 */
const ACCEPTED = [
  {
    rule: "color-contrast",
    // A destructive control carries --destructive as its text on a wash of the
    // same colour. shadcn/ui's palette puts that at 3.97:1 in light and 4.28:1
    // in dark, under the 4.5:1 WCAG AA asks for. partialkit follows their
    // palette rather than diverging; see guides/theming.
    applies: (html: string) => /btn-destructive|badge-destructive/.test(html),
  },
];

interface AxeNode {
  html: string;
}

interface AxeViolation {
  id: string;
  nodes: AxeNode[];
}

/** Splits a report into what must fail the build and what is a recorded exception. */
function triage(violations: AxeViolation[]) {
  const unexpected: string[] = [];
  let accepted = 0;

  for (const violation of violations) {
    for (const node of violation.nodes) {
      const exception = ACCEPTED.find(
        (candidate) => candidate.rule === violation.id && candidate.applies(node.html),
      );
      if (exception) accepted++;
      else unexpected.push(`${violation.id}: ${node.html.slice(0, 120)}`);
    }
  }

  return { unexpected, accepted };
}

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
      expect(triage(results.violations).unexpected).toEqual([]);
    });
  }
}

test("the recorded contrast exception is still needed", async ({ page }) => {
  await visit(page, "/components/button/", "light");

  const { accepted } = triage((await scan(page).analyze()).violations);

  // If shadcn/ui lifts its destructive colour, this stops matching and the
  // exception above should be deleted rather than left to rot.
  expect(accepted, "destructive contrast no longer reported — drop the exception").toBeGreaterThan(0);
});

test("the lab fixture has no violations", async ({ page }) => {
  await page.goto("/tests/lab.html");

  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(triage(results.violations).unexpected).toEqual([]);
});

test("an open dialog has no violations", async ({ page }) => {
  await page.goto("/tests/lab.html");
  await page.click("#open-basic");
  await expect(page.locator("#basic")).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(triage(results.violations).unexpected).toEqual([]);
});

test("an open dropdown menu has no violations", async ({ page }) => {
  await page.goto("/tests/lab.html");
  await page.click("#start-trigger");
  await expect(page.locator("#start-menu")).toBeVisible();

  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  expect(triage(results.violations).unexpected).toEqual([]);
});
