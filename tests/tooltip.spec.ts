import { expect, test } from "@playwright/test";

const LAB = "/tests/lab.html";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(LAB);
});

test("describes its trigger rather than labelling it", async ({ page }) => {
  const trigger = page.locator("#lab-tooltip-trigger");

  await expect(trigger).toHaveAttribute("aria-describedby", "lab-tooltip");
  await expect(trigger).not.toHaveAttribute("aria-labelledby", /.+/);
  // A tooltip is a description, not a widget of its own.
  await expect(page.locator("#lab-tooltip")).not.toHaveAttribute("role", /.+/);
});

test("is manual, so it cannot dismiss an open menu", async ({ page }) => {
  await expect(page.locator("#lab-tooltip")).toHaveAttribute("popover", "manual");
});

test("opens on hover and closes when the pointer leaves", async ({ page }) => {
  await page.hover("#lab-tooltip-trigger");
  await expect(page.locator("#lab-tooltip")).toBeVisible();

  await page.mouse.move(0, 0);
  await expect(page.locator("#lab-tooltip")).toBeHidden();
});

test("opens on focus, for people who never hover", async ({ page }) => {
  await page.locator("#lab-tooltip-trigger").focus();
  await expect(page.locator("#lab-tooltip")).toBeVisible();

  await page.locator("#lab-tooltip-trigger").blur();
  await expect(page.locator("#lab-tooltip")).toBeHidden();
});

test("never takes focus away from the trigger", async ({ page }) => {
  await page.locator("#lab-tooltip-trigger").focus();
  await expect(page.locator("#lab-tooltip")).toBeVisible();
  await expect(page.locator("#lab-tooltip-trigger")).toBeFocused();
});

test("Escape dismisses it while the trigger keeps focus", async ({ page }) => {
  await page.locator("#lab-tooltip-trigger").focus();
  await expect(page.locator("#lab-tooltip")).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(page.locator("#lab-tooltip")).toBeHidden();
  await expect(page.locator("#lab-tooltip-trigger")).toBeFocused();
});

test("does not outlive the click it describes", async ({ page }) => {
  await page.hover("#lab-tooltip-trigger");
  await expect(page.locator("#lab-tooltip")).toBeVisible();

  await page.click("#lab-tooltip-trigger");
  await expect(page.locator("#lab-tooltip")).toBeHidden();
});

test("sits above its trigger when asked for the top", async ({ page }) => {
  await page.hover("#lab-tooltip-trigger");
  await expect(page.locator("#lab-tooltip")).toBeVisible();

  const trigger = await page.locator("#lab-tooltip-trigger").boundingBox();
  const panel = await page.locator("#lab-tooltip").boundingBox();

  expect(panel!.y + panel!.height).toBeLessThanOrEqual(trigger!.y + 1);
});
