# partialkit

shadcn-inspired UI components for HTML you render on the server.

**[Documentation and component gallery →](https://patrickluzdev.github.io/partialkit/)**

Tailwind CSS classes plus a small ESM runtime, built for htmx and Go templates. No React, no Vue, and no build step required in the consuming project.

- **Semantic classes** — `class="btn btn-outline"`, not a 20-utility soup in every template.
- **shadcn tokens** — the same OKLCH variables (`--background`, `--primary`, `--radius`, …), so themes port over.
- **Accessible by construction** — the platform handles focus trapping, Escape and the top layer; partialkit adds the WAI-ARIA roles, states and keyboard patterns on top. See [Accessibility](#accessibility).
- **htmx-safe** — triggers use event delegation; anything needing per-element state is mounted by a MutationObserver. Swapped markup just works, with no re-init call.
- **~8 kB of JS**, minified and unzipped.

## Install

### Drop-in (any Go project)

Two self-contained files, no Node in your app's build:

```sh
npm install partialkit
cp node_modules/partialkit/dist/partialkit.min.css static/
cp node_modules/partialkit/dist/partialkit.min.js  static/
```

```html
<link rel="stylesheet" href="/static/partialkit.min.css" />
<script type="module" src="/static/partialkit.min.js"></script>
```

`dist/partialkit.css` ships the design tokens, a preflight and the component classes — but no Tailwind utilities. Use it when partialkit's classes are all you need.

### With your own Tailwind build

Import the source so Tailwind utilities and partialkit end up in one stylesheet:

```css
@import "tailwindcss";
@import "partialkit/css/source";
```

```js
import "partialkit/auto";
```

### Vendored, no npm

Copy `dist/partialkit.min.css` and `dist/partialkit.min.js` from a release straight into `static/`. There is nothing else to resolve at runtime.

## Usage

### Go `html/template`

```html
{{ define "confirm-delete" }}
  <button class="btn btn-destructive" data-pk-dialog-open="delete-{{ .ID }}">Delete</button>

  <dialog class="dialog" id="delete-{{ .ID }}">
    <div class="dialog-header">
      <h2 class="dialog-title">Delete {{ .Name }}</h2>
      <p class="dialog-description">This action cannot be undone.</p>
    </div>
    <div class="dialog-footer">
      <button class="btn btn-outline" data-pk-dialog-close>Cancel</button>
      <button class="btn btn-destructive" hx-delete="/projects/{{ .ID }}" hx-target="#project-list">
        Delete
      </button>
    </div>
  </dialog>
{{ end }}
```

### Server-side validation

Inputs style their error state from `aria-invalid`, so a re-render needs no extra class:

```html
<div class="field">
  <label class="label" for="handle">Handle</label>
  <input class="input" id="handle" name="handle" value="{{ .Handle }}"
         {{ if .Error }}aria-invalid="true"{{ end }} />
  {{ if .Error }}<p class="field-error">{{ .Error }}</p>{{ end }}
</div>
```

## Components

Component and part names follow shadcn/ui, so what you know there maps over directly.

| Component | Classes | JS |
| --- | --- | --- |
| Alert | `.alert` `.alert-title` `.alert-description` + `.alert-destructive` | — |
| Badge | `.badge` + `.badge-secondary` `.badge-destructive` `.badge-outline` | — |
| Button | `.btn` + `.btn-secondary` `.btn-outline` `.btn-ghost` `.btn-destructive` `.btn-link` `.btn-sm` `.btn-lg` `.btn-icon` | — |
| Card | `.card` `.card-header` `.card-title` `.card-description` `.card-action` `.card-content` `.card-footer` | — |
| Dialog | `.dialog` `.dialog-header` `.dialog-title` `.dialog-description` `.dialog-footer` | yes |
| Dropdown Menu | `.dropdown-menu` `.dropdown-menu-item` `.dropdown-menu-label` `.dropdown-menu-separator` `.dropdown-menu-shortcut` | yes |
| Field | `.field` `.field-group` `.field-description` `.field-error` `.field-separator` | — |
| Input | `.input` | — |
| Label | `.label` | — |
| Native Select | `.native-select` | — |
| Textarea | `.textarea` | — |
| Utility | `.sr-only` | — |

### States

States follow shadcn/ui too, so the same selectors work:

| Attribute | Set on | Meaning |
| --- | --- | --- |
| `data-state="open" \| "closed"` | dialogs, dropdown menus, and their triggers | Managed by partialkit. |
| `data-variant="destructive"` | `.dropdown-menu-item` | Destructive item styling. |
| `data-inset` | `.dropdown-menu-item`, `.dropdown-menu-label` | Aligns with items that have icons. |
| `data-disabled` | `.dropdown-menu-item` | You set it; partialkit mirrors it to `aria-disabled`. |
| `aria-invalid` | `.input`, `.textarea`, `.native-select` | You set it; drives the error styling. |

### Dialog

```html
<button class="btn" data-pk-dialog-open="my-dialog">Open</button>

<dialog class="dialog" id="my-dialog">
  <div class="dialog-header">
    <h2 class="dialog-title">Title</h2>
  </div>
  <div class="dialog-footer">
    <button class="btn btn-outline" data-pk-dialog-close>Cancel</button>
  </div>
</dialog>
```

| Attribute | Meaning |
| --- | --- |
| `data-pk-dialog-open="<id>"` | Opens that dialog as a modal. |
| `data-pk-dialog-close[="<value>"]` | Closes the enclosing dialog, optionally setting `returnValue`. |
| `data-pk-dialog-static` | On the dialog: clicking the backdrop does not close it. |

Events: `pk:dialog:before-open` (cancelable), `pk:dialog:open`, `pk:dialog:close`.

### Dropdown Menu

The trigger uses the native `popovertarget`, so opening and light dismiss need no JS at all. partialkit positions the panel and adds the [menu button pattern](#dropdown-menu-keyboard-support) on top.

```html
<button class="btn btn-outline" popovertarget="account-menu">Account</button>

<div class="dropdown-menu w-52" id="account-menu" popover data-pk-placement="bottom-start">
  <div class="dropdown-menu-label">My account</div>
  <hr class="dropdown-menu-separator" />
  <button class="dropdown-menu-item" type="button">Profile</button>
  <button class="dropdown-menu-item" type="button" data-disabled>Billing</button>
  <hr class="dropdown-menu-separator" />
  <button class="dropdown-menu-item" type="button" data-variant="destructive">Sign out</button>
</div>
```

| Attribute | Meaning |
| --- | --- |
| `data-pk-placement` | `bottom-start` (default), `bottom-end`, `top-start`, `top-end`. Flips when it does not fit. |
| `data-pk-offset` | Gap from the trigger in pixels. Defaults to `4`. |
| `data-pk-anchor` | Selector to position against, when the trigger is not the `popovertarget` button. |
| `data-pk-keep-open` | On an item: activating it does not close the menu. |

### Theme

```html
<button class="btn btn-icon" data-pk-theme aria-label="Toggle theme">☾</button>
```

`data-pk-theme` toggles; `data-pk-theme="dark|light|system"` sets a specific mode. The choice persists under the `pk-theme` key in `localStorage`.

Add this to `<head>` to avoid a flash before the runtime loads:

```html
<script>
  if (localStorage.getItem("pk-theme") === "dark"
    || (!localStorage.getItem("pk-theme") && matchMedia("(prefers-color-scheme: dark)").matches)) {
    document.documentElement.classList.add("dark");
  }
</script>
```

## JavaScript API

`partialkit/auto` registers every component and starts the observer on load. Import `partialkit` instead when you want to pick components yourself:

```js
import { register, start, dialog, dropdownMenu } from "partialkit";

register(dialog);
register(dropdownMenu);
start();
```

| Export | Purpose |
| --- | --- |
| `register(component)` | Adds a component and runs its `setup` once. |
| `start({ root })` | Mounts everything under `root` and observes it. Defaults to `document.body`. |
| `mount(root)` / `unmount(root)` | Manual control, if you would rather not observe. |
| `stop()` | Disconnects the observer and runs every cleanup. |
| `openDialog(id, opener?)` / `closeDialog(id, value)` | Programmatic dialog control. `opener` is the element focus returns to. |
| `ensureId`, `setDefaultAttribute`, `focusIsLoose`, `focusableWithin`, `focusFirst`, `createTypeahead` | ARIA helpers, for your own components. |
| `getTheme()` / `setTheme(theme)` / `applyTheme()` | Theme control. |

### Custom components

```ts
import { register, type Component } from "partialkit";

const counter: Component = {
  name: "counter",
  selector: "[data-counter]",
  mount(element) {
    const onClick = () => (element.textContent = String(Number(element.textContent) + 1));
    element.addEventListener("click", onClick);
    return () => element.removeEventListener("click", onClick);
  },
};

register(counter);
```

`setup()` runs once per component and is the place for document-level delegation. `mount()` runs per element and its returned cleanup fires when that element leaves the DOM.

## Accessibility

shadcn/ui gets its behaviour from Radix (now Base UI), which is React-only. partialkit reaches the same place from two directions: browser primitives where the platform already implements the pattern, and an explicit ARIA layer where it does not.

| Concern | Where it comes from |
| --- | --- |
| Modal semantics, focus trap, `Esc`, background `inert`, focus restore | `<dialog>.showModal()` |
| Menu top layer, light dismiss, focus restore on dismiss | popover API (partialkit fills the WebKit gap) |
| `aria-labelledby` / `aria-describedby` on dialogs | wired from `.dialog-title` / `.dialog-description` |
| `role="menu"`, `role="menuitem"`, `role="separator"`, `aria-labelledby` | applied on mount and on every open |
| `data-state="open" \| "closed"` on overlays and triggers | kept in sync by the runtime |
| `aria-haspopup`, `aria-controls`, `aria-expanded` on the trigger | applied on mount, kept in sync on toggle |
| `data-disabled` mirrored to `aria-disabled`, skipped by keyboard nav | dropdown menu runtime |
| Focus visible rings, `:disabled` styling, `aria-invalid` error state | component CSS, on native elements |
| `prefers-reduced-motion` | transitions collapse to 1 ms |

Attributes you set yourself are never overwritten — every ARIA attribute is applied only when absent.

### Dropdown Menu keyboard support

| Key | Action |
| --- | --- |
| `↓` / `↑` | Move between enabled items, wrapping at the ends. |
| `Home` / `End` | First / last enabled item. |
| a–z, 0–9 | Type-ahead: jumps to the first item starting with what you type. |
| `Esc` | Closes and returns focus to the trigger (native light dismiss). |
| `Tab` | Closes and returns focus to the trigger. |
| `Enter` / `Space` | Activates the item — it is a real `<button>`. |

Disabled items keep `aria-disabled="true"` rather than `disabled`, so they stay discoverable to a screen reader while being skipped by arrow navigation and unclickable.

### What you still owe

- **Accessible names for icon-only controls.** Use `aria-label`, or `.sr-only` text inside the button.
- **A heading in every dialog.** `.dialog-title` is what becomes the accessible name.
- **`lang` on `<html>`.**

## Theming

Override the tokens anywhere after the stylesheet:

```css
:root {
  --primary: oklch(0.55 0.2 264);
  --primary-foreground: oklch(0.98 0 0);
  --radius: 0.5rem;
}
```

Dark mode reads the `.dark` class on `<html>`.

## Browser support

Needs `<dialog>`, the popover API, `@starting-style` and `oklch()` — Chrome 125+, Safari 17.4+, Firefox 125+. There are no polyfills.

## Development

```sh
npm install
npm run dev          # build the library, then serve the docs at :4321
npm run docs:build   # static docs into docs/dist
npm run typecheck
```

The docs are an Astro + Starlight site under `docs/`. Every example is a real file in
`docs/src/examples/`, rendered live and shown as code from that same file — so a preview can
never drift from the snippet beside it, and the snippet is exactly what you would paste.
Layout belongs to the `<Preview>` component (`layout`, `width`), never to the example, so no
demo scaffolding leaks into the code panel.

### Tests

The components are built on `<dialog>`, the popover API and real focus order, none of
which jsdom or happy-dom implement faithfully, so everything runs in real browsers
through Playwright — Chromium, Firefox and WebKit.

```sh
npm test           # behaviour + accessibility, all three engines
npm run test:visual # screenshot regression, chromium only
npm run test:all    # both
npm run test:ui     # Playwright UI mode
npm run test:update # re-record visual baselines
```

Accessibility is enforced, not just documented: `tests/a11y.spec.ts` runs axe-core
against every documentation page in light and dark mode, and again with a dialog and
a menu open. A WCAG violation fails the build.

Visual baselines live in `tests/__screenshots__/{platform}/` because rendering differs
per OS. CI runs inside the Playwright container; `npm run test:docker` reproduces that
environment locally.

| Path | Contents |
| --- | --- |
| `docs/public/tests/lab.html` | Edge-case fixture, loaded from `dist/` so it also proves the standalone build. |
| `tests/*.spec.ts` | Behaviour, accessibility and visual specs. |

| Path | Contents |
| --- | --- |
| `src/css/` | Tokens, base layer, one file per component. |
| `src/js/core/` | Registry, DOM helpers, ARIA helpers, component contract. |
| `src/js/components/` | Component behaviours. |
| `docs/` | Astro + Starlight documentation site. |
| `tests/` | Playwright specs and the lab fixture. |
| `dist/` | Build output (git-ignored). |

## License

MIT
