import { expect, test } from "@playwright/test";

const LAB = "/tests/lab.html";
const TRANSPARENT = /rgba\(0, 0, 0, 0\)|transparent/;

test.beforeEach(async ({ page }) => {
  await page.goto(LAB);
});

// The control inherits the page surface, but the native popup paints options
// directly: a transparent option is invisible until the pointer highlights it.
for (const theme of ["light", "dark"] as const) {
  test(`options stay opaque in ${theme} mode`, async ({ page }) => {
    await page.click(`#theme-${theme}`);

    const background = await page
      .locator("#lab-select option")
      .first()
      .evaluate((option) => getComputedStyle(option).backgroundColor);

    expect(background).not.toMatch(TRANSPARENT);
  });
}

test("options follow the theme", async ({ page }) => {
  const read = () =>
    page
      .locator("#lab-select option")
      .first()
      .evaluate((option) => getComputedStyle(option).backgroundColor);

  await page.click("#theme-light");
  const light = await read();

  await page.click("#theme-dark");
  const dark = await read();

  expect(light).not.toBe(dark);
});
