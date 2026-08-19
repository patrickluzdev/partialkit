import { expect, test, type Page } from "@playwright/test";

const LAB = "/tests/lab.html";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(LAB);
});

/** Snap scrolling settles asynchronously; the runtime reports when it has. */
async function settled(page: Page) {
  await page.waitForFunction(() => {
    const content = document.getElementById("lab-carousel-content")!;
    return Math.abs(content.scrollLeft % content.clientWidth) < 2;
  });
}

test("announces itself as a carousel of slides", async ({ page }) => {
  await expect(page.locator("#lab-carousel")).toHaveAttribute("aria-roledescription", "carousel");
  await expect(page.locator("#lab-slide-1")).toHaveAttribute("aria-roledescription", "slide");
  await expect(page.locator("#lab-slide-1")).toHaveAttribute("aria-label", "1 of 3");
  await expect(page.locator("#lab-slide-3")).toHaveAttribute("aria-label", "3 of 3");
});

test("the scroller is reachable without a pointer", async ({ page }) => {
  await expect(page.locator("#lab-carousel-content")).toHaveAttribute("tabindex", "0");
});

test("the buttons move one slide and disable at the ends", async ({ page }) => {
  await expect(page.locator("#lab-carousel-previous")).toBeDisabled();
  await expect(page.locator("#lab-carousel-next")).toBeEnabled();

  await page.click("#lab-carousel-next");
  await settled(page);

  await expect(page.locator("#lab-carousel")).toHaveAttribute("data-index", "1");
  await expect(page.locator("#lab-carousel-previous")).toBeEnabled();

  await page.click("#lab-carousel-next");
  await settled(page);

  await expect(page.locator("#lab-carousel")).toHaveAttribute("data-index", "2");
  await expect(page.locator("#lab-carousel-next")).toBeDisabled();
});

test("the arrow keys move it too", async ({ page }) => {
  await page.locator("#lab-carousel-content").focus();
  await page.keyboard.press("ArrowRight");
  await settled(page);

  await expect(page.locator("#lab-carousel")).toHaveAttribute("data-index", "1");

  await page.keyboard.press("ArrowLeft");
  await settled(page);

  await expect(page.locator("#lab-carousel")).toHaveAttribute("data-index", "0");
});

test("reports which slide is showing", async ({ page }) => {
  const detail = page.evaluate(
    () =>
      new Promise<{ index: number; atEnd: boolean }>((resolve) => {
        document.getElementById("lab-carousel")!.addEventListener(
          "pk:carousel:change",
          (event) => resolve((event as CustomEvent<{ index: number; atEnd: boolean }>).detail),
          { once: true },
        );
      }),
  );

  await page.click("#lab-carousel-next");
  expect((await detail).index).toBe(1);
});

test("scrolls without the buttons, because the browser owns the movement", async ({ page }) => {
  await expect(page.locator("#lab-carousel-content")).toHaveCSS("scroll-snap-type", "x mandatory");
  await expect(page.locator("#lab-slide-1")).toHaveCSS("scroll-snap-align", "start");
});
