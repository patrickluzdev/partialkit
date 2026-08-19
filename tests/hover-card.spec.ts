import { expect, test } from "@playwright/test";

const LAB = "/tests/lab.html";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(LAB);
});

test("is a surface, not a description of the link", async ({ page }) => {
  await expect(page.locator("#lab-hover-card")).toHaveAttribute("role", "dialog");
  await expect(page.locator("#lab-hover-card")).toHaveAttribute("aria-labelledby", "lab-hover-title");
  // The trigger stays a link: it navigates, and nothing was expanded.
  await expect(page.locator("#lab-hover-trigger")).not.toHaveAttribute("aria-expanded", /.+/);
  await expect(page.locator("#lab-hover-trigger")).not.toHaveAttribute("aria-describedby", /.+/);
});

test("opens on hover and closes when the pointer leaves", async ({ page }) => {
  await page.hover("#lab-hover-trigger");
  await expect(page.locator("#lab-hover-card")).toBeVisible();

  await page.mouse.move(0, 0);
  await expect(page.locator("#lab-hover-card")).toBeHidden();
});

test("survives the trip from the link into the card", async ({ page }) => {
  await page.hover("#lab-hover-trigger");
  await expect(page.locator("#lab-hover-card")).toBeVisible();

  await page.hover("#lab-hover-link");
  await page.waitForTimeout(400);

  await expect(page.locator("#lab-hover-card")).toBeVisible();
});

test("opens on focus, for someone reaching the link by keyboard", async ({ page }) => {
  await page.locator("#lab-hover-trigger").focus();
  await expect(page.locator("#lab-hover-card")).toBeVisible();
  // Focus stays on the link: moving it would trap someone tabbing past.
  await expect(page.locator("#lab-hover-trigger")).toBeFocused();
});

test("Escape closes it", async ({ page }) => {
  await page.locator("#lab-hover-trigger").focus();
  await expect(page.locator("#lab-hover-card")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.locator("#lab-hover-card")).toBeHidden();
});

test("sits under the link it previews", async ({ page }) => {
  await page.hover("#lab-hover-trigger");
  await expect(page.locator("#lab-hover-card")).toBeVisible();
  await page
    .locator("#lab-hover-card")
    .evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));

  const trigger = (await page.locator("#lab-hover-trigger").boundingBox())!;
  const card = (await page.locator("#lab-hover-card").boundingBox())!;

  expect(card.y).toBeGreaterThan(trigger.y);
  await expect(page.locator("#lab-hover-card")).toHaveAttribute("data-side", "bottom");
});
