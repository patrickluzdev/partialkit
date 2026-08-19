export type Side = "top" | "bottom" | "left" | "right";
export type Align = "start" | "center" | "end";
export type Placement = Side | `${Side}-${Exclude<Align, "center">}`;

const DEFAULT_OFFSET = 4;
const VIEWPORT_PADDING = 8;

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

/**
 * Where a panel sits along the axis it is not opening on: flush with the
 * anchor's start or end, or centred on it.
 */
function alignTo(
  anchorStart: number,
  anchorSize: number,
  panelSize: number,
  align: Align,
  offset: number,
  viewport: number,
): number {
  const raw =
    align === "end"
      ? anchorStart + anchorSize - panelSize
      : align === "center"
        ? anchorStart + anchorSize / 2 - panelSize / 2
        : anchorStart;

  return clamp(raw + offset, viewport - panelSize - VIEWPORT_PADDING);
}

/** Places a panel against a rectangle, flipping and clamping to stay on screen. */
export function positionAgainst(element: HTMLElement, anchorRect: DOMRect): void {
  const placement = (element.getAttribute("data-pk-placement") ?? "bottom-start") as Placement;
  const [physicalSide, alignName] = placement.split("-");
  const align = (alignName ?? "center") as Align;

  // Placements are authored in reading order, so a side flips with direction.
  const rtl = getComputedStyle(element).direction === "rtl";
  const side =
    rtl && physicalSide === "right"
      ? "left"
      : rtl && physicalSide === "left"
        ? "right"
        : physicalSide;

  const horizontal = side === "right" || side === "left";
  const offset = Number(element.getAttribute("data-pk-offset") ?? DEFAULT_OFFSET);
  // Nudge along the cross axis, for a panel whose own padding has to be
  // cancelled before its first item lines up with the trigger.
  const alignOffset = Number(element.getAttribute("data-pk-align-offset") ?? 0);
  const { offsetWidth: width, offsetHeight: height } = element;

  let top: number;
  let left: number;

  if (horizontal) {
    const needed = width + offset + VIEWPORT_PADDING;
    const fitsRight = window.innerWidth - anchorRect.right >= needed;
    const fitsLeft = anchorRect.left >= needed;
    const placeLeft = side === "left" ? fitsLeft || !fitsRight : !fitsRight && fitsLeft;

    left = placeLeft ? anchorRect.left - width - offset : anchorRect.right + offset;
    // Reading order runs down either way, so this axis never flips with direction.
    top = alignTo(anchorRect.top, anchorRect.height, height, align, alignOffset, window.innerHeight);
  } else {
    const needed = height + offset + VIEWPORT_PADDING;
    const fitsBelow = window.innerHeight - anchorRect.bottom >= needed;
    const fitsAbove = anchorRect.top >= needed;
    const placeAbove = side === "top" ? fitsAbove || !fitsBelow : !fitsBelow && fitsAbove;

    top = placeAbove ? anchorRect.top - height - offset : anchorRect.bottom + offset;

    const inline = rtl && align !== "center" ? (align === "end" ? "start" : "end") : align;
    left = alignTo(anchorRect.left, anchorRect.width, width, inline, alignOffset, window.innerWidth);
  }

  element.style.top = `${Math.round(top)}px`;
  element.style.left = `${Math.round(left)}px`;

  // Which way it actually opened, for the animation to slide from.
  element.setAttribute("data-side", horizontal ? side : top < anchorRect.top ? "top" : "bottom");
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
