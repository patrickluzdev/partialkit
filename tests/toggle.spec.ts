import { expect, test } from "@playwright/test";

const LAB = "/tests/lab.html";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(LAB);
});

test("a pressed button flips its own state, because nothing else will", async ({ page }) => {
  const toggle = page.locator("#lab-toggle");

  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
});

test("the pressed state is what the styling reads", async ({ page }) => {
  const off = await page.locator("#lab-toggle").evaluate((el) => getComputedStyle(el).backgroundColor);
  await page.locator("#lab-toggle").click();
  // Move away: hover paints the same surface, which would hide a broken state.
  await page.mouse.move(0, 0);
  const on = await page.locator("#lab-toggle").evaluate((el) => getComputedStyle(el).backgroundColor);

  expect(on).not.toBe(off);
});

test("announces each press", async ({ page }) => {
  const detail = page.evaluate(
    () =>
      new Promise<{ pressed: boolean; value: string }>((resolve) => {
        document.getElementById("lab-toggle-on")!.addEventListener(
          "pk:toggle:change",
          (event) => resolve((event as CustomEvent<{ pressed: boolean; value: string }>).detail),
          { once: true },
        );
      }),
  );

  await page.click("#lab-toggle-on");
  expect(await detail).toEqual({ pressed: false, value: "italic" });
});

test("a disabled toggle stays put", async ({ page }) => {
  await page.locator("#lab-toggle-disabled").click({ force: true });
  await expect(page.locator("#lab-toggle-disabled")).toHaveAttribute("aria-pressed", "false");
});

test("a controlled toggle is left to its owner", async ({ page }) => {
  await page.click("#lab-toggle-controlled");
  await expect(page.locator("#lab-toggle-controlled")).toHaveAttribute("aria-pressed", "false");
});

test("the checkbox form toggles itself, with no runtime involved", async ({ page }) => {
  const input = page.locator("#lab-toggle-input");

  await page.click("#lab-toggle-checkbox");
  await expect(input).toBeChecked();
  await expect(page.locator("#lab-toggle-checkbox")).not.toHaveAttribute("aria-pressed", /.+/);
});
