import { createTypeahead, ensureId, focusIsLoose, setDefaultAttribute } from "../core/a11y.js";
import { dispatch } from "../core/dom.js";
import type { Cleanup, Component } from "../core/types.js";

type Placement =
  | "bottom-start"
  | "bottom-end"
  | "top-start"
  | "top-end"
  | "right-start"
  | "left-start";

interface ToggleLikeEvent extends Event {
  readonly newState: string;
}

const ITEM = ".dropdown-menu-item, .dropdown-menu-checkbox-item, .dropdown-menu-radio-item";
const ENABLED_ITEM = [
  ".dropdown-menu-item",
  ".dropdown-menu-checkbox-item",
  ".dropdown-menu-radio-item",
]
  .map((selector) => `${selector}:not([aria-disabled="true"])`)
  .join(", ");

const SUB_TRIGGER = ".dropdown-menu-sub-trigger";
const DEFAULT_OFFSET = 4;
const SIDE_OFFSET = 0;
const VIEWPORT_PADDING = 8;
const PANEL_PADDING = 4;

export const dropdownMenu: Component = {
  name: "dropdown-menu",
  selector: ".dropdown-menu[popover]",

  mount(element) {
    const typeahead = createTypeahead();
    let detachReposition: Cleanup | undefined;

    const reposition = () => position(element);

    const onToggle = (event: Event) => {
      const open = (event as ToggleLikeEvent).newState === "open";
      const trigger = triggerOf(element);
      const state = open ? "open" : "closed";

      element.setAttribute("data-state", state);
      trigger?.setAttribute("data-state", state);
      trigger?.setAttribute("aria-expanded", String(open));

      if (!open) {
        detachReposition?.();
        detachReposition = undefined;

        // The popover restores focus on light dismiss in some engines only, and
        // never when an item was activated.
        if (element.contains(document.activeElement) || focusIsLoose()) trigger?.focus();
        return;
      }

      applyRoles(element);
      reposition();
      items(element)[0]?.focus();

      window.addEventListener("scroll", reposition, { capture: true, passive: true });
      window.addEventListener("resize", reposition, { passive: true });
      detachReposition = () => {
        window.removeEventListener("scroll", reposition, { capture: true });
        window.removeEventListener("resize", reposition);
      };
    };

    const onKeydown = (event: KeyboardEvent) => {
      const active = document.activeElement;
      if (active instanceof Element && ownerOf(active) !== element) return;

      if (event.key === "Tab") {
        // The default action would move focus on before the async toggle runs,
        // so the trigger is restored here instead.
        event.preventDefault();
        element.hidePopover();
        triggerOf(element)?.focus();
        return;
      }

      if (event.key === "ArrowRight") {
        const trigger = active instanceof HTMLElement ? active.closest<HTMLElement>(SUB_TRIGGER) : null;
        const submenu = trigger && submenuOf(trigger);
        if (submenu) {
          event.preventDefault();
          submenu.showPopover();
        }
        return;
      }

      if (event.key === "ArrowLeft") {
        const parentTrigger = triggerOf(element);
        if (parentTrigger?.matches(SUB_TRIGGER)) {
          event.preventDefault();
          element.hidePopover();
          parentTrigger.focus();
        }
        return;
      }

      const enabled = items(element);
      if (enabled.length === 0) return;

      const current = enabled.findIndex((item) => item === active);
      const step = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;

      if (step !== 0) {
        event.preventDefault();
        const next = current === -1 ? (step === 1 ? 0 : enabled.length - 1) : current + step;
        enabled[(next + enabled.length) % enabled.length]?.focus();
        return;
      }

      if (event.key === "Home" || event.key === "End") {
        event.preventDefault();
        (event.key === "Home" ? enabled[0] : enabled[enabled.length - 1])?.focus();
        return;
      }

      if (event.ctrlKey || event.metaKey || event.altKey) return;

      const match = typeahead(event.key, enabled);
      if (match) {
        event.preventDefault();
        match.focus();
      }
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const item = target?.closest<HTMLElement>(`${ITEM}, ${SUB_TRIGGER}`);
      if (!item || !element.contains(item)) return;

      if (item.getAttribute("aria-disabled") === "true") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      // Selecting inside a submenu closes the whole chain, but the submenu itself
      // already handled the state change.
      if (ownerOf(item) !== element) {
        if (!item.hasAttribute("data-pk-keep-open")) element.hidePopover();
        return;
      }

      // A submenu trigger opens its own panel; the parent stays put.
      if (item.matches(SUB_TRIGGER)) return;

      if (item.matches(".dropdown-menu-checkbox-item")) {
        toggleChecked(item);
      } else if (item.matches(".dropdown-menu-radio-item")) {
        selectRadio(item);
      }

      if (!item.hasAttribute("data-pk-keep-open")) element.hidePopover();
    };

    // Moving across items closes a sibling submenu, and opens the one under the pointer.
    const onPointerOver = (event: PointerEvent) => {
      const target = event.target as Element | null;
      const item = target?.closest<HTMLElement>(`${ITEM}, ${SUB_TRIGGER}`);
      if (!item || ownerOf(item) !== element) return;

      for (const trigger of element.querySelectorAll<HTMLElement>(SUB_TRIGGER)) {
        if (trigger === item) continue;
        const submenu = submenuOf(trigger);
        if (submenu?.matches(":popover-open")) submenu.hidePopover();
      }

      if (item.getAttribute("aria-disabled") === "true") return;

      // Styling keys off :focus alone, the way shadcn/ui does, so the pointer has
      // to move focus rather than trigger a separate hover rule.
      item.focus();

      if (item.matches(SUB_TRIGGER)) submenuOf(item)?.showPopover();
    };

    applyRoles(element);
    prepareTrigger(element);

    element.addEventListener("toggle", onToggle);
    element.addEventListener("keydown", onKeydown);
    element.addEventListener("click", onClick);
    element.addEventListener("pointerover", onPointerOver);

    return () => {
      detachReposition?.();
      element.removeEventListener("toggle", onToggle);
      element.removeEventListener("keydown", onKeydown);
      element.removeEventListener("click", onClick);
      element.removeEventListener("pointerover", onPointerOver);
    };
  },
};

