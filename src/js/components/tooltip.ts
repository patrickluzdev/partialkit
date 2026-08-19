import { ensureId } from "../core/a11y.js";
import { anchorOf, position, track } from "../core/anchor.js";
import type { Cleanup, Component } from "../core/types.js";

const OPEN_DELAY = 600;
const CLOSE_DELAY = 100;

/**
 * A tooltip is a hint, not a target: it opens on hover or focus after a pause
 * and never takes focus, so the trigger describes itself rather than labelling
 * a panel the user has to reach.
 */
export const tooltip: Component = {
  name: "tooltip",
  selector: ".tooltip[popover]",

  mount(element) {
    const trigger = anchorOf(element);
    if (!trigger) return;

    let detachReposition: Cleanup | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const openDelay = Number(element.getAttribute("data-pk-delay") ?? OPEN_DELAY);

    const show = () => {
      clearTimeout(timer);
      if (element.matches(":popover-open")) return;
      timer = setTimeout(() => element.showPopover(), openDelay);
    };

    // A short close delay lets the pointer cross the gap between the two.
    const hide = (immediate = false) => {
      clearTimeout(timer);
      if (!element.matches(":popover-open")) return;
      timer = setTimeout(() => element.hidePopover(), immediate ? 0 : CLOSE_DELAY);
    };

    const onToggle = (event: Event) => {
      const open = (event as Event & { newState: string }).newState === "open";
      const state = open ? "open" : "closed";
      element.setAttribute("data-state", state);
      trigger.setAttribute("data-state", state);

      if (open) {
        detachReposition = track(element, () => position(element));
        return;
      }

      detachReposition?.();
      detachReposition = undefined;
    };

    const onEnter = () => show();
    const onLeave = () => hide();
    const onFocus = () => show();
    const onBlur = () => hide(true);
    // A tooltip on a button must not survive the action it describes.
    const onClick = () => hide(true);
    const onPanelEnter = () => clearTimeout(timer);
    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide(true);
    };

    prepare(element, trigger);

    trigger.addEventListener("pointerenter", onEnter);
    trigger.addEventListener("pointerleave", onLeave);
    trigger.addEventListener("focus", onFocus);
    trigger.addEventListener("blur", onBlur);
    trigger.addEventListener("click", onClick);
    element.addEventListener("pointerenter", onPanelEnter);
    element.addEventListener("pointerleave", onLeave);
    element.addEventListener("toggle", onToggle);
    document.addEventListener("keydown", onKeydown);

    return () => {
      clearTimeout(timer);
      detachReposition?.();
      trigger.removeEventListener("pointerenter", onEnter);
      trigger.removeEventListener("pointerleave", onLeave);
      trigger.removeEventListener("focus", onFocus);
      trigger.removeEventListener("blur", onBlur);
      trigger.removeEventListener("click", onClick);
      element.removeEventListener("pointerenter", onPanelEnter);
      element.removeEventListener("pointerleave", onLeave);
      element.removeEventListener("toggle", onToggle);
      document.removeEventListener("keydown", onKeydown);
    };
  },
};

function prepare(element: HTMLElement, trigger: HTMLElement): void {
  // Manual, never auto: an auto popover joins the light-dismiss stack, so a
  // tooltip appearing would close whatever menu or dialog is already open.
  element.setAttribute("popover", "manual");

  // No `role="tooltip"` — the panel is the trigger's description, and the role
  // makes some screen readers announce the text a second time.
  const id = ensureId(element, "pk-tooltip");
  const described = trigger.getAttribute("aria-describedby");
  if (!described?.split(/\s+/).includes(id)) {
    trigger.setAttribute("aria-describedby", described ? `${described} ${id}` : id);
  }

  element.setAttribute("data-state", element.matches(":popover-open") ? "open" : "closed");
}
