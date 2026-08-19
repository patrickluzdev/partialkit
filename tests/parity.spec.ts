import { expect, test, type Locator } from "@playwright/test";

/**
 * Locks the pieces partialkit added to match shadcn/ui's anatomy: the full button
 * size scale, the badge variants, the alert and card actions, field states and the
 * dialog's corner dismiss.
 */

const LAB = "/tests/lab.html";

test.beforeEach(async ({ page }) => {
  await page.goto(LAB);
});

function size(locator: Locator) {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });
}

test.describe("button sizes", () => {
  test("cover the scale from smallest to largest", async ({ page }) => {
    const heights: number[] = [];
    for (const id of ["#btn-xs", "#btn-sm", "#btn-default", "#btn-lg"]) {
      heights.push((await size(page.locator(id))).height);
    }

    expect(heights).toEqual([...heights].sort((a, b) => a - b));
    expect(new Set(heights).size).toBe(4);
  });

  test("icon sizes are square and match their text counterparts", async ({ page }) => {
    const pairs = [
      ["#btn-icon-xs", "#btn-xs"],
      ["#btn-icon-sm", "#btn-sm"],
      ["#btn-icon", "#btn-default"],
      ["#btn-icon-lg", "#btn-lg"],
    ];

    for (const [icon, text] of pairs) {
      const iconSize = await size(page.locator(icon!));
      const textSize = await size(page.locator(text!));

      expect(Math.abs(iconSize.width - iconSize.height), `${icon} is square`).toBeLessThanOrEqual(1);
      expect(Math.abs(iconSize.height - textSize.height), `${icon} matches ${text}`).toBeLessThanOrEqual(1);
    }
  });
});

test.describe("badge variants", () => {
  test("all six render distinctly", async ({ page }) => {
    const ids = [
      "#badge-default",
      "#badge-secondary",
      "#badge-destructive",
      "#badge-outline",
      "#badge-ghost",
      "#badge-link",
    ];

    const styles: string[] = [];
    for (const id of ids) {
      styles.push(
        await page.locator(id).evaluate((element) => {
          const computed = getComputedStyle(element);
          return [computed.backgroundColor, computed.color, computed.borderColor].join("|");
        }),
      );
    }

    expect(new Set(styles).size).toBeGreaterThanOrEqual(5);
  });

  test("the link variant uses the primary colour", async ({ page }) => {
    const color = await page.locator("#badge-link").evaluate((el) => getComputedStyle(el).color);
    const primary = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--primary").trim(),
    );

    expect(color).toBe(primary);
  });
});

test.describe("alert action", () => {
  test("sits at the trailing edge of the first row", async ({ page }) => {
    const alert = await page.locator("#alert-with-action").boundingBox();
    const action = await page.locator("#alert-action").boundingBox();
    const title = await page.locator("#alert-title").boundingBox();

    expect(action!.x + action!.width).toBeLessThanOrEqual(alert!.x + alert!.width + 1);
    expect(action!.x).toBeGreaterThan(title!.x + title!.width);
    expect(Math.abs(action!.y - title!.y)).toBeLessThan(alert!.height);
  });

  test("leaves the icon column intact", async ({ page }) => {
    const icon = await page.locator("#alert-with-action > svg").boundingBox();
    const title = await page.locator("#alert-title").boundingBox();

    expect(title!.x).toBeGreaterThan(icon!.x);
  });
});

test.describe("card size", () => {
  // --card-spacing holds a calc(), which computes to a token stream rather than a
  // length, so the rendered result is what gets asserted.
  const metrics = (locator: Locator) =>
    locator.evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        gap: Number.parseFloat(computed.rowGap),
        paddingBlock: Number.parseFloat(computed.paddingTop),
      };
    });

  test("one variable tightens the whole card at once", async ({ page }) => {
    const normal = await metrics(page.locator("#card-default"));
    const small = await metrics(page.locator("#card-sm"));

    expect(normal.gap).toBeGreaterThan(small.gap);
    expect(normal.paddingBlock).toBeGreaterThan(small.paddingBlock);
  });

  test("the inline padding of every section follows it", async ({ page }) => {
    const padding = (id: string) =>
      page.locator(id).evaluate((element) => Number.parseFloat(getComputedStyle(element).paddingLeft));

    expect(await padding("#card-content-default")).toBeGreaterThan(await padding("#card-content-sm"));
  });

  test("the action sits in the header's trailing column", async ({ page }) => {
    const card = await page.locator("#card-default").boundingBox();
    const action = await page.locator("#card-action").boundingBox();

    expect(action!.x + action!.width).toBeLessThanOrEqual(card!.x + card!.width + 1);
    expect(action!.x).toBeGreaterThan(card!.x + card!.width / 2);
  });
});

test.describe("field", () => {
  test("horizontal orientation puts the label beside the control", async ({ page }) => {
    const label = await page.locator("#field-horizontal .label").boundingBox();
    const input = await page.locator("#field-h-input").boundingBox();

    expect(input!.x).toBeGreaterThan(label!.x + label!.width - 1);
    expect(Math.abs(input!.y - label!.y)).toBeLessThan(input!.height);
  });

  test("data-invalid marks the block, not just the control", async ({ page }) => {
    // Compared against the error message rather than the raw token: engines
    // serialise oklch() with different precision.
    const color = (selector: string) =>
      page.locator(selector).evaluate((element) => getComputedStyle(element).color);

    const [label, error, healthy] = [
      await color("#field-invalid .label"),
      await color("#field-invalid .field-error"),
      await color("#field-horizontal .label"),
    ];

    expect(label).toBe(error);
    expect(label).not.toBe(healthy);
  });

  test("a disabled control dims its own label", async ({ page }) => {
    const opacity = await page
      .locator("#field-disabled .label")
      .evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity));

    expect(opacity).toBeLessThan(1);
  });

  test("a fieldset keeps its legend", async ({ page }) => {
    await expect(page.locator("legend.field-legend")).toHaveText("Account");
    await expect(page.locator("fieldset.field-set")).toBeVisible();
  });
});

test.describe("dialog close button", () => {
  test("closes the dialog and carries a name", async ({ page }) => {
    await page.click("#open-closable");
    await expect(page.locator("#closable")).toBeVisible();
    await expect(page.locator("#closable-x")).toHaveAttribute("aria-label", "Close");

    await page.click("#closable-x");
    await expect(page.locator("#closable")).toBeHidden();
  });

  test("sits in the dialog's top corner", async ({ page }) => {
    await page.click("#open-closable");

    const dialog = await page.locator("#closable").boundingBox();
    const close = await page.locator("#closable-x").boundingBox();

    expect(close!.x).toBeGreaterThan(dialog!.x + dialog!.width / 2);
    expect(close!.y).toBeLessThan(dialog!.y + dialog!.height / 2);
  });
});
