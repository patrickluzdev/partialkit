import { setDefaultAttribute } from "../core/a11y.js";
import type { Component } from "../core/types.js";

const TRIGGER = ".menubar-trigger";
const ENABLED_TRIGGER = `${TRIGGER}:not([disabled], [aria-disabled="true"])`;

/**
 * A row of menu buttons that behave as one: once any menu is open, moving the
 * pointer across the bar opens the next, and the arrow keys walk between them.
 * Each panel is a dropdown menu and keeps its own keyboard handling.
 */
export const menubar: Component = {
  name: "menubar",
  selector: ".menubar",

  mount(element) {
    const onKeydown = (event: KeyboardEvent) => {
      // The open menu handles ArrowLeft itself when it is a submenu.
      if (event.defaultPrevented) return;

      const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (step === 0) return;

      const active = document.activeElement;
      const current =
        active instanceof HTMLElement
          ? (active.closest<HTMLElement>(TRIGGER) ?? triggerOfPanel(active, element))
          : null;
      if (!current || ownerOf(current) !== element) return;

      const list = triggers(element);
      const index = list.indexOf(current);
      if (index === -1) return;

      // Reading order: in Arabic the right arrow walks toward the start.
      const rtl = getComputedStyle(element).direction === "rtl";
      const next = list[(index + (rtl ? -step : step) + list.length) % list.length];
      if (!next) return;

      event.preventDefault();
      // A bar with a menu already open keeps it open on the one moved to.
      if (menuOf(current)?.matches(":popover-open")) {
        menuOf(current)?.hidePopover();
        menuOf(next)?.showPopover();
        return;
      }

      focus(element, next);
    };

    // Crossing the bar with a menu open swaps menus, the way a menu bar does.
    const onPointerOver = (event: PointerEvent) => {
      const target = event.target as Element | null;
      const trigger = target?.closest<HTMLElement>(ENABLED_TRIGGER);
      if (!trigger || ownerOf(trigger) !== element) return;

      const open = triggers(element).find((candidate) => menuOf(candidate)?.matches(":popover-open"));
      if (!open || open === trigger) return;

      menuOf(open)?.hidePopover();
      menuOf(trigger)?.showPopover();
      trigger.focus();
    };

    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Element | null;
      const trigger = target?.closest<HTMLElement>(TRIGGER);
      if (trigger && ownerOf(trigger) === element) focus(element, trigger);
    };

    prepare(element);

    element.addEventListener("keydown", onKeydown);
    element.addEventListener("pointerover", onPointerOver);
    element.addEventListener("focusin", onFocusIn);

    return () => {
      element.removeEventListener("keydown", onKeydown);
      element.removeEventListener("pointerover", onPointerOver);
      element.removeEventListener("focusin", onFocusIn);
    };
  },
};

/** Which bar an element belongs to, so nested bars stay separate. */
function ownerOf(node: Element | null): Element | null {
  return node?.closest(".menubar") ?? null;
}

function triggers(element: HTMLElement): HTMLElement[] {
  return Array.from(element.querySelectorAll<HTMLElement>(ENABLED_TRIGGER)).filter(
    (trigger) => ownerOf(trigger) === element,
  );
}

function menuOf(trigger: HTMLElement): HTMLElement | null {
  const id = trigger.getAttribute("popovertarget");
  return id ? document.getElementById(id) : null;
}

/** The bar trigger that opened the panel an element sits in, if any. */
function triggerOfPanel(node: HTMLElement, element: HTMLElement): HTMLElement | null {
  const panel = node.closest<HTMLElement>(".dropdown-menu[popover]");
  if (!panel) return null;
  return triggers(element).find((trigger) => menuOf(trigger)?.contains(panel) || menuOf(trigger) === panel) ?? null;
}

/** One stop in the tab order for the whole bar; arrows move within it. */
function focus(element: HTMLElement, trigger: HTMLElement): void {
  for (const candidate of triggers(element)) candidate.tabIndex = candidate === trigger ? 0 : -1;
  trigger.focus();
}

function prepare(element: HTMLElement): void {
  setDefaultAttribute(element, "role", "menubar");

  const list = triggers(element);
  list.forEach((trigger, index) => {
    setDefaultAttribute(trigger, "role", "menuitem");
    if (trigger.tagName === "BUTTON") setDefaultAttribute(trigger, "type", "button");
    trigger.tabIndex = index === 0 ? 0 : -1;
  });
}
