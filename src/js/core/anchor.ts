export type Placement =
  | "bottom-start"
  | "bottom-end"
  | "bottom"
  | "top-start"
  | "top-end"
  | "top"
  | "right-start"
  | "left-start";

const DEFAULT_OFFSET = 4;
const SIDE_OFFSET = 0;
const VIEWPORT_PADDING = 8;
/** Cancels a panel's own padding so its first item lines up with the trigger. */
const PANEL_PADDING = 4;

/**
 * The element a floating panel is measured against: whatever `data-pk-anchor`
 * names, or the control whose `popovertarget` points at it.
 */
export function anchorOf(element: HTMLElement): HTMLElement | null {
  const selector = element.getAttribute("data-pk-anchor");
  if (selector) return document.querySelector<HTMLElement>(selector);
  if (!element.id) return null;
  return document.querySelector<HTMLElement>(`[popovertarget="${CSS.escape(element.id)}"]`);
}

function clamp(value: number, max: number): number {
  return Math.min(Math.max(value, VIEWPORT_PADDING), Math.max(max, VIEWPORT_PADDING));
}

/** Places a panel against a rectangle, flipping and clamping to stay on screen. */
export function positionAgainst(element: HTMLElement, anchorRect: DOMRect): void {
  const placement = (element.getAttribute("data-pk-placement") ?? "bottom-start") as Placement;
  const [physicalSide, align] = placement.split("-");

  // Placements are authored in reading order, so a side flips with direction.
  const rtl = getComputedStyle(element).direction === "rtl";
  const side =
    rtl && physicalSide === "right"
      ? "left"
      : rtl && physicalSide === "left"
        ? "right"
        : physicalSide;

  const offset = Number(
    element.getAttribute("data-pk-offset") ??
      (side === "right" || side === "left" ? SIDE_OFFSET : DEFAULT_OFFSET),
  );
  const { offsetWidth: width, offsetHeight: height } = element;

  let top: number;
  let left: number;

  if (side === "right" || side === "left") {
    const needed = width + offset + VIEWPORT_PADDING;
    const fitsRight = window.innerWidth - anchorRect.right >= needed;
    const fitsLeft = anchorRect.left >= needed;
    const placeLeft = side === "left" ? fitsLeft || !fitsRight : !fitsRight && fitsLeft;

    left = placeLeft ? anchorRect.left - width - offset : anchorRect.right + offset;
    top = clamp(anchorRect.top - PANEL_PADDING, window.innerHeight - height - VIEWPORT_PADDING);
  } else {
    const needed = height + offset + VIEWPORT_PADDING;
    const fitsBelow = window.innerHeight - anchorRect.bottom >= needed;
    const fitsAbove = anchorRect.top >= needed;
    const placeAbove = side === "top" ? fitsAbove || !fitsBelow : !fitsBelow && fitsAbove;

    top = placeAbove ? anchorRect.top - height - offset : anchorRect.bottom + offset;

    const alignEnd = rtl ? align !== "end" : align === "end";
    const centred = align === undefined;
    const start = centred
      ? anchorRect.left + anchorRect.width / 2 - width / 2
      : alignEnd
        ? anchorRect.right - width
        : anchorRect.left;

    left = clamp(start, window.innerWidth - width - VIEWPORT_PADDING);
  }

  element.style.top = `${Math.round(top)}px`;
  element.style.left = `${Math.round(left)}px`;

  // Which way it actually opened, for the animation to slide from.
  element.setAttribute("data-side", side === "right" || side === "left" ? side : top < anchorRect.top ? "top" : "bottom");
}

/**
 * Places a panel against its anchor, or against the point in `data-pk-point`
 * when it was opened from one — a context menu opens where the pointer is.
 */
export function position(element: HTMLElement): void {
  const point = element.getAttribute("data-pk-point");
  if (point) {
    const [x = 0, y = 0] = point.split(",").map(Number);
    positionAgainst(element, new DOMRect(x, y, 0, 0));
    return;
  }

  const anchor = anchorOf(element);
  if (anchor) positionAgainst(element, anchor.getBoundingClientRect());
}

/**
 * Keeps a panel placed while it is open. Returns a cleanup that stops watching.
 */
export function track(element: HTMLElement, place: () => void): () => void {
  place();
  window.addEventListener("scroll", place, { capture: true, passive: true });
  window.addEventListener("resize", place, { passive: true });

  return () => {
    window.removeEventListener("scroll", place, { capture: true });
    window.removeEventListener("resize", place);
  };
}
