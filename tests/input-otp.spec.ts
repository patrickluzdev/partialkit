import { expect, test } from "@playwright/test";

const LAB = "/tests/lab.html";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(LAB);
});

test("prepares every slot as a one-character field", async ({ page }) => {
  const slot = page.locator("#lab-otp-1");

  await expect(slot).toHaveAttribute("maxlength", "1");
  await expect(slot).toHaveAttribute("inputmode", "numeric");
  await expect(slot).toHaveAttribute("autocomplete", "one-time-code");
});

test("typing walks forward on its own", async ({ page }) => {
  await page.locator("#lab-otp-1").focus();
  await page.keyboard.type("12");

  await expect(page.locator("#lab-otp-1")).toHaveValue("1");
  await expect(page.locator("#lab-otp-2")).toHaveValue("2");
  await expect(page.locator("#lab-otp-3")).toBeFocused();
});

test("backspace on an empty slot clears the one before it", async ({ page }) => {
  await page.locator("#lab-otp-1").focus();
  await page.keyboard.type("12");
  await page.keyboard.press("Backspace");

  await expect(page.locator("#lab-otp-2")).toHaveValue("");
  await expect(page.locator("#lab-otp-2")).toBeFocused();
});

test("the arrows move between slots", async ({ page }) => {
  await page.locator("#lab-otp-3").focus();
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator("#lab-otp-2")).toBeFocused();

  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#lab-otp-3")).toBeFocused();
});

// Firefox drops the clipboardData handed to a synthesised ClipboardEvent, so a
// paste cannot be faked there. The behaviour is the same; only the harness is not.
test.describe("paste", () => {
  test.skip(({ browserName }) => browserName === "firefox", "synthetic paste carries no data in Firefox");

  test("a pasted code fills every slot at once", async ({ page }) => {
    await page.locator("#lab-otp-1").focus();
    await page.locator("#lab-otp-1").evaluate((element) => {
      const data = new DataTransfer();
      data.setData("text", "4821");
      element.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: data }));
    });

    await expect(page.locator("#lab-otp-1")).toHaveValue("4");
    await expect(page.locator("#lab-otp-4")).toHaveValue("1");
    await expect(page.locator("#lab-otp-4")).toBeFocused();
  });

  test("pasting from a later slot fills from there", async ({ page }) => {
    await page.locator("#lab-otp-3").focus();
    await page.locator("#lab-otp-3").evaluate((element) => {
      const data = new DataTransfer();
      data.setData("text", "77");
      element.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, cancelable: true, clipboardData: data }));
    });

    await expect(page.locator("#lab-otp-1")).toHaveValue("");
    await expect(page.locator("#lab-otp-3")).toHaveValue("7");
    await expect(page.locator("#lab-otp-4")).toHaveValue("7");
  });
});

test("the joined code reaches the form field", async ({ page }) => {
  await page.locator("#lab-otp-1").focus();
  await page.keyboard.type("1234");

  await expect(page.locator("#lab-otp-value")).toHaveValue("1234");
});

test("announces the code as it is entered", async ({ page }) => {
  const detail = page.evaluate(
    () =>
      new Promise<{ value: string; complete: boolean }>((resolve) => {
        document.getElementById("lab-otp")!.addEventListener(
          "pk:otp:change",
          (event) => {
            const { detail } = event as CustomEvent<{ value: string; complete: boolean }>;
            if (detail.complete) resolve(detail);
          },
          { capture: false },
        );
      }),
  );

  await page.locator("#lab-otp-1").focus();
  await page.keyboard.type("9876");

  expect(await detail).toEqual({ value: "9876", complete: true });
});

test("focusing a filled slot selects it, so typing replaces", async ({ page }) => {
  await page.locator("#lab-otp-1").focus();
  await page.keyboard.type("1");

  await page.locator("#lab-otp-1").focus();
  await page.keyboard.type("5");

  await expect(page.locator("#lab-otp-1")).toHaveValue("5");
});
