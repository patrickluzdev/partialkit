const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

let sequence = 0;

/** Returns the element's id, generating a stable one first if it has none. */
export function ensureId(element: Element, prefix: string): string {
  if (!element.id) element.id = `${prefix}-${++sequence}`;
  return element.id;
}

/** Sets an attribute only when the author has not already set it. */
export function setDefaultAttribute(element: Element, name: string, value: string): void {
  if (!element.hasAttribute(name)) element.setAttribute(name, value);
}

/** True when focus fell back to the document instead of landing on a control. */
export function focusIsLoose(): boolean {
  const active = document.activeElement;
  return !active || active === document.body || active === document.documentElement;
}

export function focusableWithin(container: ParentNode): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
}

/** Focuses the first control inside a container. False when there is none. */
export function focusFirst(container: HTMLElement): boolean {
  const target = container.querySelector<HTMLElement>("[autofocus]") ?? focusableWithin(container)[0];
  target?.focus();
  return Boolean(target);
}

/**
 * Type-to-jump used by the menu pattern: printable characters accumulate for a
 * short window and select the first item whose text starts with the buffer.
 */
export function createTypeahead(timeout = 500): (key: string, items: HTMLElement[]) => HTMLElement | undefined {
  let buffer = "";
  let timer: ReturnType<typeof setTimeout> | undefined;

  return (key, items) => {
    if (key.length !== 1 || !/\S/.test(key)) return undefined;

    buffer += key.toLowerCase();
    clearTimeout(timer);
    timer = setTimeout(() => {
      buffer = "";
    }, timeout);

    return items.find((item) => (item.textContent ?? "").trim().toLowerCase().startsWith(buffer));
  };
}
