import { expect, test } from "@playwright/test";

const LAB = "/tests/lab.html";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(LAB);
});

test("applies the tab pattern and selects the first tab", async ({ page }) => {
  await expect(page.locator("#lab-tabs-list")).toHaveAttribute("role", "tablist");
  await expect(page.locator("#lab-tab-one")).toHaveAttribute("role", "tab");
  await expect(page.locator("#lab-tab-one")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#lab-tab-two")).toHaveAttribute("aria-selected", "false");

  await expect(page.locator("#lab-panel-one")).toHaveAttribute("role", "tabpanel");
  await expect(page.locator("#lab-panel-one")).toHaveAttribute("aria-labelledby", "lab-tab-one");
  await expect(page.locator("#lab-panel-one")).toBeVisible();
  await expect(page.locator("#lab-panel-two")).toBeHidden();
});

test("pairs triggers and panels in order, without ids in the markup", async ({ page }) => {
  await expect(page.locator("#lab-tab-one")).toHaveAttribute("aria-controls", "lab-panel-one");
  await expect(page.locator("#lab-tab-two")).toHaveAttribute("aria-controls", "lab-panel-two");
});

test("the whole list is one stop in the tab order", async ({ page }) => {
  await expect(page.locator("#lab-tab-one")).toHaveAttribute("tabindex", "0");
  await expect(page.locator("#lab-tab-two")).toHaveAttribute("tabindex", "-1");

  await page.click("#lab-tab-two");

  await expect(page.locator("#lab-tab-two")).toHaveAttribute("tabindex", "0");
  await expect(page.locator("#lab-tab-one")).toHaveAttribute("tabindex", "-1");
});

test("arrows move and select, and skip a disabled tab", async ({ page }) => {
  await page.locator("#lab-tab-one").focus();
  await page.keyboard.press("ArrowRight");

  await expect(page.locator("#lab-tab-two")).toBeFocused();
  await expect(page.locator("#lab-panel-two")).toBeVisible();

  // Three is disabled, so the next step wraps back to the first.
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#lab-tab-one")).toBeFocused();
});

test("Home and End reach the ends", async ({ page }) => {
  await page.locator("#lab-tab-one").focus();
  await page.keyboard.press("End");
  await expect(page.locator("#lab-tab-two")).toBeFocused();

  await page.keyboard.press("Home");
  await expect(page.locator("#lab-tab-one")).toBeFocused();
});

test("manual activation moves focus without switching the panel", async ({ page }) => {
  await page.locator("#lab-manual-one").focus();
  await page.keyboard.press("ArrowRight");

  await expect(page.locator("#lab-manual-two")).toBeFocused();
  await expect(page.locator("#lab-manual-two")).toHaveAttribute("aria-selected", "false");

  await page.keyboard.press("Enter");
  await expect(page.locator("#lab-manual-two")).toHaveAttribute("aria-selected", "true");
});

test("a vertical list moves with the up and down arrows", async ({ page }) => {
  await expect(page.locator("#lab-tabs-vertical")).toHaveAttribute("data-orientation", "vertical");

  await page.locator("#lab-vertical-one").focus();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#lab-vertical-two")).toBeFocused();

  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#lab-vertical-two")).toBeFocused();
});

test("selecting a tab announces which one", async ({ page }) => {
  const value = page.evaluate(
    () =>
      new Promise<string>((resolve) => {
        document.getElementById("lab-tabs")!.addEventListener(
          "pk:tabs:change",
          (event) => resolve((event as CustomEvent<{ value: string }>).detail.value),
          { once: true },
        );
      }),
  );

  await page.click("#lab-tab-two");
  expect(await value).toBe("two");
});

test("a disabled tab stays announced rather than disappearing", async ({ page }) => {
  await expect(page.locator("#lab-tab-three")).toBeVisible();
  await expect(page.locator("#lab-tab-three")).toHaveAttribute("aria-disabled", "true");
});
