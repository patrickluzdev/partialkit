import { expect, test } from "@playwright/test";

const LAB = "/tests/lab.html";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(LAB);
});

test("is the browser's own scroller, restyled", async ({ page }) => {
  const area = page.locator("#lab-scroll-area");

  await expect(area).toHaveCSS("overflow-y", "auto");
  await expect(area).toHaveAttribute("tabindex", "0");

  await area.evaluate((element) => element.scrollBy(0, 100));
  expect(await area.evaluate((element) => element.scrollTop)).toBe(100);
});

test("themes the bar with the border token", async ({ page, browserName }) => {
  // Each engine exposes a different half of this. WebKit has no
  // `scrollbar-color` and takes `::-webkit-scrollbar` instead, which no computed
  // style reports; the visual baselines are what cover it there.
  test.skip(browserName === "webkit", "WebKit themes scrollbars through a pseudo-element only");

  await expect(page.locator("#lab-scroll-area")).toHaveCSS("scrollbar-color", /oklch|rgb/);
});

test("scrolls from the keyboard, because it is focusable", async ({ page }) => {
  await page.locator("#lab-scroll-area").focus();
  await page.keyboard.press("PageDown");

  // Chromium animates a keyboard scroll, so the position settles a frame later.
  await expect
    .poll(() => page.locator("#lab-scroll-area").evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
});

test("hiding the bar keeps the scrolling", async ({ page }) => {
  const area = page.locator("#lab-scroll-area-hidden");

  await expect(area).toHaveCSS("overflow-y", "auto");

  await area.evaluate((element) => element.scrollBy(0, 120));
  expect(await area.evaluate((element) => element.scrollTop)).toBe(120);
});
