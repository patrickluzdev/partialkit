import { expect, test, type Page } from "@playwright/test";

const LAB = "/tests/lab.html";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(LAB);
});

async function open(page: Page, trigger: string, menu: string) {
  await page.click(trigger);
  await expect(page.locator(menu)).toBeVisible();
  await page
    .locator(menu)
    .evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
}

test("applies the menu bar pattern", async ({ page }) => {
  await expect(page.locator("#lab-menubar")).toHaveAttribute("role", "menubar");
  await expect(page.locator("#lab-menu-file-trigger")).toHaveAttribute("role", "menuitem");
  await expect(page.locator("#lab-menu-file-trigger")).toHaveAttribute("aria-haspopup", "menu");
});

test("the whole bar is one stop in the tab order", async ({ page }) => {
  await expect(page.locator("#lab-menu-file-trigger")).toHaveAttribute("tabindex", "0");
  await expect(page.locator("#lab-menu-edit-trigger")).toHaveAttribute("tabindex", "-1");

  await page.locator("#lab-menu-file-trigger").focus();
  await page.keyboard.press("ArrowRight");

  await expect(page.locator("#lab-menu-edit-trigger")).toBeFocused();
  await expect(page.locator("#lab-menu-edit-trigger")).toHaveAttribute("tabindex", "0");
  await expect(page.locator("#lab-menu-file-trigger")).toHaveAttribute("tabindex", "-1");
});

test("arrows swap menus while one is open", async ({ page }) => {
  await open(page, "#lab-menu-file-trigger", "#lab-menu-file");
  await expect(page.locator("#lab-menu-file-first")).toBeFocused();

  await page.keyboard.press("ArrowRight");

  await expect(page.locator("#lab-menu-file")).toBeHidden();
  await expect(page.locator("#lab-menu-edit")).toBeVisible();
  await expect(page.locator("#lab-menu-edit-first")).toBeFocused();
});

test("crossing the bar with a menu open opens the one under the pointer", async ({ page }) => {
  await open(page, "#lab-menu-file-trigger", "#lab-menu-file");

  await page.hover("#lab-menu-view-trigger");

  await expect(page.locator("#lab-menu-file")).toBeHidden();
  await expect(page.locator("#lab-menu-view")).toBeVisible();
});

test("hovering the bar with nothing open opens nothing", async ({ page }) => {
  await page.hover("#lab-menu-edit-trigger");

  await expect(page.locator("#lab-menu-edit")).toBeHidden();
});

test("the panel keeps the dropdown menu's own keyboard", async ({ page }) => {
  await open(page, "#lab-menu-file-trigger", "#lab-menu-file");

  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "New Window" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(page.locator("#lab-menu-file")).toBeHidden();
  await expect(page.locator("#lab-menu-file-trigger")).toBeFocused();
});

test("the open menu marks its trigger", async ({ page }) => {
  await open(page, "#lab-menu-file-trigger", "#lab-menu-file");

  await expect(page.locator("#lab-menu-file-trigger")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#lab-menu-edit-trigger")).toHaveAttribute("aria-expanded", "false");
});
