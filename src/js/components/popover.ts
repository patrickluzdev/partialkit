import { ensureId, focusIsLoose, focusFirst, setDefaultAttribute } from "../core/a11y.js";
import { anchorOf, position, track } from "../core/anchor.js";
import type { Cleanup, Component } from "../core/types.js";

interface ToggleLikeEvent extends Event {
  readonly newState: string;
}

export const popover: Component = {
  name: "popover",
  selector: ".popover[popover]",

  mount(element) {
    let detachReposition: Cleanup | undefined;

    const reposition = () => position(element);

    const onToggle = (event: Event) => {
      const open = (event as ToggleLikeEvent).newState === "open";
      const trigger = anchorOf(element);
      const state = open ? "open" : "closed";

      element.setAttribute("data-state", state);
      trigger?.setAttribute("data-state", state);
      trigger?.setAttribute("aria-expanded", String(open));

      if (!open) {
        detachReposition?.();
        detachReposition = undefined;

        // Light dismiss restores focus in some engines only, and never when a
        // control inside the panel closed it.
        if (element.contains(document.activeElement) || focusIsLoose()) trigger?.focus();
        return;
      }

      detachReposition = track(element, reposition);

      // A popover holds content, not a menu — focus the first thing a user can
      // act on, or the panel itself when there is nothing.
      if (!focusFirst(element)) {
        element.tabIndex = -1;
        element.focus();
      }
    };

    prepare(element);
    element.addEventListener("toggle", onToggle);

    return () => {
      detachReposition?.();
      element.removeEventListener("toggle", onToggle);
    };
  },
};

function prepare(element: HTMLElement): void {
  setDefaultAttribute(element, "role", "dialog");

  const title = element.querySelector(".popover-title");
  if (title) setDefaultAttribute(element, "aria-labelledby", ensureId(title, "pk-popover-title"));

  const description = element.querySelector(".popover-description");
  if (description) {
    setDefaultAttribute(element, "aria-describedby", ensureId(description, "pk-popover-description"));
  }

  const trigger = anchorOf(element);
  if (!trigger) return;

  setDefaultAttribute(trigger, "aria-haspopup", "dialog");
  setDefaultAttribute(trigger, "aria-controls", ensureId(element, "pk-popover"));

  const open = element.matches(":popover-open");
  const state = open ? "open" : "closed";
  element.setAttribute("data-state", state);
  trigger.setAttribute("data-state", state);
  trigger.setAttribute("aria-expanded", String(open));
}
