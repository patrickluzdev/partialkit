import { expect, test, type Page } from "@playwright/test";

const LAB = "/tests/fixtures/lab.html";

test.beforeEach(async ({ page }) => {
  // partialkit collapses its transitions under reduced motion, which also keeps
  // geometry assertions free of mid-animation scaling.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(LAB);
});

/** Opens a menu and waits for its transition, so geometry and focus are settled. */
async function open(page: Page, trigger: string, menu: string) {
  await page.click(trigger);
  await expect(page.locator(menu)).toBeVisible();
  await page.locator(menu).evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
}

test("wires the menu button pattern before it is ever opened", async ({ page }) => {
  const trigger = page.locator("#start-trigger");

  await expect(trigger).toHaveAttribute("aria-haspopup", "menu");
  await expect(trigger).toHaveAttribute("aria-controls", "start-menu");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#start-menu")).toHaveAttribute("role", "menu");
});

test("names the menu after its label", async ({ page }) => {
  const menu = page.locator("#start-menu");
  const labelledBy = await menu.getAttribute("aria-labelledby");

  expect(labelledBy).toBeTruthy();
  await expect(page.locator(`#${labelledBy}`)).toHaveText("Group");
});

test("opening focuses the first item and flips aria-expanded", async ({ page }) => {
  await open(page, "#start-trigger", "#start-menu");

  await expect(page.locator("#start-trigger")).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#start-trigger")).toHaveAttribute("data-state", "open");
  await expect(page.locator("#start-menu")).toHaveAttribute("data-state", "open");
  await expect(page.getByRole("menuitem", { name: "Alpha" })).toBeFocused();
});

test("marks disabled items with aria-disabled and skips them", async ({ page }) => {
  await expect(page.locator("#start-menu .dropdown-menu-item", { hasText: "Gamma" })).toHaveAttribute(
    "aria-disabled",
    "true",
  );

  await open(page, "#start-trigger", "#start-menu");
  await expect(page.getByRole("menuitem", { name: "Alpha" })).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Beta" })).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Delta" })).toBeFocused();
});

test("arrow navigation wraps at both ends", async ({ page }) => {
  await open(page, "#start-trigger", "#start-menu");
  await expect(page.getByRole("menuitem", { name: "Alpha" })).toBeFocused();

  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("menuitem", { name: "Sticky" })).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Alpha" })).toBeFocused();
});

test("Home and End jump to the first and last enabled items", async ({ page }) => {
  await open(page, "#start-trigger", "#start-menu");
  await expect(page.getByRole("menuitem", { name: "Alpha" })).toBeFocused();

  await page.keyboard.press("End");
  await expect(page.getByRole("menuitem", { name: "Sticky" })).toBeFocused();

  await page.keyboard.press("Home");
  await expect(page.getByRole("menuitem", { name: "Alpha" })).toBeFocused();
});

test("type-ahead jumps to a matching item", async ({ page }) => {
  await open(page, "#start-trigger", "#start-menu");
  await expect(page.getByRole("menuitem", { name: "Alpha" })).toBeFocused();

  await page.keyboard.press("d");

  await expect(page.getByRole("menuitem", { name: "Delta" })).toBeFocused();
});

test("Escape closes and returns focus to the trigger", async ({ page }) => {
  await open(page, "#start-trigger", "#start-menu");
  await expect(page.getByRole("menuitem", { name: "Alpha" })).toBeFocused();

  await page.keyboard.press("Escape");

  await expect(page.locator("#start-menu")).toBeHidden();
  await expect(page.locator("#start-trigger")).toBeFocused();
  await expect(page.locator("#start-trigger")).toHaveAttribute("aria-expanded", "false");
});

test("Tab closes and returns focus to the trigger", async ({ page }) => {
  await open(page, "#start-trigger", "#start-menu");
  await expect(page.getByRole("menuitem", { name: "Alpha" })).toBeFocused();

  await page.keyboard.press("Tab");

  await expect(page.locator("#start-menu")).toBeHidden();
  await expect(page.locator("#start-trigger")).toBeFocused();
});

test("activating an item closes the menu", async ({ page }) => {
  await open(page, "#start-trigger", "#start-menu");
  await page.getByRole("menuitem", { name: "Beta" }).click();

  await expect(page.locator("#start-menu")).toBeHidden();
});

test("data-pk-keep-open holds the menu open", async ({ page }) => {
  await open(page, "#start-trigger", "#start-menu");
  await page.click("#sticky-item");

  await expect(page.locator("#start-menu")).toBeVisible();
});

test("positions below the trigger by default", async ({ page }) => {
  await open(page, "#start-trigger", "#start-menu");

  const trigger = await page.locator("#start-trigger").boundingBox();
  const menu = await page.locator("#start-menu").boundingBox();

  expect(trigger && menu).toBeTruthy();
  expect(Math.abs(menu!.y - (trigger!.y + trigger!.height + 4))).toBeLessThanOrEqual(1);
  expect(Math.abs(menu!.x - trigger!.x)).toBeLessThanOrEqual(1);
});

test("data-pk-offset changes the gap", async ({ page }) => {
  await open(page, "#offset-trigger", "#offset-menu");

  const trigger = await page.locator("#offset-trigger").boundingBox();
  const menu = await page.locator("#offset-menu").boundingBox();

  expect(Math.abs(menu!.y - (trigger!.y + trigger!.height + 24))).toBeLessThanOrEqual(1);
});

test("bottom-end aligns the right edges", async ({ page }) => {
  await open(page, "#end-trigger", "#end-menu");

  const trigger = await page.locator("#end-trigger").boundingBox();
  const menu = await page.locator("#end-menu").boundingBox();

  expect(Math.abs(menu!.x + menu!.width - (trigger!.x + trigger!.width))).toBeLessThanOrEqual(1);
});

test("flips above the trigger when there is no room below", async ({ page }) => {
  await page.locator("#flip-trigger").scrollIntoViewIfNeeded();
  await open(page, "#flip-trigger", "#flip-menu");

  const trigger = await page.locator("#flip-trigger").boundingBox();
  const menu = await page.locator("#flip-menu").boundingBox();

  expect(menu!.y + menu!.height).toBeLessThanOrEqual(trigger!.y);
});
