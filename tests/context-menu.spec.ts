import { expect, test, type Page } from "@playwright/test";

const LAB = "/tests/lab.html";

/**
 * Headless Chromium never turns a synthesised right click into a `contextmenu`
 * event — the browser UI layer produces that one. Dispatching it directly runs
 * the same handler, from the same element, with real coordinates.
 */
async function rightClick(page: Page, selector: string, offsetX: number, offsetY: number) {
  const box = (await page.locator(selector).boundingBox())!;
  const x = Math.round(box.x + offsetX);
  const y = Math.round(box.y + offsetY);

  await page.evaluate(
    ([target, clientX, clientY]) => {
      document.querySelector(target as string)!.dispatchEvent(
        new MouseEvent("contextmenu", {
          bubbles: true,
          cancelable: true,
          button: 2,
          clientX: clientX as number,
          clientY: clientY as number,
        }),
      );
    },
    [selector, x, y] as const,
  );

  // Geometry is only meaningful once the open transition has settled.
  await page
    .locator("#lab-context-menu")
    .evaluate((element) => Promise.all(element.getAnimations().map((animation) => animation.finished)));

  return { x, y };
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(LAB);
});

test("wires the target to the menu it opens", async ({ page }) => {
  const target = page.locator("#lab-context-target");

  await expect(target).toHaveAttribute("aria-haspopup", "menu");
  await expect(target).toHaveAttribute("aria-controls", "lab-context-menu");
  // Focusable, so the context-menu key has somewhere to fire from.
  await expect(target).toHaveAttribute("tabindex", "0");
});

test("a right click opens the menu where the pointer is", async ({ page }) => {
  const { x, y } = await rightClick(page, "#lab-context-target", 20, 20);

  const menu = page.locator("#lab-context-menu");
  await expect(menu).toBeVisible();

  const panel = (await menu.boundingBox())!;
  expect(Math.abs(panel.x - x)).toBeLessThanOrEqual(2);
  // One edge or the other meets the pointer: it flips upward near the bottom of
  // the viewport, the same as any other menu.
  const gap = Math.min(Math.abs(panel.y - y), Math.abs(panel.y + panel.height - y));
  expect(gap).toBeLessThanOrEqual(6);
});

test("the menu that opens is a real menu, with the keyboard that comes with it", async ({ page }) => {
  await rightClick(page, "#lab-context-target", 20, 20);

  await expect(page.locator("#lab-context-menu")).toHaveAttribute("role", "menu");
  await expect(page.locator("#lab-context-first")).toBeFocused();

  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("menuitem", { name: "Reload" })).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(page.locator("#lab-context-menu")).toBeHidden();
});

test("the browser's own menu does not also appear", async ({ page }) => {
  const prevented = await page.evaluate(() => {
    const target = document.getElementById("lab-context-target")!;
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 40, clientY: 40 });
    target.dispatchEvent(event);
    return event.defaultPrevented;
  });

  expect(prevented).toBe(true);
});

test("opening from the keyboard places the menu against the element, not the corner", async ({ page }) => {
  await page.locator("#lab-context-target").focus();
  // What the context-menu key and Shift+F10 send: no click behind it.
  await page.evaluate(() => {
    document
      .getElementById("lab-context-target")!
      .dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 0, clientY: 0 }));
  });

  const menu = page.locator("#lab-context-menu");
  await expect(menu).toBeVisible();

  const target = (await page.locator("#lab-context-target").boundingBox())!;
  const panel = (await menu.boundingBox())!;
  expect(panel.y).toBeGreaterThan(target.y);
});
