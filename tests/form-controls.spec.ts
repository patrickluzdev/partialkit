import { expect, test, type Locator } from "@playwright/test";

/**
 * Checkbox, radio, switch and slider are styled native inputs, so most of what
 * matters is that the platform behaviour survived the styling — and that the two
 * things the platform cannot express in markup (indeterminate, a painted fill)
 * are filled in.
 */

const LAB = "/tests/lab.html";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(LAB);
});

async function settle(locator: Locator) {
  await locator.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
}

test.describe("checkbox", () => {
  test("toggles from the label, not just the box", async ({ page }) => {
    const box = page.locator("#control-checkbox");
    await expect(box).not.toBeChecked();

    await page.click("#control-checkbox-label-text");
    await expect(box).toBeChecked();
  });

  test("space toggles it", async ({ page }) => {
    const box = page.locator("#control-checkbox");

    await box.focus();
    await page.keyboard.press("Space");
    await expect(box).toBeChecked();
  });

  test("the checked box paints a mark", async ({ page }) => {
    const box = page.locator("#control-checkbox");

    const before = await box.evaluate((el) => getComputedStyle(el).backgroundImage);
    await box.check();
    await settle(box);
    const after = await box.evaluate((el) => getComputedStyle(el).backgroundImage);

    expect(before).toBe("none");
    expect(after).not.toBe("none");
  });

  test("data-indeterminate reaches the DOM property", async ({ page }) => {
    const box = page.locator("#control-checkbox-indeterminate");

    await expect(box).toHaveJSProperty("indeterminate", true);
    // The third state is not a value: it must not submit as checked.
    await expect(box).not.toBeChecked();
  });

  test("toggling resolves the third state", async ({ page }) => {
    const box = page.locator("#control-checkbox-indeterminate");

    await box.click();

    await expect(box).toHaveJSProperty("indeterminate", false);
    await expect(box).toBeChecked();
  });

  test("setting the attribute later still works", async ({ page }) => {
    const box = page.locator("#control-checkbox");

    await box.evaluate((element) => element.setAttribute("data-indeterminate", ""));
    await expect(box).toHaveJSProperty("indeterminate", true);
  });

  test("disabled refuses input", async ({ page }) => {
    await expect(page.locator("#control-checkbox-disabled")).toBeDisabled();
  });
});

test.describe("radio", () => {
  test("the name attribute makes one group", async ({ page }) => {
    const first = page.locator("#control-radio-a");
    const second = page.locator("#control-radio-b");

    await expect(first).toBeChecked();
    await second.check();

    await expect(second).toBeChecked();
    await expect(first).not.toBeChecked();
  });

  test("arrow keys move and select within the group", async ({ page }) => {
    const first = page.locator("#control-radio-a");
    const second = page.locator("#control-radio-b");

    await first.focus();
    await page.keyboard.press("ArrowDown");

    await expect(second).toBeChecked();
    await expect(second).toBeFocused();
  });

  test("the checked radio paints a dot", async ({ page }) => {
    const radio = page.locator("#control-radio-b");

    const before = await radio.evaluate((el) => getComputedStyle(el).backgroundImage);
    await radio.check();
    const after = await radio.evaluate((el) => getComputedStyle(el).backgroundImage);

    expect(before).toBe("none");
    expect(after).toContain("gradient");
  });
});

test.describe("switch", () => {
  test("announces itself as a switch", async ({ page }) => {
    await expect(page.locator("#control-switch")).toHaveAttribute("role", "switch");
  });

  test("toggles and moves its thumb", async ({ page }) => {
    const control = page.locator("#control-switch");

    const off = await control.evaluate((el) => getComputedStyle(el).backgroundPositionX);
    await control.check();
    await settle(control);
    const on = await control.evaluate((el) => getComputedStyle(el).backgroundPositionX);

    await expect(control).toBeChecked();
    expect(on).not.toBe(off);
  });

  test("the small size has a shorter track", async ({ page }) => {
    const normal = await page.locator("#control-switch").boundingBox();
    const small = await page.locator("#control-switch-sm").boundingBox();

    expect(small!.width).toBeLessThan(normal!.width);
    expect(small!.height).toBeLessThan(normal!.height);
  });

  test("space toggles it", async ({ page }) => {
    const control = page.locator("#control-switch");

    await control.focus();
    await page.keyboard.press("Space");
    await expect(control).toBeChecked();
  });
});

test.describe("slider", () => {
  test("the fill follows the value", async ({ page }) => {
    const slider = page.locator("#control-slider");

    const fill = () => slider.evaluate((el) => getComputedStyle(el).getPropertyValue("--slider-fill"));

    // 40 of 0..100 on load.
    expect(Number.parseFloat(await fill())).toBeCloseTo(40, 0);

    await slider.fill("80");
    expect(Number.parseFloat(await fill())).toBeCloseTo(80, 0);
  });

  test("it accounts for min and max, not just the raw value", async ({ page }) => {
    const slider = page.locator("#control-slider-offset");

    // 15 of 10..20 is halfway.
    const fill = await slider.evaluate((el) =>
      getComputedStyle(el).getPropertyValue("--slider-fill"),
    );
    expect(Number.parseFloat(fill)).toBeCloseTo(50, 0);
  });

  test("arrow keys move by the step", async ({ page }) => {
    const slider = page.locator("#control-slider-offset");

    await slider.focus();
    await page.keyboard.press("ArrowRight");

    await expect(slider).toHaveValue("16");
  });

  test("disabled refuses input", async ({ page }) => {
    await expect(page.locator("#control-slider-disabled")).toBeDisabled();
  });
});

test.describe("choice card", () => {
  test("a label wrapping a field becomes a bordered card", async ({ page }) => {
    const card = page.locator("#choice-card-first");

    const width = await card.evaluate((el) => Number.parseFloat(getComputedStyle(el).borderTopWidth));
    expect(width).toBeGreaterThan(0);
  });

  test("the checked one is highlighted, and only that one", async ({ page }) => {
    const first = page.locator("#choice-card-first");
    const second = page.locator("#choice-card-second");

    const background = (locator: Locator) =>
      locator.evaluate((el) => getComputedStyle(el).backgroundColor);

    const checked = await background(first);
    const unchecked = await background(second);
    expect(checked).not.toBe(unchecked);

    await page.locator("#choice-radio-second").check();
    // The pointer is left over the card by check(), and hover outranks checked —
    // the same order shadcn/ui has. Move away to read the resting state.
    await page.mouse.move(0, 0);
    await settle(second);

    expect(await background(second)).toBe(checked);
    expect(await background(first)).toBe(unchecked);
  });
});
