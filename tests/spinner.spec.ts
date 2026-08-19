import { expect, test } from "@playwright/test";

const LAB = "/tests/lab.html";

test.beforeEach(async ({ page }) => {
  await page.goto(LAB);
});

test("announces itself as a status", async ({ page }) => {
  const spinner = page.locator("#spinner");

  await expect(spinner).toHaveAttribute("role", "status");
  await expect(spinner).toHaveAttribute("aria-label", "Loading");
});

test("actually spins", async ({ page }) => {
  const animation = await page.locator("#spinner").evaluate((element) => {
    const [running] = element.getAnimations();
    return running ? { playState: running.playState, name: getComputedStyle(element).animationName } : null;
  });

  expect(animation).not.toBeNull();
  expect(animation!.playState).toBe("running");
  expect(animation!.name).not.toBe("none");
});

test("slows right down under reduced motion", async ({ page }) => {
  const duration = () =>
    page
      .locator("#spinner")
      .evaluate((element) => Number.parseFloat(getComputedStyle(element).animationDuration));

  const normal = await duration();

  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(await duration()).toBeGreaterThan(normal);
});

test("inside a button it is hidden from the reader and the button is disabled", async ({ page }) => {
  // The button's own text already says what is happening; announcing the spinner
  // as well would say it twice.
  await expect(page.locator("#spinner-in-button")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#spinner-button")).toBeDisabled();
});

test("its icon slot tightens the button padding like any other icon", async ({ page }) => {
  const withSpinner = await page
    .locator("#spinner-button")
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingLeft));
  const plain = await page
    .locator("#state-default")
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingLeft));

  expect(withSpinner).toBeLessThan(plain);
});
