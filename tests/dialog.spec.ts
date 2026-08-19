import { expect, test } from "@playwright/test";

const LAB = "/tests/fixtures/lab.html";

test.beforeEach(async ({ page }) => {
  await page.goto(LAB);
});

test("opens as a modal and moves focus inside", async ({ page }) => {
  await page.click("#open-basic");

  const dialog = page.locator("#basic");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveJSProperty("open", true);
  await expect(page.locator("#basic-input")).toBeFocused();
});

test("labels itself from its title and description", async ({ page }) => {
  const dialog = page.locator("#basic");
  const labelledBy = await dialog.getAttribute("aria-labelledby");
  const describedBy = await dialog.getAttribute("aria-describedby");

  expect(labelledBy).toBeTruthy();
  expect(describedBy).toBeTruthy();
  await expect(page.locator(`#${labelledBy}`)).toHaveText("Basic dialog");
  await expect(page.locator(`#${describedBy}`)).toHaveText("Describes the basic dialog.");
});

test("does not overwrite a label the author already set", async ({ page }) => {
  await expect(page.locator("#labelled")).toHaveAttribute("aria-labelledby", "custom-label");
});

test("makes the rest of the page unreachable while open", async ({ page }) => {
  await page.click("#open-basic");

  const visited: string[] = [];
  for (let step = 0; step < 6; step++) {
    await page.keyboard.press("Tab");
    visited.push(
      await page.evaluate(() => {
        const active = document.activeElement;
        if (!(active instanceof HTMLElement)) return "none";
        return document.getElementById("basic")?.contains(active) ? "inside" : (active.id || active.tagName);
      }),
    );
  }

  // Tab may cycle out to the browser chrome, but never onto another page control.
  expect(visited).toContain("inside");
  expect(visited.filter((entry) => entry !== "inside" && entry !== "BODY" && entry !== "none")).toEqual([]);
});

test("Escape closes it and restores focus to the trigger", async ({ page }) => {
  await page.click("#open-basic");
  await page.keyboard.press("Escape");

  await expect(page.locator("#basic")).toBeHidden();
  await expect(page.locator("#open-basic")).toBeFocused();
});

test("a close button sets returnValue and emits pk:dialog:close", async ({ page }) => {
  await page.click("#open-basic");

  const detail = page.evaluate(
    () =>
      new Promise<unknown>((resolve) => {
        document.getElementById("basic")?.addEventListener(
          "pk:dialog:close",
          (event) => resolve((event as CustomEvent).detail),
          { once: true },
        );
      }),
  );

  await page.click("#basic-confirm");
  expect(await detail).toEqual({ returnValue: "confirmed" });
  await expect(page.locator("#basic")).toBeHidden();
});

test("clicking the backdrop closes it", async ({ page }) => {
  await page.click("#open-basic");
  await page.mouse.click(5, 5);

  await expect(page.locator("#basic")).toBeHidden();
});

test("a static dialog ignores backdrop clicks", async ({ page }) => {
  await page.click("#open-static");
  await page.mouse.click(5, 5);

  await expect(page.locator("#static")).toBeVisible();
  await page.click("#static-close");
  await expect(page.locator("#static")).toBeHidden();
});

test("pk:dialog:before-open can cancel opening", async ({ page }) => {
  await page.evaluate(() => {
    document
      .getElementById("basic")
      ?.addEventListener("pk:dialog:before-open", (event) => event.preventDefault());
  });

  await page.click("#open-basic");
  await expect(page.locator("#basic")).toBeHidden();
});
