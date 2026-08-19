import { expect, test, type Page } from "@playwright/test";

// Baselines are rendered by one engine only; running them everywhere would just
// compare font rasterisers. Behaviour is what the other browsers are for.
test.skip(({ browserName }) => browserName !== "chromium", "visual baselines are chromium-only");

const PAGES = [
  "/",
  "/components/accordion/",
  "/components/alert-dialog/",
  "/components/alert/",
  "/components/aspect-ratio/",
  "/components/avatar/",
  "/components/badge/",
  "/components/breadcrumb/",
  "/components/button-group/",
  "/components/button/",
  "/components/card/",
  "/components/checkbox/",
  "/components/collapsible/",
  "/components/context-menu/",
  "/components/dialog/",
  "/components/dropdown-menu/",
  "/components/empty/",
  "/components/field/",
  "/components/input-group/",
  "/components/input/",
  "/components/item/",
  "/components/kbd/",
  "/components/label/",
  "/components/native-select/",
  "/components/pagination/",
  "/components/popover/",
  "/components/progress/",
  "/components/radio-group/",
  "/components/separator/",
  "/components/sheet/",
  "/components/skeleton/",
  "/components/slider/",
  "/components/spinner/",
  "/components/switch/",
  "/components/table/",
  "/components/tabs/",
  "/components/textarea/",
  "/components/toggle-group/",
  "/components/toggle/",
  "/components/tooltip/",
  "/guides/theming/",
];

async function visit(page: Page, path: string, theme: "light" | "dark") {
  await page.goto(path);
  await page.evaluate((value) => localStorage.setItem("starlight-theme", value), theme);
  await page.reload();

  // Text reflows when the web font swaps in, which is enough to fail a baseline
  // captured a moment earlier.
  await page.evaluate(() => document.fonts.ready);
}

for (const theme of ["light", "dark"] as const) {
  test.describe(`@visual ${theme}`, () => {
    for (const path of PAGES) {
      // Every example on the page, named after the example file rather than its
      // position, so reordering a page does not invalidate baselines.
      test(path, async ({ page }) => {
        await visit(page, path, theme);

        const previews = page.locator("[data-example]");
        const count = await previews.count();
        expect(count, `${path} has examples`).toBeGreaterThan(0);

        for (let index = 0; index < count; index++) {
          const preview = previews.nth(index);
          const name = await preview.getAttribute("data-example");
          await expect(preview).toHaveScreenshot(`${name!.replace(/\//g, "-")}-${theme}.png`);
        }
      });
    }

    // The backdrop only shows on a full-page shot, so this one runs against the
    // lab fixture: documentation chrome would make the baseline churn on copy edits.
    test("open dialog", async ({ page }) => {
      await page.goto("/tests/lab.html");
      await page.evaluate(() => document.fonts.ready);
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

    test("open submenu", async ({ page }) => {
      await page.goto("/tests/lab.html");
      await page.evaluate(() => document.fonts.ready);
      await page.click(`#theme-${theme}`);
      await page.click("#rich-trigger");
      // The pointer would still be over the menu as it animates in, and moving
      // across items closes an open submenu. This one is opened by keyboard.
      await page.mouse.move(0, 0);
      await page.locator("#sub-trigger").focus();
      await page.keyboard.press("ArrowRight");
      await expect(page.locator("#sub-menu")).toBeVisible();

      await expect(page.locator("#rich-menu")).toHaveScreenshot(`submenu-open-${theme}.png`);
    });
  });
}
