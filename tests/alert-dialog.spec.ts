import { expect, test } from "@playwright/test";

/**
 * An alert dialog differs from a dialog in what it refuses to do: it has no
 * dismiss control, the backdrop does not close it, and it announces itself as an
 * interruption.
 */

const LAB = "/tests/lab.html";

test.beforeEach(async ({ page }) => {
  await page.goto(LAB);
});

test("announces itself as an alert dialog", async ({ page }) => {
  await expect(page.locator("#alert-basic")).toHaveAttribute("role", "alertdialog");
});

test("labels itself from its own title and description", async ({ page }) => {
  const dialog = page.locator("#alert-basic");

  await expect(dialog).toHaveAttribute("aria-labelledby", "alert-dialog-title");
  await expect(dialog).toHaveAttribute("aria-describedby", "alert-dialog-description");
});

test("opens as a modal and moves focus inside", async ({ page }) => {
  await page.click("#open-alert");

  const dialog = page.locator("#alert-basic");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveJSProperty("open", true);
  await expect(dialog).toHaveAttribute("data-state", "open");

  const inside = await page.evaluate(() =>
    document.getElementById("alert-basic")?.contains(document.activeElement),
  );
  expect(inside).toBe(true);
});

test("the backdrop does not dismiss it", async ({ page }) => {
  await page.click("#open-alert");
  await expect(page.locator("#alert-basic")).toBeVisible();

  await page.mouse.click(5, 5);

  // A plain dialog would have closed here.
  await expect(page.locator("#alert-basic")).toBeVisible();
});

test("a plain dialog still dismisses on the backdrop", async ({ page }) => {
  await page.click("#open-basic");
  await page.mouse.click(5, 5);

  await expect(page.locator("#basic")).toBeHidden();
});

test("ships no dismiss control", async ({ page }) => {
  await expect(page.locator("#alert-basic .dialog-close")).toHaveCount(0);
  await expect(page.locator("#alert-basic [aria-label='Close']")).toHaveCount(0);
});

test("Escape closes it and counts as cancelling", async ({ page }) => {
  await page.click("#open-alert");
  await page.keyboard.press("Escape");

  await expect(page.locator("#alert-basic")).toBeHidden();
  expect(await page.locator("#alert-basic").evaluate((el) => (el as HTMLDialogElement).returnValue)).toBe(
    "",
  );
  await expect(page.locator("#open-alert")).toBeFocused();
});

test("confirming reports its value", async ({ page }) => {
  await page.click("#open-alert");

  const detail = page.evaluate(
    () =>
      new Promise<unknown>((resolve) => {
        document
          .getElementById("alert-basic")
          ?.addEventListener("pk:dialog:close", (event) => resolve((event as CustomEvent).detail), {
            once: true,
          });
      }),
  );

  await page.click("#alert-confirm");
  expect(await detail).toEqual({ returnValue: "confirm" });
});

test("cancel comes before confirm in the markup", async ({ page }) => {
  const order = await page.locator("#alert-basic .alert-dialog-footer button").allTextContents();

  expect(order[0]).toBe("Cancel");
  expect(order[1]).toBe("Delete");
});

test("the compact size splits its actions evenly", async ({ page }) => {
  await page.click("#open-alert-compact");
  const dialog = page.locator("#alert-compact");
  await expect(dialog).toBeVisible();
  // The panel scales in, so widths read before it settles are the animation.
  await dialog.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );

  const buttons = page.locator("#alert-compact-footer button");
  const first = await buttons.nth(0).boundingBox();
  const second = await buttons.nth(1).boundingBox();

  expect(Math.abs(first!.width - second!.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(first!.y - second!.y)).toBeLessThanOrEqual(1);
});

test("the compact size is narrower than the default one", async ({ page }) => {
  // Measured after the scale transition settles, or the reading is the animation.
  const widthOf = async (trigger: string, dialog: string) => {
    await page.click(trigger);
    const locator = page.locator(dialog);
    await expect(locator).toBeVisible();
    await locator.evaluate((element) =>
      Promise.all(element.getAnimations().map((animation) => animation.finished)),
    );
    const box = await locator.boundingBox();
    await page.keyboard.press("Escape");
    return box!.width;
  };

  const standard = await widthOf("#open-alert", "#alert-basic");
  const compact = await widthOf("#open-alert-compact", "#alert-compact");

  expect(compact).toBeLessThan(standard);
});
