import { expect, test, type Page } from "@playwright/test";

/**
 * The numbers, not the intent.
 *
 * Every expectation here was measured from ui.shadcn.com's own component demos
 * with the browser, rather than derived from reading their class strings — a
 * class list can be read wrong, a rendered box cannot. If shadcn/ui changes a
 * value, this fails and the change is deliberate rather than discovered later by
 * eye.
 *
 * Measured 2026-08-19 against /docs/components/base/*.
 */

const LAB = "/tests/lab.html";

test.skip(({ browserName }) => browserName !== "chromium", "layout metrics are engine-independent");

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(LAB);
});

interface Metrics {
  height: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  marginRight: number;
  marginBottom: number;
  gap: string;
  radius: number;
  fontSize: number;
  lineHeight: number;
}

/** A panel scales in, so its children measure short until it settles. */
async function settle(page: Page, selector: string) {
  await page
    .locator(selector)
    .evaluate((element) =>
      Promise.all(element.getAnimations().map((animation) => animation.finished)),
    );
}

async function metrics(page: Page, selector: string): Promise<Metrics> {
  return page.locator(selector).evaluate((element) => {
    const computed = getComputedStyle(element);
    const number = (value: string) => Number.parseFloat(value) || 0;

    return {
      height: Math.round(element.getBoundingClientRect().height),
      paddingTop: number(computed.paddingTop),
      paddingRight: number(computed.paddingRight),
      paddingBottom: number(computed.paddingBottom),
      paddingLeft: number(computed.paddingLeft),
      marginRight: number(computed.marginRight),
      marginBottom: number(computed.marginBottom),
      gap: computed.gap,
      radius: number(computed.borderTopLeftRadius),
      fontSize: number(computed.fontSize),
      lineHeight: number(computed.lineHeight),
    };
  });
}

test("button", async ({ page }) => {
  const button = await metrics(page, "#state-default");

  expect(button.height).toBe(32);
  expect(button.paddingLeft).toBe(10);
  expect(button.paddingRight).toBe(10);
  expect(button.gap).toBe("6px");
  expect(button.radius).toBe(10);
  expect(button.fontSize).toBe(14);
  expect(button.lineHeight).toBe(20);
});

test("badge", async ({ page }) => {
  const badge = await metrics(page, "#badge-default");

  expect(badge.height).toBe(20);
  expect(badge.paddingTop).toBe(2);
  expect(badge.paddingLeft).toBe(8);
  expect(badge.gap).toBe("4px");
  expect(badge.fontSize).toBe(12);
  expect(badge.lineHeight).toBe(16);
});

test("input", async ({ page }) => {
  const input = await metrics(page, "#control-input");

  expect(input.height).toBe(32);
  expect(input.paddingTop).toBe(4);
  expect(input.paddingLeft).toBe(10);
  expect(input.radius).toBe(10);
});

test("textarea", async ({ page }) => {
  const textarea = await metrics(page, "#control-textarea");

  expect(textarea.height).toBe(64);
  expect(textarea.paddingTop).toBe(8);
  expect(textarea.paddingLeft).toBe(10);
  expect(textarea.radius).toBe(10);
});

test("native select", async ({ page }) => {
  const select = await metrics(page, "#control-select");

  expect(select.height).toBe(32);
  expect(select.paddingTop).toBe(4);
  expect(select.paddingLeft).toBe(10);
  // The trailing side leaves room for the chevron.
  expect(select.paddingRight).toBe(32);
  expect(select.radius).toBe(10);
});

test("checkbox", async ({ page }) => {
  const checkbox = await metrics(page, "#control-checkbox");

  expect(checkbox.height).toBe(16);
  expect(checkbox.radius).toBe(4);
});

test("switch", async ({ page }) => {
  const control = await metrics(page, "#control-switch");

  expect(control.height).toBe(18);
});

test("alert", async ({ page }) => {
  const alert = await metrics(page, "#alert-with-action");

  expect(alert.paddingTop).toBe(8);
  expect(alert.paddingLeft).toBe(10);
  expect(alert.radius).toBe(10);
  // Row gap and column gap differ: the icon column is wider than the line spacing.
  expect(alert.gap).toBe("2px 8px");
});

test("card", async ({ page }) => {
  const card = await metrics(page, "#card-default");
  const header = await metrics(page, "#card-default .card-header");
  const title = await metrics(page, "#card-default .card-title");

  expect(card.paddingTop).toBe(16);
  expect(card.gap).toBe("16px");
  expect(card.radius).toBe(14);

  expect(header.paddingLeft).toBe(16);
  expect(header.gap).toBe("4px");

  expect(title.fontSize).toBe(16);
  expect(title.lineHeight).toBe(22);
});

test("dialog", async ({ page }) => {
  await page.click("#open-basic");
  await expect(page.locator("#basic")).toBeVisible();
  await settle(page, "#basic");

  const dialog = await metrics(page, "#basic");
  const header = await metrics(page, "#basic .dialog-header");
  const footer = await metrics(page, "#basic .dialog-footer");

  expect(dialog.paddingTop).toBe(16);
  expect(dialog.gap).toBe("16px");
  expect(dialog.radius).toBe(14);

  expect(header.gap).toBe("8px");

  // The footer cancels the dialog's padding to run full width, and carries its own.
  expect(footer.paddingTop).toBe(16);
  expect(footer.marginRight).toBe(-16);
  expect(footer.marginBottom).toBe(-16);
  expect(footer.gap).toBe("8px");
});

test("dropdown menu", async ({ page }) => {
  await page.click("#rich-trigger");
  await expect(page.locator("#rich-menu")).toBeVisible();
  await settle(page, "#rich-menu");

  const panel = await metrics(page, "#rich-menu");
  const item = await metrics(page, "#rich-last");
  const label = await metrics(page, "#rich-menu .dropdown-menu-label");
  const separator = await metrics(page, "#rich-menu .dropdown-menu-separator:first-of-type");

  expect(panel.paddingTop).toBe(4);
  expect(panel.radius).toBe(10);

  expect(item.height).toBe(28);
  expect(item.paddingTop).toBe(4);
  expect(item.paddingLeft).toBe(6);
  expect(item.gap).toBe("6px");
  expect(item.radius).toBe(8);

  expect(label.paddingTop).toBe(4);
  expect(label.paddingLeft).toBe(6);
  expect(label.fontSize).toBe(12);

  // A separator bleeds past the panel's padding.
  expect(separator.height).toBe(1);
  expect(separator.marginRight).toBe(-4);
});
