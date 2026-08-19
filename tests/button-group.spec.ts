import { expect, test, type Locator } from "@playwright/test";

/**
 * A button group's whole job is geometry: flatten the inner corners, collapse the
 * shared edges to one border, and keep a focused control's ring whole.
 */

const LAB = "/tests/lab.html";

test.beforeEach(async ({ page }) => {
  await page.goto(LAB);
});

function radii(locator: Locator) {
  return locator.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      topLeft: Number.parseFloat(computed.borderTopLeftRadius),
      topRight: Number.parseFloat(computed.borderTopRightRadius),
      bottomLeft: Number.parseFloat(computed.borderBottomLeftRadius),
      bottomRight: Number.parseFloat(computed.borderBottomRightRadius),
    };
  });
}

test.describe("horizontal", () => {
  test("only the outer corners stay round", async ({ page }) => {
    const first = await radii(page.locator("#group-first"));
    const middle = await radii(page.locator("#group-middle"));
    const last = await radii(page.locator("#group-last"));

    expect(first.topLeft).toBeGreaterThan(0);
    expect(first.topRight).toBe(0);

    expect(middle.topLeft).toBe(0);
    expect(middle.topRight).toBe(0);

    expect(last.topLeft).toBe(0);
    expect(last.topRight).toBeGreaterThan(0);
  });

  test("the shared edges collapse to a single border", async ({ page }) => {
    const borderLeft = (selector: string) =>
      page
        .locator(selector)
        .evaluate((element) => Number.parseFloat(getComputedStyle(element).borderLeftWidth));

    expect(await borderLeft("#group-first")).toBeGreaterThan(0);
    expect(await borderLeft("#group-middle")).toBe(0);
    expect(await borderLeft("#group-last")).toBe(0);
  });

  test("the controls sit flush", async ({ page }) => {
    const first = await page.locator("#group-first").boundingBox();
    const middle = await page.locator("#group-middle").boundingBox();

    expect(Math.abs(middle!.x - (first!.x + first!.width))).toBeLessThanOrEqual(1);
    expect(Math.abs(middle!.y - first!.y)).toBeLessThanOrEqual(1);
  });
});

test.describe("vertical", () => {
  test("stacks and rounds only the outer edges", async ({ page }) => {
    const first = await radii(page.locator("#group-v-first"));
    const last = await radii(page.locator("#group-v-last"));

    expect(first.topLeft).toBeGreaterThan(0);
    expect(first.bottomLeft).toBe(0);
    expect(last.topLeft).toBe(0);
    expect(last.bottomLeft).toBeGreaterThan(0);
  });

  test("the controls stack rather than sit in a row", async ({ page }) => {
    const first = await page.locator("#group-v-first").boundingBox();
    const last = await page.locator("#group-v-last").boundingBox();

    expect(last!.y).toBeGreaterThan(first!.y);
    expect(Math.abs(last!.x - first!.x)).toBeLessThanOrEqual(1);
  });
});

test("a focused control lifts above its neighbours so its ring stays whole", async ({ page }) => {
  const middle = page.locator("#group-middle");

  const resting = await middle.evaluate((element) => getComputedStyle(element).zIndex);
  await middle.evaluate((element) => (element as HTMLElement).focus());
  const focused = await middle.evaluate((element) => getComputedStyle(element).zIndex);

  expect(resting).toBe("auto");
  expect(Number.parseInt(focused, 10)).toBeGreaterThan(0);
});

test("group text shares the group's shape and is not a control", async ({ page }) => {
  const text = page.locator("#group-text");

  await expect(text).toHaveJSProperty("tagName", "SPAN");
  const corners = await radii(text);
  expect(corners.topLeft).toBeGreaterThan(0);
  expect(corners.topRight).toBe(0);
});

test("an input in a group takes the free space", async ({ page }) => {
  const group = await page.locator("#group-text-wrap").boundingBox();
  const text = await page.locator("#group-text").boundingBox();
  const input = await page.locator("#group-input").boundingBox();

  expect(input!.width).toBeGreaterThan(text!.width);
  expect(Math.abs(input!.x + input!.width - (group!.x + group!.width))).toBeLessThanOrEqual(1);
});
