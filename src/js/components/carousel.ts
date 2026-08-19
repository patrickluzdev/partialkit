import { ensureId, setDefaultAttribute } from "../core/a11y.js";
import { dispatch } from "../core/dom.js";
import type { Component } from "../core/types.js";

/**
 * Scroll snapping is the carousel: the browser owns the movement, the momentum
 * and the touch gestures. This drives the buttons and keeps the ends honest.
 */
export const carousel: Component = {
  name: "carousel",
  selector: ".carousel",

  mount(element) {
    const content = element.querySelector<HTMLElement>(".carousel-content");
    if (!content) return;

    const vertical = element.getAttribute("data-orientation") === "vertical";
    const previous = element.querySelector<HTMLButtonElement>(".carousel-previous");
    const next = element.querySelector<HTMLButtonElement>(".carousel-next");

    const scrollBy = (direction: 1 | -1) => {
      const items = Array.from(content.querySelectorAll<HTMLElement>(".carousel-item"));
      const step = items[0]
        ? (vertical ? items[0].offsetHeight : items[0].offsetWidth) + gap(content, vertical)
        : (vertical ? content.clientHeight : content.clientWidth);

      // Reading order runs the other way in Arabic, and so does scrollLeft.
      const rtl = !vertical && getComputedStyle(element).direction === "rtl";
      const by = step * direction * (rtl ? -1 : 1);

      content.scrollBy(vertical ? { top: by } : { left: by });
    };

    const update = () => {
      const { atStart, atEnd, index } = state(content, vertical);
      if (previous) previous.disabled = atStart;
      if (next) next.disabled = atEnd;

      element.setAttribute("data-index", String(index));
      dispatch(element, "pk:carousel:change", { index, atStart, atEnd });
    };

    const onPrevious = () => scrollBy(-1);
    const onNext = () => scrollBy(1);

    const onKeydown = (event: KeyboardEvent) => {
      const forward = vertical ? "ArrowDown" : "ArrowRight";
      const backward = vertical ? "ArrowUp" : "ArrowLeft";
      if (event.key !== forward && event.key !== backward) return;

      event.preventDefault();
      scrollBy(event.key === forward ? 1 : -1);
    };

    let settle: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      clearTimeout(settle);
      settle = setTimeout(update, 100);
    };

    prepare(element, content, vertical);
    update();

    previous?.addEventListener("click", onPrevious);
    next?.addEventListener("click", onNext);
    content.addEventListener("scroll", onScroll, { passive: true });
    element.addEventListener("keydown", onKeydown);

    // Items are often swapped in after the fact, and the ends move with them.
    const items = new ResizeObserver(update);
    items.observe(content);

    return () => {
      clearTimeout(settle);
      items.disconnect();
      previous?.removeEventListener("click", onPrevious);
      next?.removeEventListener("click", onNext);
      content.removeEventListener("scroll", onScroll);
      element.removeEventListener("keydown", onKeydown);
    };
  },
};

function gap(content: HTMLElement, vertical: boolean): number {
  const styles = getComputedStyle(content);
  return Number.parseFloat(vertical ? styles.rowGap : styles.columnGap) || 0;
}

function state(content: HTMLElement, vertical: boolean): { atStart: boolean; atEnd: boolean; index: number } {
  const position = vertical ? content.scrollTop : Math.abs(content.scrollLeft);
  const size = vertical ? content.clientHeight : content.clientWidth;
  const total = vertical ? content.scrollHeight : content.scrollWidth;
  // Fractional scroll positions are normal at the ends, so a pixel of slack.
  const slack = 1;

  return {
    atStart: position <= slack,
    atEnd: position + size >= total - slack,
    index: size > 0 ? Math.round(position / size) : 0,
  };
}

function prepare(element: HTMLElement, content: HTMLElement, vertical: boolean): void {
  element.setAttribute("data-orientation", vertical ? "vertical" : "horizontal");
  setDefaultAttribute(element, "role", "region");
  setDefaultAttribute(element, "aria-roledescription", "carousel");

  // Focusable, so the arrow keys have somewhere to fire from and the slides can
  // be reached without a pointer.
  setDefaultAttribute(content, "tabindex", "0");
  setDefaultAttribute(content, "aria-live", "polite");
  ensureId(content, "pk-carousel-content");

  const items = Array.from(content.querySelectorAll<HTMLElement>(".carousel-item"));
  items.forEach((item, index) => {
    setDefaultAttribute(item, "role", "group");
    setDefaultAttribute(item, "aria-roledescription", "slide");
    setDefaultAttribute(item, "aria-label", `${index + 1} of ${items.length}`);
  });

  for (const [selector, label] of [
    [".carousel-previous", "Previous slide"],
    [".carousel-next", "Next slide"],
  ] as const) {
    const button = element.querySelector<HTMLElement>(selector);
    if (!button) continue;

    if (button.tagName === "BUTTON") setDefaultAttribute(button, "type", "button");
    setDefaultAttribute(button, "aria-controls", content.id);
    if (!button.textContent?.trim()) setDefaultAttribute(button, "aria-label", label);
  }
}