/**
 * Which panel an element belongs to. Submenus nest inside their parent, so every
 * event they fire also reaches the parent's listeners — each panel must ignore
 * what is not its own, or it would close a submenu the pointer just entered,
 * toggle a checkbox twice, or move focus two items at a time.
 */
function ownerOf(node: Element | null): Element | null {
  return node?.closest(".dropdown-menu[popover]") ?? null;
}

/** Enabled items in this panel, excluding anything belonging to a nested submenu. */
function items(element: HTMLElement): HTMLElement[] {
  return Array.from(element.querySelectorAll<HTMLElement>(`${ENABLED_ITEM}, ${SUB_TRIGGER}`)).filter(
    (item) => ownerOf(item) === element,
  );
}

function toggleChecked(item: HTMLElement): void {
  const checked = item.getAttribute("aria-checked") !== "true";
  item.setAttribute("aria-checked", String(checked));
  dispatch(item, "pk:menu:change", { checked, value: item.getAttribute("data-value") });
}

function selectRadio(item: HTMLElement): void {
  const group = item.closest(".dropdown-menu-radio-group") ?? item.closest(".dropdown-menu");
  for (const sibling of group?.querySelectorAll<HTMLElement>(".dropdown-menu-radio-item") ?? []) {
    sibling.setAttribute("aria-checked", String(sibling === item));
  }
  dispatch(item, "pk:menu:change", { checked: true, value: item.getAttribute("data-value") });
}

function submenuOf(trigger: HTMLElement): HTMLElement | null {
  const id = trigger.getAttribute("popovertarget");
  if (!id) return null;
  const submenu = document.getElementById(id);
  return submenu instanceof HTMLElement ? submenu : null;
}

