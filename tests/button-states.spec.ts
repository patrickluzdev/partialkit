import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * Every variant against every state. The default variant's colours used to live on
 * the base class, which leaked its hover background into the link and ghost
 * variants — nothing here would have caught that without checking each pairing.
 */

const LAB = "/tests/lab.html";

const VARIANTS = [
  { name: "default", selector: "#state-default" },
  { name: "outline", selector: "#state-outline" },
  { name: "secondary", selector: "#state-secondary" },
  { name: "ghost", selector: "#state-ghost" },
  { name: "destructive", selector: "#state-destructive" },
  { name: "link", selector: "#state-link" },
];

/** Colours arrive in several notations; only the alpha channel decides this. */
function isTransparent(color: string): boolean {
  if (color === "transparent") return true;
  const alpha = color.match(/\/\s*([\d.]+)\s*\)/)?.[1] ?? color.match(/rgba?\([^)]*,\s*([\d.]+)\)/)?.[1];
  return alpha !== undefined && Number.parseFloat(alpha) === 0;
}

/** The base class transitions everything, so a reading taken straight after a
 *  state change lands mid-interpolation. */
async function settle(locator: Locator) {
  await locator.evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
}

async function styles(locator: Locator) {
  await settle(locator);
  return locator.evaluate((element) => {
    const computed = getComputedStyle(element);
    return {
      background: computed.backgroundColor,
      color: computed.color,
      textDecoration: computed.textDecorationLine,
      boxShadow: computed.boxShadow,
      translate: computed.translate,
    };
  });
}

test.beforeEach(async ({ page }) => {
  await page.goto(LAB);
});

test.describe("hover", () => {
  for (const variant of VARIANTS) {
    test(`${variant.name} keeps its own surface`, async ({ page }) => {
      const button = page.locator(variant.selector);
      const resting = await styles(button);

      await button.hover();
      const hovered = await styles(button);

      if (variant.name === "link") {
        // A link button underlines and stays flat — no surface appears.
        expect(hovered.textDecoration).toContain("underline");
        expect(isTransparent(hovered.background), `link background: ${hovered.background}`).toBe(true);
      } else {
        expect(hovered.background).not.toBe(resting.background);
      }
    });
  }

  test("ghost has no surface until hovered", async ({ page }) => {
    const button = page.locator("#state-ghost");

    expect(isTransparent((await styles(button)).background)).toBe(true);

    await button.hover();
    expect(isTransparent((await styles(button)).background)).toBe(false);
  });
});

test.describe("focus", () => {
  for (const variant of VARIANTS) {
    test(`${variant.name} shows a focus ring`, async ({ page }) => {
      const button = page.locator(variant.selector);

      const resting = await styles(button);
      await button.evaluate((element) => (element as HTMLElement).focus());
      const focused = await styles(button);

      expect(focused.boxShadow, `${variant.name} ring`).not.toBe(resting.boxShadow);
      expect(focused.boxShadow).not.toBe("none");
    });
  }

  test("clicking does not leave a ring behind", async ({ page }) => {
    const button = page.locator("#state-default");

    await button.click();
    const clicked = await styles(button);

    // :focus-visible, not :focus — a pointer press should not ring.
    expect(clicked.boxShadow).toBe("none");
  });
});

test.describe("disabled", () => {
  test("dims and stops responding to the pointer", async ({ page }) => {
    const disabled = page.locator("#state-disabled");

    const opacity = await disabled.evaluate((el) => Number.parseFloat(getComputedStyle(el).opacity));
    const events = await disabled.evaluate((el) => getComputedStyle(el).pointerEvents);

    expect(opacity).toBeLessThan(1);
    expect(events).toBe("none");
  });
});

test.describe("pressed", () => {
  // Synthesised input does not set :active in any of the three engines, so the
  // rule is read from the stylesheet instead of simulated.
  test("shifts a plain button down and excludes menu triggers", async ({ page }) => {
    const rule = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        const walk = (rules: CSSRuleList): string | null => {
          for (const item of rules) {
            if (item instanceof CSSStyleRule && item.selectorText.includes(":active")) {
              if (item.selectorText.includes(".btn")) {
                return `${item.selectorText}|${item.style.translate}`;
              }
            }
            if ("cssRules" in item) {
              const found = walk((item as CSSGroupingRule).cssRules);
              if (found) return found;
            }
          }
          return null;
        };
        try {
          const found = walk(sheet.cssRules);
          if (found) return found;
        } catch {
          // Cross-origin sheet, skip.
        }
      }
      return null;
    });

    expect(rule, "a press rule exists").not.toBeNull();

    const [selector, translate] = rule!.split("|");
    expect(translate!.replace(/\s+/g, " ")).toMatch(/^0(px)? 1px$/);
    expect(await page.locator("#state-default").evaluate((el, s) => el.matches(s!.replace(":active", "")), selector)).toBe(true);
    expect(await page.locator("#state-trigger").evaluate((el, s) => el.matches(s!.replace(":active", "")), selector)).toBe(false);
  });
});

test.describe("invalid", () => {
  test("aria-invalid recolours the border", async ({ page }) => {
    const normal = await styles(page.locator("#state-default"));
    const invalid = await page
      .locator("#state-invalid")
      .evaluate((element) => getComputedStyle(element).borderColor);

    expect(invalid).not.toBe(normal.background);
    expect(isTransparent(invalid)).toBe(false);
  });
});

test.describe("as a link", () => {
  test("an anchor with .btn matches a button's box", async ({ page }) => {
    const button = await page.locator("#state-default").boundingBox();
    const anchor = await page.locator("#state-anchor").boundingBox();

    expect(Math.abs(anchor!.height - button!.height)).toBeLessThanOrEqual(1);
  });
});
