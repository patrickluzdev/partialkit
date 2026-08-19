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

Alert · Badge · Button · Card · Dialog · Dropdown Menu · Field · Input · Label · Native Select · Textarea

Each one has a page with live examples, its classes and its state contract in the
[documentation](https://patrickluzdev.github.io/partialkit/).

## Browser support

Chrome 125+, Safari 17.4+, Firefox 125+ — partialkit builds on `<dialog>`, the popover API, `@starting-style` and `oklch()`. There are no polyfills.

## Development

```sh
npm install
npm run dev        # build the library, then serve the docs at :4321
npm test           # behaviour and accessibility, in Chromium, Firefox and WebKit
npm run test:all   # the above plus visual regression
```

The components are built on real browser primitives and real focus order, so the
suite runs in real browsers rather than a simulated DOM. axe-core checks every
documentation page in both themes, and a WCAG violation fails the build.

| Path | Contents |
| --- | --- |
| `src/css/` | Tokens, base layer, one file per component |
| `src/js/` | Registry, ARIA helpers, component behaviours |
| `docs/` | Astro + Starlight documentation site |
| `tests/` | Playwright specs |

## License

MIT
