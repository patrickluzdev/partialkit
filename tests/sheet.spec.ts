import { expect, test, type Page } from "@playwright/test";

const LAB = "/tests/lab.html";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(LAB);
});

/** Waits for the slide-in, so a bounding box is the resting one. */
async function settle(page: Page, selector: string) {
  await expect(page.locator(selector)).toBeVisible();
  await page
    .locator(selector)
    .evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
}

test("is modal, and says what it is", async ({ page }) => {
  await page.click("#lab-sheet-trigger");
  const sheet = page.locator("#lab-sheet");

  await expect(sheet).toBeVisible();
  await expect(sheet).toHaveAttribute("aria-labelledby", "lab-sheet-title");
  await expect(sheet).toHaveAttribute("aria-describedby", "lab-sheet-description");
  await expect(sheet).toHaveAttribute("data-state", "open");

  // showModal(), not show(): the page behind it is inert.
  const modal = await sheet.evaluate((element) => element.matches(":modal"));
  expect(modal).toBe(true);
});

test("pins itself to the side it was given", async ({ page }) => {
  const viewport = page.viewportSize()!;

  await page.click("#lab-sheet-trigger");
  await settle(page, "#lab-sheet");
  const right = await page.locator("#lab-sheet").boundingBox();
  expect(Math.round(right!.x + right!.width)).toBe(viewport.width);
  expect(Math.round(right!.height)).toBe(viewport.height);

  await page.keyboard.press("Escape");
  await expect(page.locator("#lab-sheet")).toBeHidden();

  await page.evaluate(() => (document.getElementById("lab-sheet-left") as HTMLDialogElement).showModal());
  await settle(page, "#lab-sheet-left");
  const left = await page.locator("#lab-sheet-left").boundingBox();
  expect(Math.round(left!.x)).toBe(0);

  await page.keyboard.press("Escape");
  await page.evaluate(() => (document.getElementById("lab-sheet-bottom") as HTMLDialogElement).showModal());
  await settle(page, "#lab-sheet-bottom");
  const bottom = await page.locator("#lab-sheet-bottom").boundingBox();
  expect(Math.round(bottom!.y + bottom!.height)).toBe(viewport.height);
  expect(Math.round(bottom!.width)).toBe(viewport.width);
});

test("Escape closes it and returns focus to the trigger", async ({ page }) => {
  await page.click("#lab-sheet-trigger");
  await expect(page.locator("#lab-sheet")).toBeVisible();

  await page.keyboard.press("Escape");

  await expect(page.locator("#lab-sheet")).toBeHidden();
  await expect(page.locator("#lab-sheet-trigger")).toBeFocused();
});

test("a close control carries its return value out", async ({ page }) => {
  await page.click("#lab-sheet-trigger");

  const closed = page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        document.getElementById("lab-sheet")!.addEventListener(
          "pk:dialog:close",
          (event) => resolve((event as CustomEvent<{ returnValue: string }>).detail.returnValue),
          { once: true },
        );
      }),
  );

  await page.click("#lab-sheet-save");
  expect(await closed).toBe("save");
});

test("clicking the backdrop closes it", async ({ page }) => {
  await page.click("#lab-sheet-trigger");
  await expect(page.locator("#lab-sheet")).toBeVisible();

  // The left edge of the screen is backdrop for a right-hand sheet.
  await page.mouse.click(5, 5);
  await expect(page.locator("#lab-sheet")).toBeHidden();
});
