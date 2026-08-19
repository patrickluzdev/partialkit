import { expect, test } from "@playwright/test";

const LAB = "/tests/lab.html";

test.describe("swapped markup", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LAB);
    await page.click("#swap");
  });

  test("mounts a dialog that arrived after load", async ({ page }) => {
    await page.click("#swapped-open");

    const dialog = page.locator("#swapped-dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-labelledby", /.+/);

    await page.click("#swapped-close");
    await expect(dialog).toBeHidden();
  });

  test("mounts a menu that arrived after load", async ({ page }) => {
    await page.click("#swapped-trigger");

    await expect(page.locator("#swapped-menu")).toBeVisible();
    await expect(page.locator("#swapped-menu")).toHaveAttribute("role", "menu");
    await expect(page.locator("#swapped-trigger")).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("menuitem", { name: "Swapped item" })).toBeFocused();
  });

  test("mounts only once when the same subtree is scanned again", async ({ page }) => {
    const clicks = await page.evaluate(async () => {
      const menu = document.getElementById("swapped-menu")!;
      let count = 0;
      menu.addEventListener("toggle", () => count++);

      document.body.append(document.createElement("div"));
      await new Promise((resolve) => setTimeout(resolve, 50));

      menu.showPopover();
      await new Promise((resolve) => setTimeout(resolve, 50));
      return count;
    });

    expect(clicks).toBe(1);
  });
});

test.describe("theme", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(LAB);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("toggles the dark class and persists the choice", async ({ page }) => {
    await page.click("#theme-dark");
    await expect(page.locator("html")).toHaveClass(/dark/);
    expect(await page.evaluate(() => localStorage.getItem("pk-theme"))).toBe("dark");

    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("light mode removes the class", async ({ page }) => {
    await page.click("#theme-dark");
    await page.click("#theme-light");

    await expect(page.locator("html")).not.toHaveClass(/dark/);
    expect(await page.evaluate(() => localStorage.getItem("pk-theme"))).toBe("light");
  });

  test("system mode clears the stored choice", async ({ page }) => {
    await page.click("#theme-dark");
    await page.click("#theme-system");

    expect(await page.evaluate(() => localStorage.getItem("pk-theme"))).toBeNull();
  });

  test("a bare data-pk-theme button flips the current mode", async ({ page }) => {
    await page.click("#theme-light");
    await page.click("#theme-toggle");
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.click("#theme-toggle");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("emits pk:theme:change", async ({ page }) => {
    const detail = page.evaluate(
      () =>
        new Promise<unknown>((resolve) => {
          document.documentElement.addEventListener(
            "pk:theme:change",
            (event) => resolve((event as CustomEvent).detail),
            { once: true },
          );
        }),
    );

    await page.click("#theme-dark");
    expect(await detail).toEqual({ theme: "dark", dark: true });
  });
});
