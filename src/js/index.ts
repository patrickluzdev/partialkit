export { dialog, openDialog, closeDialog } from "./components/dialog.js";
export { dropdownMenu } from "./components/dropdown-menu.js";
export { theme, applyTheme, getTheme, setTheme } from "./components/theme.js";
export type { Theme } from "./components/theme.js";

export { register, mount, unmount, start, stop } from "./core/registry.js";
export { findAll, closestWithAttribute, dispatch } from "./core/dom.js";
export { ensureId, setDefaultAttribute, focusIsLoose, focusableWithin, focusFirst, createTypeahead } from "./core/a11y.js";
export type { Cleanup, Component, StartOptions } from "./core/types.js";
