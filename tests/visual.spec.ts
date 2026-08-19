import { expect, test, type Page } from "@playwright/test";

// Baselines are rendered by one engine only; running them everywhere would just
// compare font rasterisers. Behaviour is what the other browsers are for.
test.skip(({ browserName }) => browserName !== "chromium", "visual baselines are chromium-only");

const COMPONENTS = [
  "alert",
  "badge",
  "button",
  "card",
  "dialog",
  "dropdown-menu",
  "field",
  "input",
  "label",
  "native-select",
  "textarea",
];

async function visit(page: Page, path: string, theme: "light" | "dark") {
  await page.goto(path);
  await page.evaluate((value) => localStorage.setItem("starlight-theme", value), theme);
  await page.reload();
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`@visual ${theme}`, () => {
    for (const component of COMPONENTS) {
      test(component, async ({ page }) => {
        await visit(page, `/components/${component}/`, theme);

        const preview = page.locator(".pk-preview").first();
        await expect(preview).toHaveScreenshot(`${component}-${theme}.png`);
      });
    }

    // The backdrop only shows on a full-page shot, so this one runs against the
    // lab fixture: documentation chrome would make the baseline churn on copy edits.
    test("open dialog", async ({ page }) => {
      await page.goto("/tests/lab.html");
      await page.click(`#theme-${theme}`);
      await page.click("#open-basic");
      await expect(page.locator("#basic")).toBeVisible();

      await expect(page).toHaveScreenshot(`dialog-open-${theme}.png`);
    });

    test("open dropdown menu", async ({ page }) => {
      await visit(page, "/components/dropdown-menu/", theme);
      await page.click('[popovertarget="demo-menu"]');
      await expect(page.locator("#demo-menu")).toBeVisible();

      await expect(page.locator("#demo-menu")).toHaveScreenshot(`dropdown-menu-open-${theme}.png`);
    });
  });
}
