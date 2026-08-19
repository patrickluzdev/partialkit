import { ensureId, setDefaultAttribute } from "../core/a11y.js";
import { dispatch } from "../core/dom.js";
import type { Component } from "../core/types.js";

const TRIGGER = ".tabs-trigger";
const ENABLED_TRIGGER = `${TRIGGER}:not([disabled], [aria-disabled="true"])`;

export const tabs: Component = {
  name: "tabs",
  selector: ".tabs",

  mount(element) {
    const manual = element.getAttribute("data-activation") === "manual";

    const onClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const trigger = target?.closest<HTMLElement>(TRIGGER);
      if (!trigger || ownerOf(trigger) !== element) return;
      if (trigger.matches('[disabled], [aria-disabled="true"]')) return;

      select(element, trigger);
    };

    const onKeydown = (event: KeyboardEvent) => {
      const active = document.activeElement;
      const trigger = active instanceof HTMLElement ? active.closest<HTMLElement>(TRIGGER) : null;
      if (!trigger || ownerOf(trigger) !== element) return;

      const vertical = element.getAttribute("data-orientation") === "vertical";
      const next = vertical ? "ArrowDown" : "ArrowRight";
      const previous = vertical ? "ArrowUp" : "ArrowLeft";

      if (event.key === "Enter" || event.key === " ") {
        // Manual activation needs the key; automatic already selected on arrow.
        if (manual) {
          event.preventDefault();
          select(element, trigger);
        }
        return;
      }

      const list = triggers(element);
      const step = event.key === next ? 1 : event.key === previous ? -1 : 0;
      let target: HTMLElement | undefined;

      if (step !== 0) {
        const current = list.indexOf(trigger);
        target = list[(current + step + list.length) % list.length];
      } else if (event.key === "Home") {
        target = list[0];
      } else if (event.key === "End") {
        target = list[list.length - 1];
      } else {
        return;
      }

      event.preventDefault();
      target?.focus();
      if (!manual && target) select(element, target);
    };

    prepare(element);

    element.addEventListener("click", onClick);
    element.addEventListener("keydown", onKeydown);

    return () => {
      element.removeEventListener("click", onClick);
      element.removeEventListener("keydown", onKeydown);
    };
  },
};

/** Which tabs component an element belongs to, so nested tabs stay separate. */
function ownerOf(node: Element | null): Element | null {
  return node?.closest(".tabs") ?? null;
}

function triggers(element: HTMLElement): HTMLElement[] {
  return Array.from(element.querySelectorAll<HTMLElement>(ENABLED_TRIGGER)).filter(
    (trigger) => ownerOf(trigger) === element,
  );
}

function panels(element: HTMLElement): HTMLElement[] {
  return Array.from(element.querySelectorAll<HTMLElement>(".tabs-content")).filter(
    (panel) => ownerOf(panel) === element,
  );
}

function panelOf(trigger: HTMLElement): HTMLElement | null {
  const id = trigger.getAttribute("aria-controls");
  return id ? document.getElementById(id) : null;
}

function prepare(element: HTMLElement): void {
  const vertical = element.getAttribute("data-orientation") === "vertical";
  element.setAttribute("data-orientation", vertical ? "vertical" : "horizontal");
  // Boolean mirrors of the orientation, for styling one case without the other.
  element.toggleAttribute("data-vertical", vertical);
  element.toggleAttribute("data-horizontal", !vertical);

  for (const list of element.querySelectorAll<HTMLElement>(".tabs-list")) {
    if (ownerOf(list) !== element) continue;
    setDefaultAttribute(list, "role", "tablist");
    setDefaultAttribute(list, "aria-orientation", vertical ? "vertical" : "horizontal");
  }

  const all = Array.from(element.querySelectorAll<HTMLElement>(TRIGGER)).filter(
    (trigger) => ownerOf(trigger) === element,
  );
  const list = panels(element);

  all.forEach((trigger, index) => {
    setDefaultAttribute(trigger, "role", "tab");
    if (trigger.tagName === "BUTTON") setDefaultAttribute(trigger, "type", "button");

    const panel = panelOf(trigger) ?? list[index];
    if (panel) {
      setDefaultAttribute(trigger, "aria-controls", ensureId(panel, "pk-tabs-content"));
      setDefaultAttribute(panel, "role", "tabpanel");
      setDefaultAttribute(panel, "aria-labelledby", ensureId(trigger, "pk-tabs-trigger"));
      // Focusable so a panel with no controls can still be reached and scrolled.
      setDefaultAttribute(panel, "tabindex", "0");
    }

    if (trigger.hasAttribute("disabled")) setDefaultAttribute(trigger, "aria-disabled", "true");
  });

  const selected =
    all.find((trigger) => trigger.getAttribute("aria-selected") === "true" || trigger.hasAttribute("data-active")) ??
    triggers(element)[0];

  if (selected) select(element, selected, { silent: true });
}

function select(element: HTMLElement, trigger: HTMLElement, options: { silent?: boolean } = {}): void {
  const all = Array.from(element.querySelectorAll<HTMLElement>(TRIGGER)).filter(
    (candidate) => ownerOf(candidate) === element,
  );
  if (!options.silent && trigger.getAttribute("aria-selected") === "true") return;

  for (const candidate of all) {
    const active = candidate === trigger;
    candidate.setAttribute("aria-selected", String(active));
    candidate.toggleAttribute("data-active", active);
    // One stop in the tab order for the whole list; arrows move within it.
    candidate.tabIndex = active ? 0 : -1;

    const panel = panelOf(candidate);
    if (panel) {
      panel.toggleAttribute("hidden", !active);
      panel.toggleAttribute("data-active", active);
    }
  }

  if (!options.silent) {
    dispatch(trigger, "pk:tabs:change", { value: trigger.getAttribute("data-value") ?? trigger.id });
  }
}
