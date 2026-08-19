import { expect, test, type Page } from "@playwright/test";

const LAB = "/tests/lab.html";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(LAB);
});

async function open(page: Page, trigger: string, panel: string) {
  await page.click(trigger);
  await expect(page.locator(panel)).toBeVisible();
  await page
    .locator(panel)
    .evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));
}

test("wires the panel to its trigger before it is ever opened", async ({ page }) => {
  const trigger = page.locator("#lab-popover-trigger");

  await expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
  await expect(trigger).toHaveAttribute("aria-controls", "lab-popover");
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#lab-popover")).toHaveAttribute("role", "dialog");
});

test("names and describes itself from its own header", async ({ page }) => {
  const panel = page.locator("#lab-popover");

  await expect(panel).toHaveAttribute("aria-labelledby", "lab-popover-title");
  await expect(panel).toHaveAttribute("aria-describedby", "lab-popover-description");
});

test("opening focuses the first control inside", async ({ page }) => {
  await open(page, "#lab-popover-trigger", "#lab-popover");

  await expect(page.locator("#lab-popover-input")).toBeFocused();
  await expect(page.locator("#lab-popover-trigger")).toHaveAttribute("aria-expanded", "true");
});

test("sits under its trigger, on the side it was asked for", async ({ page }) => {
  await open(page, "#lab-popover-trigger", "#lab-popover");

  const trigger = await page.locator("#lab-popover-trigger").boundingBox();
  const panel = await page.locator("#lab-popover").boundingBox();

  expect(panel!.y).toBeGreaterThan(trigger!.y + trigger!.height - 1);
  await expect(page.locator("#lab-popover")).toHaveAttribute("data-side", "bottom");
});

test("Escape closes it and hands focus back", async ({ page }) => {
  await open(page, "#lab-popover-trigger", "#lab-popover");
  await page.keyboard.press("Escape");

  await expect(page.locator("#lab-popover")).toBeHidden();
  await expect(page.locator("#lab-popover-trigger")).toBeFocused();
  await expect(page.locator("#lab-popover-trigger")).toHaveAttribute("aria-expanded", "false");
});

test("clicking away closes it and hands focus back", async ({ page }) => {
  await open(page, "#lab-popover-trigger", "#lab-popover");
  await page.mouse.click(5, 5);

  await expect(page.locator("#lab-popover")).toBeHidden();
  await expect(page.locator("#lab-popover-trigger")).toBeFocused();
});

test("tabbing out of it does not trap, because it is not modal", async ({ page }) => {
  await open(page, "#lab-popover-trigger", "#lab-popover");
  await page.keyboard.press("Tab");

  await expect(page.locator("#lab-popover-input")).not.toBeFocused();
});

test("a bare side centres on the trigger", async ({ page }) => {
  await page.locator("#lab-popover").evaluate((element) => {
    element.setAttribute("data-pk-placement", "right");
  });
  await open(page, "#lab-popover-trigger", "#lab-popover");

  const trigger = (await page.locator("#lab-popover-trigger").boundingBox())!;
  const panel = (await page.locator("#lab-popover").boundingBox())!;

  const triggerMiddle = trigger.y + trigger.height / 2;
  const panelMiddle = panel.y + panel.height / 2;
  expect(Math.abs(panelMiddle - triggerMiddle)).toBeLessThanOrEqual(1);
  expect(panel.x).toBeGreaterThanOrEqual(trigger.x + trigger.width);
});

test("a -start side lines its top edge up with the trigger", async ({ page }) => {
  await page.locator("#lab-popover").evaluate((element) => {
    element.setAttribute("data-pk-placement", "right-start");
  });
  await open(page, "#lab-popover-trigger", "#lab-popover");

  const trigger = (await page.locator("#lab-popover-trigger").boundingBox())!;
  const panel = (await page.locator("#lab-popover").boundingBox())!;

  expect(Math.abs(panel.y - trigger.y)).toBeLessThanOrEqual(1);
});
