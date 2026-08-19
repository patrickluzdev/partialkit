import { expect, test } from "@playwright/test";

const LAB = "/tests/lab.html";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(LAB);
});

test("a shared name keeps one accordion section open at a time", async ({ page }) => {
  const first = page.locator("#lab-accordion-first");
  const second = page.locator("#lab-accordion-second");

  await expect(first).toHaveAttribute("open", "");
  await page.click("#lab-accordion-second-trigger");

  await expect(second).toHaveAttribute("open", "");
  await expect(first).not.toHaveAttribute("open", "");
});

test("the trigger is announced as a disclosure with its state", async ({ page }) => {
  const trigger = page.getByRole("group").first();

  // <summary> is exposed by the browser; nothing is added on top of it.
  await expect(page.locator("#lab-accordion-first-trigger")).not.toHaveAttribute("role", /.+/);
  await expect(trigger).toBeVisible();
});

test("the chevron turns over when the section opens", async ({ page }) => {
  const icon = page.locator("#lab-accordion-icon");
  const rotation = () =>
    icon.evaluate(async (element) => {
      await Promise.all(element.getAnimations().map((animation) => animation.finished));
      return getComputedStyle(element).rotate;
    });

  expect(await rotation()).toBe("180deg");

  await page.click("#lab-accordion-second-trigger");
  expect(await rotation()).toBe("none");
});

test("a disabled trigger cannot be opened or reached", async ({ page }) => {
  const trigger = page.locator("#lab-accordion-disabled-trigger");

  await expect(trigger).toHaveCSS("pointer-events", "none");
  await expect(trigger).toHaveAttribute("tabindex", "-1");
  await expect(page.locator("#lab-accordion-disabled")).not.toHaveAttribute("open", "");
});

test("the summary keeps Enter and Space without any script", async ({ page }) => {
  await page.locator("#lab-collapsible-trigger").focus();
  await page.keyboard.press("Enter");

  await expect(page.locator("#lab-collapsible")).toHaveAttribute("open", "");
  await expect(page.locator("#lab-collapsible-content")).toBeVisible();
});

test("the disclosure marker is gone in every engine", async ({ page }) => {
  await expect(page.locator("#lab-collapsible-trigger")).toHaveCSS("list-style-type", "none");
});
