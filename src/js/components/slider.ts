import type { Component } from "../core/types.js";

/**
 * Paints the filled part of a range input. Chromium and WebKit have no
 * equivalent of Firefox's ::-moz-range-progress, so the fill is a gradient
 * driven by a custom property that this keeps in step with the value.
 */
export const slider: Component = {
  name: "slider",
  selector: "input[type='range'].slider",

  mount(element) {
    const input = element as HTMLInputElement;

    const paint = () => {
      const min = Number(input.min || 0);
      const max = Number(input.max || 100);
      const span = max - min;
      const fill = span === 0 ? 0 : ((Number(input.value) - min) / span) * 100;

      input.style.setProperty("--slider-fill", `${fill}%`);
    };

    paint();
    input.addEventListener("input", paint);

    return () => input.removeEventListener("input", paint);
  },
};
