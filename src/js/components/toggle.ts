import { dispatch } from "../core/dom.js";
import type { Component } from "../core/types.js";

/**
 * A pressed button holds its own state, unlike a checkbox — nothing in the
 * platform flips `aria-pressed`, so this does. Only buttons that already carry
 * the attribute are taken over; a toggle built from a checkbox styles itself
 * from `:checked` and needs none of this.
 */
export const toggle: Component = {
  name: "toggle",
  selector: "button.toggle[aria-pressed]",

  mount(element) {
    const onClick = () => {
      if (element.matches('[disabled], [aria-disabled="true"], [data-pk-controlled]')) return;

      const pressed = element.getAttribute("aria-pressed") !== "true";
      element.setAttribute("aria-pressed", String(pressed));
      dispatch(element, "pk:toggle:change", { pressed, value: element.getAttribute("data-value") });
    };

    element.addEventListener("click", onClick);

    return () => element.removeEventListener("click", onClick);
  },
};
