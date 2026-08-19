import { ensureId, setDefaultAttribute } from "../core/a11y.js";
import { anchorOf, position, track } from "../core/anchor.js";
import type { Cleanup, Component } from "../core/types.js";

const OPEN_DELAY = 700;
const CLOSE_DELAY = 300;

/**
 * A preview of what a link leads to. Unlike a tooltip it holds real content, so
 * the pointer can travel into it and it dismisses like any other popover — and
 * unlike a popover, nothing was clicked to open it.
 */
export const hoverCard: Component = {
  name: "hover-card",
  selector: ".hover-card[popover]",

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

    // The close delay is what lets the pointer cross the gap into the card.
    const hide = () => {
      clearTimeout(timer);
      if (!element.matches(":popover-open")) return;
      timer = setTimeout(() => element.hidePopover(), CLOSE_DELAY);
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
    const onCardEnter = () => clearTimeout(timer);

    prepare(element);

    trigger.addEventListener("pointerenter", onEnter);
    trigger.addEventListener("pointerleave", onLeave);
    trigger.addEventListener("focus", onEnter);
    trigger.addEventListener("blur", onLeave);
    element.addEventListener("pointerenter", onCardEnter);
    element.addEventListener("pointerleave", onLeave);
    element.addEventListener("toggle", onToggle);

    return () => {
      clearTimeout(timer);
      detachReposition?.();
      trigger.removeEventListener("pointerenter", onEnter);
      trigger.removeEventListener("pointerleave", onLeave);
      trigger.removeEventListener("focus", onEnter);
      trigger.removeEventListener("blur", onLeave);
      element.removeEventListener("pointerenter", onCardEnter);
      element.removeEventListener("pointerleave", onLeave);
      element.removeEventListener("toggle", onToggle);
    };
  },
};

function prepare(element: HTMLElement): void {
  // An auto popover, unlike a tooltip: the card is a surface people read and
  // click inside, so it earns Escape and dismissal on an outside click.
  setDefaultAttribute(element, "role", "dialog");
  ensureId(element, "pk-hover-card");

  const title = element.querySelector(".hover-card-title, .item-title, h1, h2, h3, h4");
  if (title) setDefaultAttribute(element, "aria-labelledby", ensureId(title, "pk-hover-card-title"));

  element.setAttribute("data-state", element.matches(":popover-open") ? "open" : "closed");
}
