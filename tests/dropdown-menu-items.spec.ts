import { expect, test, type Page } from "@playwright/test";

const LAB = "/tests/lab.html";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(LAB);
});

async function open(page: Page) {
  await page.click("#rich-trigger");
  await expect(page.locator("#rich-menu")).toBeVisible();
  await page.locator("#rich-menu").evaluate((element) =>
    Promise.all(element.getAnimations().map((animation) => animation.finished)),
  );
}

test.describe("checkbox items", () => {
  test("carry the checkbox role and their checked state", async ({ page }) => {
    await expect(page.locator("#check-status")).toHaveAttribute("role", "menuitemcheckbox");
    await expect(page.locator("#check-status")).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("#check-panel")).toHaveAttribute("aria-checked", "false");
  });

  test("toggle on activation and emit pk:menu:change", async ({ page }) => {
    await open(page);

    const detail = page.evaluate(
      () =>
        new Promise<unknown>((resolve) => {
          document
            .getElementById("check-panel")
            ?.addEventListener("pk:menu:change", (event) => resolve((event as CustomEvent).detail), {
              once: true,
            });
        }),
    );

    await page.click("#check-panel");
    expect(await detail).toEqual({ checked: true, value: "panel" });
    await expect(page.locator("#check-panel")).toHaveAttribute("aria-checked", "true");

    await page.click("#check-panel");
    await expect(page.locator("#check-panel")).toHaveAttribute("aria-checked", "false");
  });

  test("toggle independently of each other", async ({ page }) => {
    await open(page);
    await page.click("#check-panel");

    await expect(page.locator("#check-status")).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("#check-panel")).toHaveAttribute("aria-checked", "true");
  });

  test("a disabled item does not toggle", async ({ page }) => {
    await open(page);
    await expect(page.locator("#check-disabled")).toHaveAttribute("aria-disabled", "true");

    await page.locator("#check-disabled").dispatchEvent("click");
    await expect(page.locator("#check-disabled")).toHaveAttribute("aria-checked", "false");
  });

  test("are reachable by keyboard and skipped when disabled", async ({ page }) => {
    await open(page);
    await page.locator("#check-status").focus();

    await page.keyboard.press("ArrowDown");
    await expect(page.locator("#check-panel")).toBeFocused();

    // Skips #check-disabled and lands on the first radio item.
    await page.keyboard.press("ArrowDown");
    await expect(page.locator("#radio-compact")).toBeFocused();
  });
});

test.describe("radio items", () => {
  test("carry the radio role inside a group", async ({ page }) => {
    await expect(page.locator("#radio-compact")).toHaveAttribute("role", "menuitemradio");
    await expect(page.locator("#radio-group")).toHaveAttribute("role", "group");
  });

  test("selecting one clears the others", async ({ page }) => {
    await open(page);
    await expect(page.locator("#radio-compact")).toHaveAttribute("aria-checked", "true");

    await page.click("#radio-comfortable");

    await expect(page.locator("#radio-comfortable")).toHaveAttribute("aria-checked", "true");
    await expect(page.locator("#radio-compact")).toHaveAttribute("aria-checked", "false");
  });

  test("do not clear checkbox items in the same menu", async ({ page }) => {
    await open(page);
    await page.click("#radio-comfortable");

    await expect(page.locator("#check-status")).toHaveAttribute("aria-checked", "true");
  });
});

test.describe("submenus", () => {
  test("the trigger announces the nested menu", async ({ page }) => {
    const trigger = page.locator("#sub-trigger");

    await expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    await expect(trigger).toHaveAttribute("aria-controls", "sub-menu");
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("ArrowRight opens it and focuses the first item", async ({ page }) => {
    await open(page);
    await page.locator("#sub-trigger").focus();
    await page.keyboard.press("ArrowRight");

    await expect(page.locator("#sub-menu")).toBeVisible();
    await expect(page.locator("#sub-trigger")).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#sub-first")).toBeFocused();
  });

  test("ArrowLeft closes it and returns to the trigger", async ({ page }) => {
    await open(page);
    await page.locator("#sub-trigger").focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#sub-first")).toBeFocused();

    await page.keyboard.press("ArrowLeft");

    await expect(page.locator("#sub-menu")).toBeHidden();
    await expect(page.locator("#sub-trigger")).toBeFocused();
  });

  test("the parent menu stays open while the submenu is open", async ({ page }) => {
    await open(page);
    await page.locator("#sub-trigger").focus();
    await page.keyboard.press("ArrowRight");

    await expect(page.locator("#sub-menu")).toBeVisible();
    await expect(page.locator("#rich-menu")).toBeVisible();
  });

  test("opens to the side of its trigger", async ({ page }) => {
    await open(page);
    await page.locator("#sub-trigger").focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#sub-menu")).toBeVisible();
    await page.locator("#sub-menu").evaluate((element) =>
      Promise.all(element.getAnimations().map((animation) => animation.finished)),
    );

    const trigger = await page.locator("#sub-trigger").boundingBox();
    const submenu = await page.locator("#sub-menu").boundingBox();

    expect(submenu!.x).toBeGreaterThanOrEqual(trigger!.x + trigger!.width - 1);
    expect(Math.abs(submenu!.y - trigger!.y)).toBeLessThanOrEqual(8);
  });

  test("hovering another item closes an open submenu", async ({ page }) => {
    await open(page);
    await page.locator("#sub-trigger").focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#sub-menu")).toBeVisible();

    await page.locator("#rich-last").hover();
    await expect(page.locator("#sub-menu")).toBeHidden();
  });

  test("closing the parent closes the submenu", async ({ page }) => {
    await open(page);
    await page.locator("#sub-trigger").focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.locator("#sub-menu")).toBeVisible();

    await page.locator("#rich-menu").evaluate((element) => (element as HTMLElement).hidePopover());

    await expect(page.locator("#rich-menu")).toBeHidden();
    await expect(page.locator("#sub-menu")).toBeHidden();
  });
});

test("data-pk-keep-open holds the menu open while toggling", async ({ page }) => {
  await open(page);
  await page.click("#check-panel");
  await page.click("#radio-comfortable");

  await expect(page.locator("#rich-menu")).toBeVisible();
});