/** WAI-ARIA menu roles. Re-applied on open so swapped-in items are covered. */
function applyRoles(element: HTMLElement): void {
  setDefaultAttribute(element, "role", "menu");

  const label = Array.from(element.querySelectorAll(".dropdown-menu-label")).find(
    (candidate) => candidate.closest(".dropdown-menu[popover]") === element,
  );
  if (label) setDefaultAttribute(element, "aria-labelledby", ensureId(label, "pk-dropdown-menu-label"));

  for (const group of element.querySelectorAll(".dropdown-menu-group, .dropdown-menu-radio-group")) {
    setDefaultAttribute(group, "role", "group");
  }

  const roles: [string, string][] = [
    [".dropdown-menu-item", "menuitem"],
    [SUB_TRIGGER, "menuitem"],
    [".dropdown-menu-checkbox-item", "menuitemcheckbox"],
    [".dropdown-menu-radio-item", "menuitemradio"],
  ];

  for (const [selector, role] of roles) {
    for (const item of element.querySelectorAll<HTMLElement>(selector)) {
      setDefaultAttribute(item, "role", role);
      item.tabIndex = -1;

      // `data-disabled` is the styling hook; mirror it so assistive tech agrees.
      if (item.hasAttribute("data-disabled") || item.hasAttribute("disabled")) {
        item.setAttribute("aria-disabled", "true");
      }
      if (role !== "menuitem") setDefaultAttribute(item, "aria-checked", "false");
    }
  }

  for (const trigger of element.querySelectorAll<HTMLElement>(SUB_TRIGGER)) {
    const submenu = submenuOf(trigger);
    if (!submenu) continue;

    setDefaultAttribute(trigger, "aria-haspopup", "menu");
    setDefaultAttribute(trigger, "aria-controls", ensureId(submenu, "pk-dropdown-menu"));
    setDefaultAttribute(trigger, "aria-expanded", String(submenu.matches(":popover-open")));
    setDefaultAttribute(submenu, "data-pk-placement", "right-start");
  }

  for (const separator of element.querySelectorAll(".dropdown-menu-separator")) {
    setDefaultAttribute(separator, "role", "separator");
  }
}

function prepareTrigger(element: HTMLElement): void {
  const trigger = triggerOf(element);
  if (!trigger) return;

  setDefaultAttribute(trigger, "aria-haspopup", "menu");
  setDefaultAttribute(trigger, "aria-controls", ensureId(element, "pk-dropdown-menu"));

  const open = element.matches(":popover-open");
  const state = open ? "open" : "closed";
  element.setAttribute("data-state", state);
  trigger.setAttribute("data-state", state);
  trigger.setAttribute("aria-expanded", String(open));
}

function triggerOf(element: HTMLElement): HTMLElement | null {
  const selector = element.getAttribute("data-pk-anchor");
  if (selector) return document.querySelector<HTMLElement>(selector);
  if (!element.id) return null;
  return document.querySelector<HTMLElement>(`[popovertarget="${CSS.escape(element.id)}"]`);
}

function clamp(value: number, max: number): number {
  return Math.min(Math.max(value, VIEWPORT_PADDING), Math.max(max, VIEWPORT_PADDING));
}

function position(element: HTMLElement): void {
  const anchor = triggerOf(element);
  if (!anchor) return;

  const placement = (element.getAttribute("data-pk-placement") ?? "bottom-start") as Placement;
  const offset = Number(
    element.getAttribute("data-pk-offset") ??
      (placement.startsWith("right") || placement.startsWith("left") ? SIDE_OFFSET : DEFAULT_OFFSET),
  );
  const anchorRect = anchor.getBoundingClientRect();
  const { offsetWidth: width, offsetHeight: height } = element;
  const [physicalSide, align] = placement.split("-");
  // Placements are authored in reading order, so a side flips with direction.
  const rtl = getComputedStyle(element).direction === "rtl";
  const side =
    rtl && physicalSide === "right" ? "left" : rtl && physicalSide === "left" ? "right" : physicalSide;

  let top: number;
  let left: number;

  if (side === "right" || side === "left") {
    const fitsRight = window.innerWidth - anchorRect.right >= width + offset + VIEWPORT_PADDING;
    const fitsLeft = anchorRect.left >= width + offset + VIEWPORT_PADDING;
    const placeLeft = side === "left" ? fitsLeft || !fitsRight : !fitsRight && fitsLeft;

    left = placeLeft ? anchorRect.left - width - offset : anchorRect.right + offset;
    // Line the first item up with the trigger by cancelling the panel's padding.
    top = clamp(anchorRect.top - PANEL_PADDING, window.innerHeight - height - VIEWPORT_PADDING);
  } else {
    const needed = height + offset + VIEWPORT_PADDING;
    const fitsBelow = window.innerHeight - anchorRect.bottom >= needed;
    const fitsAbove = anchorRect.top >= needed;
    const placeAbove = side === "top" ? fitsAbove || !fitsBelow : !fitsBelow && fitsAbove;

    top = placeAbove ? anchorRect.top - height - offset : anchorRect.bottom + offset;
    const alignEnd = rtl ? align !== "end" : align === "end";
    left = clamp(
      alignEnd ? anchorRect.right - width : anchorRect.left,
      window.innerWidth - width - VIEWPORT_PADDING,
    );
  }

  element.style.top = `${Math.round(top)}px`;
  element.style.left = `${Math.round(left)}px`;
}
