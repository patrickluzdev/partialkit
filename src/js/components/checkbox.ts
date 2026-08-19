import type { Component } from "../core/types.js";

/**
 * Mirrors `data-indeterminate` onto the DOM property. There is no HTML attribute
 * for the third state, so server-rendered markup has no way to express it —
 * this is the gap.
 */
export const checkbox: Component = {
  name: "checkbox",
  selector: "input[type='checkbox'].checkbox",

  mount(element) {
    const input = element as HTMLInputElement;

    const sync = () => {
      input.indeterminate = input.hasAttribute("data-indeterminate");
    };

    // Toggling by hand resolves the third state, the same way a real click does.
    const onChange = () => input.removeAttribute("data-indeterminate");

    sync();
    input.addEventListener("change", onChange);

    const observer = new MutationObserver(sync);
    observer.observe(input, { attributes: true, attributeFilter: ["data-indeterminate"] });

    return () => {
      observer.disconnect();
      input.removeEventListener("change", onChange);
    };
  },
};
