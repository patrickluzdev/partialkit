# partialkit

shadcn-inspired UI components for plain HTML.

Tailwind CSS classes plus a small ESM runtime. No React, no Vue, no build step in your project — if you can write HTML, you can use it.

**[Documentation and component gallery →](https://patrickluzdev.github.io/partialkit/)**

- **Semantic classes** — `class="btn btn-outline"`, not twenty utilities in every file.
- **shadcn tokens and names** — the same OKLCH variables, and components, parts and states named the way shadcn/ui names them.
- **Accessible by construction** — the browser handles focus trapping, `Esc` and the top layer; partialkit adds the ARIA roles, states and keyboard patterns.
- **Markup that arrives later just works** — no re-init call after you replace part of the page.
- **~8 kB of JS**, minified and unzipped.

## Install

Two self-contained files. Nothing to resolve at runtime.

```sh
npm install partialkit
cp node_modules/partialkit/dist/partialkit.min.css static/
cp node_modules/partialkit/dist/partialkit.min.js  static/
```

```html
<link rel="stylesheet" href="/static/partialkit.min.css" />
<script type="module" src="/static/partialkit.min.js"></script>

<button class="btn">Save</button>
```

Already building CSS with Tailwind? Import the source instead, so utilities and partialkit share one stylesheet:

```css
@import "tailwindcss";
@import "partialkit/css/source";
```

```js
import "partialkit/auto";
```

[Full installation guide →](https://patrickluzdev.github.io/partialkit/installation/)

## Components

Alert · Alert Dialog · Aspect Ratio · Avatar · Badge · Breadcrumb · Button · Button Group · Card · Checkbox · Dialog · Dropdown Menu · Empty · Field · Input · Input Group · Item · Kbd · Label · Native Select · Pagination · Progress · Radio Group · Separator · Skeleton · Slider · Spinner · Switch · Table · Textarea · Toggle · Toggle Group

Each one has a page with live examples, its classes and its state contract in the
[documentation](https://patrickluzdev.github.io/partialkit/), following the same sections
shadcn/ui documents.

Everything is written with logical properties, so `dir="rtl"` works without configuration.

## Browser support

Chrome 125+, Safari 17.4+, Firefox 125+ — partialkit builds on `<dialog>`, the popover API, `@starting-style` and `oklch()`. There are no polyfills.

## Development

```sh
npm install
npm run dev        # build the library, then serve the docs at :4321
npm test           # behaviour and accessibility, in Chromium, Firefox and WebKit
npm run test:all   # the above plus visual regression
npm run docs:check # every internal link in the built site resolves
```

The components are built on real browser primitives and real focus order, so the
suite runs in real browsers rather than a simulated DOM. axe-core checks every
documentation page in both themes, and a WCAG violation fails the build.

`tests/metrics.spec.ts` holds the layout numbers — padding, gaps, radii, heights —
measured from shadcn/ui's own demos with a browser rather than read off their
class strings. Matching them is a tested property, not a claim.

| Path | Contents |
| --- | --- |
| `src/css/` | Tokens, base layer, one file per component |
| `src/js/` | Registry, ARIA helpers, component behaviours |
| `docs/` | Astro + Starlight documentation site |
| `tests/` | Playwright specs |

## License

MIT
