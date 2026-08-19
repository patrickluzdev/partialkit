import { createTypeahead, ensureId, setDefaultAttribute } from "../core/a11y.js";
import type { Cleanup, Component } from "../core/types.js";

type Placement = "bottom-start" | "bottom-end" | "top-start" | "top-end";

interface ToggleLikeEvent extends Event {
  readonly newState: string;
}

const ITEM_SELECTOR = ".menu-item";
const ENABLED_ITEM_SELECTOR = ".menu-item:not([aria-disabled='true'])";
const DEFAULT_OFFSET = 4;
const VIEWPORT_PADDING = 8;

export const menu: Component = {
  name: "menu",
  selector: ".menu[popover]",

  mount(element) {
    const typeahead = createTypeahead();
    let detachReposition: Cleanup | undefined;

    const reposition = () => position(element);

    const onToggle = (event: Event) => {
      const open = (event as ToggleLikeEvent).newState === "open";
      const trigger = triggerOf(element);
      trigger?.setAttribute("aria-expanded", String(open));

      if (!open) {
        detachReposition?.();
        detachReposition = undefined;

        // The popover only restores focus on light dismiss, not on item activation.
        if (element.contains(document.activeElement)) trigger?.focus();
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
      if (event.key === "Tab") {
        element.hidePopover();
        return;
      }

      const enabled = items(element);
      if (enabled.length === 0) return;

      const current = enabled.findIndex((item) => item === document.activeElement);
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
      const item = (event.target as Element | null)?.closest<HTMLElement>(ITEM_SELECTOR);
      if (!item) return;

      if (item.getAttribute("aria-disabled") === "true") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (!item.hasAttribute("data-pk-keep-open")) element.hidePopover();
    };

    applyRoles(element);
    prepareTrigger(element);

    element.addEventListener("toggle", onToggle);
    element.addEventListener("keydown", onKeydown);
    element.addEventListener("click", onClick);

    return () => {
      detachReposition?.();
      element.removeEventListener("toggle", onToggle);
      element.removeEventListener("keydown", onKeydown);
      element.removeEventListener("click", onClick);
    };
  },
};

function items(element: HTMLElement): HTMLElement[] {
  return Array.from(element.querySelectorAll<HTMLElement>(ENABLED_ITEM_SELECTOR));
}

/** WAI-ARIA menu roles. Re-applied on open so swapped-in items are covered. */
function applyRoles(element: HTMLElement): void {
  setDefaultAttribute(element, "role", "menu");

  const label = element.querySelector(".menu-label");
  if (label) setDefaultAttribute(element, "aria-labelledby", ensureId(label, "pk-menu-label"));

  for (const item of element.querySelectorAll<HTMLElement>(ITEM_SELECTOR)) {
    setDefaultAttribute(item, "role", "menuitem");
    item.tabIndex = -1;

    // `data-disabled` is the styling hook; mirror it so assistive tech agrees.
    if (item.hasAttribute("data-disabled") || item.hasAttribute("disabled")) {
      item.setAttribute("aria-disabled", "true");
    }
  }

  for (const separator of element.querySelectorAll(".menu-separator")) {
    setDefaultAttribute(separator, "role", "separator");
  }
}

function prepareTrigger(element: HTMLElement): void {
  const trigger = triggerOf(element);
  if (!trigger) return;

  setDefaultAttribute(trigger, "aria-haspopup", "menu");
  setDefaultAttribute(trigger, "aria-controls", ensureId(element, "pk-menu"));
  trigger.setAttribute("aria-expanded", String(element.matches(":popover-open")));
}

function triggerOf(element: HTMLElement): HTMLElement | null {
  const selector = element.getAttribute("data-pk-anchor");
  if (selector) return document.querySelector<HTMLElement>(selector);
  if (!element.id) return null;
  return document.querySelector<HTMLElement>(`[popovertarget="${CSS.escape(element.id)}"]`);
}

function position(element: HTMLElement): void {
  const anchor = triggerOf(element);
  if (!anchor) return;

  const placement = (element.getAttribute("data-pk-placement") ?? "bottom-start") as Placement;
  const offset = Number(element.getAttribute("data-pk-offset") ?? DEFAULT_OFFSET);
  const anchorRect = anchor.getBoundingClientRect();
  const { offsetWidth: width, offsetHeight: height } = element;

  const [side, align] = placement.split("-");
  const needed = height + offset + VIEWPORT_PADDING;
  const fitsBelow = window.innerHeight - anchorRect.bottom >= needed;
  const fitsAbove = anchorRect.top >= needed;
  const placeAbove = side === "top" ? fitsAbove || !fitsBelow : !fitsBelow && fitsAbove;

  const top = placeAbove ? anchorRect.top - height - offset : anchorRect.bottom + offset;
  const left = align === "end" ? anchorRect.right - width : anchorRect.left;
  const maxLeft = Math.max(window.innerWidth - width - VIEWPORT_PADDING, VIEWPORT_PADDING);

  element.style.top = `${Math.round(top)}px`;
  element.style.left = `${Math.round(Math.min(Math.max(left, VIEWPORT_PADDING), maxLeft))}px`;
}
