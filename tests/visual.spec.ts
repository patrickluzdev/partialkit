import { expect, test, type Page } from "@playwright/test";

// Baselines are rendered by one engine only; running them everywhere would just
// compare font rasterisers. Behaviour is what the other browsers are for.
test.skip(({ browserName }) => browserName !== "chromium", "visual baselines are chromium-only");

const EXAMPLES = ["button", "badge", "alert", "card", "dialog", "dropdown-menu"];

async function setTheme(page: Page, theme: "light" | "dark") {
  await page.evaluate((value) => localStorage.setItem("pk-theme", value), theme);
  await page.reload();
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`@visual ${theme}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/");
      await setTheme(page, theme);
    });

    for (const example of EXAMPLES) {
      test(`${example} example`, async ({ page }) => {
        const preview = page.locator(`#${example} [data-panel="preview"]`);
        await expect(preview).toHaveScreenshot(`${example}-${theme}.png`);
      });
    }

    test("open dialog", async ({ page }) => {
      await page.click('[data-pk-dialog-open="delete-project"]');
      await expect(page.locator("#delete-project")).toBeVisible();
      await expect(page).toHaveScreenshot(`dialog-open-${theme}.png`);
    });

    test("open dropdown menu", async ({ page }) => {
      await page.locator("#dropdown-menu").scrollIntoViewIfNeeded();
      await page.click('[popovertarget="account-menu"]');
      await expect(page.locator("#account-menu")).toBeVisible();
      await expect(page.locator("#account-menu")).toHaveScreenshot(`dropdown-menu-open-${theme}.png`);
    });
  });
}
