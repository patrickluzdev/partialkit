# Changelog

All notable changes are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow
[semantic versioning](https://semver.org/spec/v2.0.0.html).

While the major version is `0`, a minor bump may carry a breaking change — every one is listed
under **Changed** with what to do about it.

## [0.1.0] — 2026-08-19

First published version. 44 components, named and styled after
[shadcn/ui](https://ui.shadcn.com), for projects that write plain HTML.

### Added

- **Layout and content** — Aspect Ratio, Card, Empty, Item, Separator, Skeleton, Table.
- **Typography and marks** — Badge, Kbd, Label, Progress, Spinner.
- **Buttons** — Button, Button Group, Toggle, Toggle Group.
- **Forms** — Checkbox, Field, Input, Input Group, Input OTP, Native Select, Radio Group, Slider,
  Switch, Textarea.
- **Overlays** — Alert, Alert Dialog, Dialog, Sheet, Hover Card, Popover, Tooltip.
- **Menus** — Context Menu, Dropdown Menu, Menubar.
- **Navigation** — Breadcrumb, Pagination, Tabs.
- **Disclosure and motion** — Accordion, Carousel, Collapsible, Scroll Area.
- **Avatars** — Avatar, with a stacked group.
- A runtime of 25 kB minified: a component registry, a mutation observer for swapped markup, and
  behaviour for the components that need it. Most of the catalogue is CSS alone.
- Design tokens in OKLCH, matching shadcn/ui's neutral palette, with a `.dark` variant.
- Right-to-left support across every component, and a `prefers-reduced-motion` path.

### Notes

- Needs `<dialog>`, the popover API, `@starting-style` and `oklch()`: Chrome 125+, Safari 17.4+,
  Firefox 125+. There are no polyfills.
- Tailwind CSS is an optional peer: the built stylesheet carries the tokens and component classes
  on its own, and the source import is there for projects that want utilities alongside.
