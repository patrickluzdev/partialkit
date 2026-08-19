import { expect, test, type Page } from "@playwright/test";

/**
 * The documentation must render a component exactly as the library does.
 *
 * The lab loads dist/partialkit.css on a bare page; the docs load the source
 * through Starlight, which brings its own cascade layers. When those layers
 * outrank partialkit's, a component looks right in a project and wrong on its
 * own documentation page — which is how a separator lost its margins while every
 * other test stayed green.
 */

test.skip(({ browserName }) => browserName !== "chromium", "cascade order is engine-independent");

/**
 * Box geometry only. Colour, typography and height are excluded on purpose: the
 * lab is a bare page inheriting browser defaults while the docs inherit
 * Starlight's, the docs examples show components in different states, and their
 * content differs. A cascade leak shows up as a flattened margin or padding —
 * that is what this watches.
 */
const PROPERTIES = [
  "marginTop",
  "marginBottom",
  "marginLeft",
  "marginRight",
  "paddingTop",
  "paddingBottom",
  "paddingLeft",
  "paddingRight",
  "borderTopWidth",
  "borderRadius",
  "gap",
] as const;

function styles(page: Page, selector: string, extra: string[] = []) {
  return page.locator(selector).first().evaluate(
    (element, properties) => {
      const computed = getComputedStyle(element);
      return Object.fromEntries(properties.map((name) => [name, computed[name as never] as string]));
    },
    [...(PROPERTIES as unknown as string[]), ...extra],
  );
}

interface Pair {
  name: string;
  lab: string;
  docs: string;
  page: string;
  open?: { lab: string; docs: string };
  /** Properties worth checking for this one beyond the shared box geometry. */
  extra?: string[];
}

const PAIRS: Pair[] = [
  {
    name: "dropdown menu separator",
    lab: "#rich-menu .dropdown-menu-separator",
    docs: "#demo-menu .dropdown-menu-separator",
    page: "/components/dropdown-menu/",
    open: { lab: "#rich-trigger", docs: '[popovertarget="demo-menu"]' },
    extra: ["height"],
  },
  {
    name: "dropdown menu item",
    lab: "#rich-last",
    docs: "#demo-menu .dropdown-menu-item",
    page: "/components/dropdown-menu/",
    open: { lab: "#rich-trigger", docs: '[popovertarget="demo-menu"]' },
  },
  {
    name: "dialog footer",
    lab: "#basic .dialog-footer",
    docs: "#demo-dialog .dialog-footer",
    page: "/components/dialog/",
    open: { lab: "#open-basic", docs: '[data-pk-dialog-open="demo-dialog"]' },
  },
  { name: "button", lab: "#state-default", docs: ".pk-preview .btn", page: "/components/button/" },
  { name: "badge", lab: "#badge-default", docs: ".pk-preview .badge", page: "/components/badge/" },
  { name: "input", lab: "#control-input", docs: ".pk-preview .input", page: "/components/input/" },
  { name: "checkbox", lab: "#control-checkbox", docs: ".pk-preview .checkbox", page: "/components/checkbox/" },
  { name: "card header", lab: "#card-default .card-header", docs: ".pk-preview .card-header", page: "/components/card/" },
];

for (const pair of PAIRS) {
  test(`${pair.name} renders the same in the docs as in the library`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });

    await page.goto("/tests/lab.html");
    if (pair.open) {
      await page.click(pair.open.lab);
      await expect(page.locator(pair.lab).first()).toBeVisible();
    }
    const library = await styles(page, pair.lab, pair.extra);

    await page.goto(pair.page);
    await page.evaluate(() => localStorage.setItem("starlight-theme", "light"));
    await page.reload();
    if (pair.open) {
      await page.click(pair.open.docs);
      await expect(page.locator(pair.docs).first()).toBeVisible();
    }
    const documentation = await styles(page, pair.docs, pair.extra);

    const differences = Object.entries(library)
      .filter(([property, value]) => documentation[property] !== value)
      .map(([property, value]) => `${property}: docs ${documentation[property]} — library ${value}`);

    expect(differences).toEqual([]);
  });
}

/**
 * The cascade runs the other way too: Starlight names the label of its mobile
 * table of contents `toggle`, which is one of partialkit's class names. Left
 * alone, the library restyles a part of the documentation chrome that has
 * nothing to do with it.
 */
test("Starlight's own toggle keeps its own styles, and ours keeps ours", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 900 });
  await page.goto("/components/toggle/");

  const starlight = page.locator("mobile-starlight-toc .toggle");
  await expect(starlight).toBeVisible();
  await expect(starlight).toHaveCSS("min-width", "auto");
  await expect(starlight).toHaveCSS("font-weight", "400");
  await expect(starlight).toHaveCSS("border-radius", "8px");

  const ours = page.locator(".pk-preview button.toggle").first();
  await expect(ours).toHaveCSS("min-width", "32px");
  await expect(ours).toHaveCSS("font-weight", "500");
  await expect(ours).toHaveCSS("border-radius", "10px");
});
