/** Elements matching `selector` inside `root`, including `root` itself. */
export function findAll(root: ParentNode, selector: string): HTMLElement[] {
  const found = Array.from(root.querySelectorAll<HTMLElement>(selector));
  if (root instanceof HTMLElement && root.matches(selector)) found.unshift(root);
  return found;
}

/** Nearest ancestor-or-self carrying `attribute`, starting from an event target. */
export function closestWithAttribute(target: EventTarget | null, attribute: string): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLElement>(`[${attribute}]`);
}

export function dispatch(element: Element, type: string, detail?: unknown): boolean {
  return element.dispatchEvent(
    new CustomEvent(type, { bubbles: true, cancelable: true, detail }),
  );
}
