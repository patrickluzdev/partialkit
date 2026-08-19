import { expect, test, type Locator } from "@playwright/test";

/**
 * The state matrix for everything that is not the button: badge variants, the
 * form controls, menu items and the dialog's dismiss. Badge had the same defect
 * button did — the default variant's colours on the base class reached every
 * variant that did not set a hover of its own.
 */

const LAB = "/tests/lab.html";

function isTransparent(color: string): boolean {
  if (color === "transparent") return true;
  const alpha =
    color.match(/\/\s*([\d.]+)\s*\)/)?.[1] ?? color.match(/rgba?\([^)]*,\s*([\d.]+)\)/)?.[1];
  return alpha !== undefined && Number.parseFloat(alpha) === 0;
}

/** Everything transitions, so a reading taken straight after a change interpolates. */
async function settle(locator: Locator) {
  await locator.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
}

async function paint(locator: Locator) {
  await settle(locator);
  return locator.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      background: computed.backgroundColor,
      color: computed.color,
      border: computed.borderColor,
      shadow: computed.boxShadow,
      underline: computed.textDecorationLine,
      opacity: Number.parseFloat(computed.opacity),
    };
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto(LAB);
});

test.describe("badge", () => {
  const LINKED = [
    { name: "default", selector: "#badge-a-default" },
    { name: "secondary", selector: "#badge-a-secondary" },
    { name: "destructive", selector: "#badge-a-destructive" },
    { name: "outline", selector: "#badge-a-outline" },
  ];

  for (const variant of LINKED) {
    test(`${variant.name} keeps its own surface when linked`, async ({ page }) => {
      const badge = page.locator(variant.selector);
      const resting = await paint(badge);

      await badge.hover();
      const hovered = await paint(badge);

      expect(hovered.background).not.toBe(resting.background);
    });
  }

  test("link stays flat and only underlines", async ({ page }) => {
    const badge = page.locator("#badge-a-link");

    await badge.hover();
    const hovered = await paint(badge);

    expect(hovered.underline).toContain("underline");
    expect(isTransparent(hovered.background), `background: ${hovered.background}`).toBe(true);
  });

  test("ghost picks up a muted surface, not the primary one", async ({ page }) => {
    const ghost = page.locator("#badge-a-ghost");
    const outline = page.locator("#badge-a-outline");

    await ghost.hover();
    const ghostHover = await paint(ghost);
    await outline.hover();
    const outlineHover = await paint(outline);

    expect(isTransparent(ghostHover.background)).toBe(false);
    expect(ghostHover.background).toBe(outlineHover.background);
  });

  test("a plain span does not react to the pointer", async ({ page }) => {
    const badge = page.locator("#badge-default");
    const resting = await paint(badge);

    await badge.hover();
    expect((await paint(badge)).background).toBe(resting.background);
  });
});

const CONTROLS = [
  { name: "input", base: "#control-input", invalid: "#control-input-invalid", disabled: "#control-input-disabled" },
  { name: "textarea", base: "#control-textarea", invalid: "#control-textarea-invalid", disabled: "#control-textarea-disabled" },
  { name: "native select", base: "#control-select", invalid: "#control-select-invalid", disabled: "#control-select-disabled" },
];

for (const control of CONTROLS) {
  test.describe(control.name, () => {
    test("shows a focus ring, and only while focused", async ({ page }) => {
      const field = page.locator(control.base);
      const resting = await paint(field);

      await field.focus();
      const focused = await paint(field);

      expect(focused.shadow).not.toBe("none");
      expect(focused.shadow).not.toBe(resting.shadow);
      expect(focused.border).not.toBe(resting.border);
    });

    test("aria-invalid recolours the border", async ({ page }) => {
      const normal = await paint(page.locator(control.base));
      const invalid = await paint(page.locator(control.invalid));

      expect(invalid.border).not.toBe(normal.border);
      expect(isTransparent(invalid.border)).toBe(false);
    });

    test("focusing an invalid control does not replace the error ring", async ({ page }) => {
      const invalid = page.locator(control.invalid);
      const resting = await paint(invalid);

      // An invalid control already carries the destructive ring at rest, so
      // focusing must leave both border and ring where they are.
      await invalid.focus();
      const focused = await paint(invalid);

      expect(focused.border).toBe(resting.border);
      expect(focused.shadow).toBe(resting.shadow);

      // And that ring is not the neutral one a valid control gets.
      const valid = page.locator(control.base);
      await valid.focus();

      expect(focused.shadow).not.toBe((await paint(valid)).shadow);
    });

    test("disabled dims and refuses input", async ({ page }) => {
      const field = page.locator(control.disabled);

      expect((await paint(field)).opacity).toBeLessThan(1);
      await expect(field).toBeDisabled();
    });
  });
}

test.describe("dropdown menu item", () => {
  test("focus is what paints an item, matching shadcn/ui", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.click("#start-trigger");
    await expect(page.locator("#start-menu")).toBeVisible();

    const items = page.locator("#start-menu .dropdown-menu-item");
    const first = items.first();
    const second = items.nth(1);

    await first.focus();
    const focused = await paint(first);
    const unfocused = await paint(second);

    expect(isTransparent(focused.background)).toBe(false);
    expect(isTransparent(unfocused.background)).toBe(true);
  });

  test("the pointer moves focus rather than painting a separate hover", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.click("#start-trigger");
    await expect(page.locator("#start-menu")).toBeVisible();

    const target = page.locator("#start-menu .dropdown-menu-item").nth(1);
    await target.hover();

    await expect(target).toBeFocused();
  });

  test("a disabled item stays dim and unreachable", async ({ page }) => {
    await page.click("#start-trigger");
    const disabled = page.locator("#start-menu .dropdown-menu-item[data-disabled]");

    const painted = await paint(disabled);
    expect(painted.opacity).toBeLessThan(1);
    expect(await disabled.evaluate((el) => getComputedStyle(el).pointerEvents)).toBe("none");
  });

  test("a destructive item reads as destructive, focused or not", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.click("#rich-trigger");
    await expect(page.locator("#rich-menu")).toBeVisible();

    const destructive = page.locator("#rich-destructive");
    const plain = page.locator("#rich-last");

    expect((await paint(destructive)).color).not.toBe((await paint(plain)).color);

    // Focus paints its own surface rather than borrowing the accent one.
    await destructive.focus();
    const focused = await paint(destructive);
    await plain.focus();

    expect(isTransparent(focused.background)).toBe(false);
    expect(focused.background).not.toBe((await paint(plain)).background);
  });
});

test.describe("dialog close", () => {
  test("reacts to the pointer like the ghost button it is", async ({ page }) => {
    await page.click("#open-closable");
    const close = page.locator("#closable-x");

    const resting = await paint(close);
    expect(isTransparent(resting.background)).toBe(true);

    await close.hover();
    expect(isTransparent((await paint(close)).background)).toBe(false);
  });
});
