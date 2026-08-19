import { expect, test } from "@playwright/test";

/**
 * Right-to-left is not a translation problem, it is a layout one. Anything
 * written with a physical side — padding, an absolute corner, a drawn arrow, a
 * menu's placement — points the wrong way until it is made logical.
 */

const LAB = "/tests/lab.html";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(LAB);
});

test("an icon's tighter padding follows the reading direction", async ({ page }) => {
  const [start, end] = await page
    .locator("#rtl-icon-button")
    .evaluate((element) => {
      const computed = getComputedStyle(element);
      return [Number.parseFloat(computed.paddingRight), Number.parseFloat(computed.paddingLeft)];
    });

  // data-icon="inline-start" is the right-hand side here, so that is the side
  // that tightens.
  expect(start).toBeLessThan(end);
});

test("the icon sits before the label in reading order", async ({ page }) => {
  const icon = await page.locator("#rtl-icon-button svg").boundingBox();
  const label = await page.locator("#rtl-icon-label").boundingBox();

  expect(icon!.x).toBeGreaterThan(label!.x);
});

test("the dialog's dismiss moves to the leading corner", async ({ page }) => {
  await page.click("#open-rtl-dialog");
  await expect(page.locator("#rtl-dialog")).toBeVisible();

  const dialog = await page.locator("#rtl-dialog").boundingBox();
  const close = await page.locator("#rtl-dialog-close").boundingBox();

  // Trailing edge in RTL is the left one.
  expect(close!.x).toBeLessThan(dialog!.x + dialog!.width / 2);
});

test("a menu item's indicator moves to the trailing edge", async ({ page }) => {
  await page.click("#rtl-trigger");
  await expect(page.locator("#rtl-menu")).toBeVisible();

  const item = await page.locator("#rtl-check").boundingBox();
  const indicator = await page.locator("#rtl-indicator").boundingBox();

  expect(indicator!.x).toBeLessThan(item!.x + item!.width / 2);
});

test("a button group rounds its outer corners on the correct sides", async ({ page }) => {
  const corners = (selector: string) =>
    page.locator(selector).evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        topLeft: Number.parseFloat(computed.borderTopLeftRadius),
        topRight: Number.parseFloat(computed.borderTopRightRadius),
      };
    });

  const first = await corners("#rtl-group-first");
  const last = await corners("#rtl-group-last");

  // The first control is on the right in RTL, so its right corner is the round one.
  expect(first.topRight).toBeGreaterThan(0);
  expect(first.topLeft).toBe(0);
  expect(last.topLeft).toBeGreaterThan(0);
  expect(last.topRight).toBe(0);
});

test("the select's chevron moves to the trailing edge", async ({ page }) => {
  // The engine normalises the keyword away, so the two directions are compared
  // instead: measured from the right in LTR, from the left in RTL.
  const positions = await page.locator("#control-select").evaluate((element) => {
    const ltr = getComputedStyle(element).backgroundPositionX;
    element.setAttribute("dir", "rtl");
    const rtl = getComputedStyle(element).backgroundPositionX;
    return { ltr, rtl };
  });

  expect(positions.ltr).toContain("100%");
  expect(positions.rtl).not.toContain("100%");
});

test("a submenu opens toward the reading direction", async ({ page }) => {
  await page.evaluate(() => document.documentElement.setAttribute("dir", "rtl"));
  await page.click("#rich-trigger");
  await page.mouse.move(0, 0);
  await page.locator("#sub-trigger").focus();
  await page.keyboard.press("ArrowRight");

  const submenu = page.locator("#sub-menu");
  await expect(submenu).toBeVisible();
  await submenu.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );

  const trigger = await page.locator("#sub-trigger").boundingBox();
  const panel = await submenu.boundingBox();

  // In RTL a submenu opens to the left of its parent.
  expect(panel!.x + panel!.width).toBeLessThanOrEqual(trigger!.x + trigger!.width + 1);
});

test("left to right is unaffected", async ({ page }) => {
  const [left, right] = await page.locator("#spinner-button").evaluate((element) => {
    const computed = getComputedStyle(element);
    return [Number.parseFloat(computed.paddingLeft), Number.parseFloat(computed.paddingRight)];
  });

  // The spinner is an inline-start icon on an LTR page, so the left side tightens.
  expect(left).toBeLessThan(right);
});
