import { expect, test } from "@playwright/test";

/**
 * Every token, against shadcn/ui's published neutral palette.
 *
 * These values come from https://ui.shadcn.com/r/colors/neutral.json, not from
 * memory — two of them had drifted (`--popover` and `--accent` in dark), which
 * is invisible until a menu's hover lands on the same colour as its panel.
 */

const LAB = "/tests/lab.html";

test.skip(({ browserName }) => browserName !== "chromium", "token values are engine-independent");

const LIGHT: Record<string, string> = {
  background: "oklch(1 0 0)",
  foreground: "oklch(0.145 0 0)",
  card: "oklch(1 0 0)",
  "card-foreground": "oklch(0.145 0 0)",
  popover: "oklch(1 0 0)",
  "popover-foreground": "oklch(0.145 0 0)",
  primary: "oklch(0.205 0 0)",
  "primary-foreground": "oklch(0.985 0 0)",
  secondary: "oklch(0.97 0 0)",
  "secondary-foreground": "oklch(0.205 0 0)",
  muted: "oklch(0.97 0 0)",
  "muted-foreground": "oklch(0.556 0 0)",
  accent: "oklch(0.97 0 0)",
  "accent-foreground": "oklch(0.205 0 0)",
  destructive: "oklch(0.577 0.245 27.325)",
  border: "oklch(0.922 0 0)",
  input: "oklch(0.922 0 0)",
  ring: "oklch(0.708 0 0)",
  radius: "0.625rem",
};

const DARK: Record<string, string> = {
  background: "oklch(0.145 0 0)",
  foreground: "oklch(0.985 0 0)",
  card: "oklch(0.205 0 0)",
  "card-foreground": "oklch(0.985 0 0)",
  popover: "oklch(0.205 0 0)",
  "popover-foreground": "oklch(0.985 0 0)",
  primary: "oklch(0.922 0 0)",
  "primary-foreground": "oklch(0.205 0 0)",
  secondary: "oklch(0.269 0 0)",
  "secondary-foreground": "oklch(0.985 0 0)",
  muted: "oklch(0.269 0 0)",
  "muted-foreground": "oklch(0.708 0 0)",
  accent: "oklch(0.269 0 0)",
  "accent-foreground": "oklch(0.985 0 0)",
  destructive: "oklch(0.704 0.191 22.216)",
  border: "oklch(1 0 0 / 10%)",
  input: "oklch(1 0 0 / 15%)",
  ring: "oklch(0.556 0 0)",
};

/** Compares the declared text, so a value is checked rather than a rendering of it. */
function normalise(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

for (const [theme, expected] of [
  ["light", LIGHT],
  ["dark", DARK],
] as const) {
  test(`the ${theme} palette matches shadcn/ui`, async ({ page }) => {
    await page.goto(LAB);
    await page.click(`#theme-${theme}`);

    const actual = await page.evaluate((names) => {
      const computed = getComputedStyle(document.documentElement);
      return Object.fromEntries(names.map((name) => [name, computed.getPropertyValue(`--${name}`)]));
    }, Object.keys(expected));

    const drifted: string[] = [];
    for (const [name, value] of Object.entries(expected)) {
      if (normalise(actual[name] ?? "") !== value) {
        drifted.push(`--${name}: ${normalise(actual[name] ?? "(missing)")} — expected ${value}`);
      }
    }

    expect(drifted).toEqual([]);
  });
}

test("a menu's hover is visible against its own panel", async ({ page }) => {
  // The pair that made the drift visible: an accent equal to the popover leaves
  // a menu with no hover at all.
  await page.goto(LAB);

  for (const theme of ["light", "dark"] as const) {
    await page.click(`#theme-${theme}`);
    const popover = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--popover").trim(),
    );
    const accent = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
    );

    expect(accent, `${theme}: accent must differ from popover`).not.toBe(popover);
  }
});

test("the theme does not define tokens shadcn/ui dropped", async ({ page }) => {
  await page.goto(LAB);

  // Destructive surfaces are a wash of --destructive carrying it as text, so
  // there is no foreground pair any more.
  const value = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--destructive-foreground"),
  );

  expect(value.trim()).toBe("");
});
