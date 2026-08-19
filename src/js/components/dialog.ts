import { ensureId, focusIsLoose, setDefaultAttribute } from "../core/a11y.js";
import { closestWithAttribute, dispatch } from "../core/dom.js";
import type { Component } from "../core/types.js";

const OPEN_ATTRIBUTE = "data-pk-dialog-open";
const CLOSE_ATTRIBUTE = "data-pk-dialog-close";
const STATIC_ATTRIBUTE = "data-pk-dialog-static";

const openers = new WeakMap<HTMLDialogElement, HTMLElement>();

/**
 * A modal <dialog> makes the page inert but leaves it scrollable, so the wheel
 * still moves the content behind a sheet that covers half the screen. Locking
 * is refcounted: a dialog opened over a dialog only unlocks once.
 */
const locked = new Set<HTMLDialogElement>();
let restoreScroll: (() => void) | undefined;

function lockScroll(element: HTMLDialogElement): void {
  if (locked.has(element)) return;
  locked.add(element);
  if (locked.size > 1) return;

  // On the root element, not on <body>: overflow only propagates from the body
  // to the viewport when the root leaves it alone, which a page is free not to.
  const root = document.documentElement.style;
  const body = document.body.style;
  const overflow = root.overflow;
  const padding = body.paddingInlineEnd;
  // Hiding the scrollbar would widen the page under the dialog, so its width is
  // handed back as padding.
  const gutter = window.innerWidth - document.documentElement.clientWidth;

  root.overflow = "hidden";
  if (gutter > 0) body.paddingInlineEnd = `${gutter}px`;

  restoreScroll = () => {
    root.overflow = overflow;
    body.paddingInlineEnd = padding;
  };
}

function unlockScroll(element: HTMLDialogElement): void {
  if (!locked.delete(element) || locked.size > 0) return;

  restoreScroll?.();
  restoreScroll = undefined;
}

/**
 * @param opener element focus should return to on close. Defaults to whatever is
 * focused, which WebKit leaves on the document because clicking a button there
 * does not focus it.
 */
export function openDialog(target: string | HTMLDialogElement, opener?: HTMLElement): void {
  const dialog = resolve(target);
  if (!dialog || dialog.open) return;
  if (!dispatch(dialog, "pk:dialog:before-open")) return;

  const source = opener ?? (focusIsLoose() ? undefined : (document.activeElement as HTMLElement | null));
  if (source) openers.set(dialog, source);

  dialog.showModal();
  dialog.setAttribute("data-state", "open");
  dispatch(dialog, "pk:dialog:open");
}

export function closeDialog(target: string | HTMLDialogElement, returnValue?: string): void {
  const dialog = resolve(target);
  if (!dialog?.open) return;

  dialog.close(returnValue);
}

export const dialog: Component = {
  name: "dialog",
  selector: "dialog.dialog, dialog.alert-dialog, dialog.sheet",

  setup() {
    const onClick = (event: MouseEvent) => {
      const opener = closestWithAttribute(event.target, OPEN_ATTRIBUTE);
      if (opener) {
        event.preventDefault();
        openDialog(opener.getAttribute(OPEN_ATTRIBUTE) ?? "", opener);
        return;
      }

      const closer = closestWithAttribute(event.target, CLOSE_ATTRIBUTE);
      if (!closer) return;

      const owner = closer.closest("dialog");
      if (!owner) return;

      event.preventDefault();
      owner.close(closer.getAttribute(CLOSE_ATTRIBUTE) || undefined);
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  },

  mount(element) {
    const element_ = element as HTMLDialogElement;
    const isAlert = element_.classList.contains("alert-dialog");

    applyLabels(element_, isAlert);
    setDefaultAttribute(element_, "data-state", element_.open ? "open" : "closed");

    // An alert dialog interrupts and expects an answer, so it never dismisses by
    // clicking away — the same reason it has no close control.
    if (isAlert) setDefaultAttribute(element_, "role", "alertdialog");

    // A click landing on the dialog box itself means the backdrop was hit.
    const onClick = (event: MouseEvent) => {
      if (event.target !== element_ || isAlert || element_.hasAttribute(STATIC_ATTRIBUTE)) return;
      element_.close();
    };
    // The `open` attribute is the one signal every engine agrees on, and it
    // covers a dialog opened by showModal() directly rather than through us.
    const openState = new MutationObserver(() => {
      if (element_.open && element_.matches(":modal")) lockScroll(element_);
      else unlockScroll(element_);
    });
    openState.observe(element_, { attributeFilter: ["open"] });
    if (element_.open && element_.matches(":modal")) lockScroll(element_);

    const onClose = () => {
      element_.setAttribute("data-state", "closed");

      // Chromium and Firefox restore focus themselves. WebKit clears it, sometimes
      // during the close event and sometimes after, so both moments are checked.
      const opener = openers.get(element_);
      openers.delete(element_);

      const restore = () => {
        if (!opener?.isConnected) return;
        if (focusIsLoose() || element_.contains(document.activeElement)) opener.focus();
      };
      restore();
      setTimeout(restore, 0);

      dispatch(element_, "pk:dialog:close", { returnValue: element_.returnValue });
    };

    element_.addEventListener("click", onClick);
    element_.addEventListener("close", onClose);

    return () => {
      openState.disconnect();
      unlockScroll(element_);
      element_.removeEventListener("click", onClick);
      element_.removeEventListener("close", onClose);
    };
  },
};

/** Points the dialog at its own heading and description, so it is announced with both. */
function applyLabels(element: HTMLDialogElement, isAlert: boolean): void {
  const prefix = isAlert ? "alert-dialog" : element.classList.contains("sheet") ? "sheet" : "dialog";

  const title = element.querySelector(`.${prefix}-title`);
  if (title) setDefaultAttribute(element, "aria-labelledby", ensureId(title, `pk-${prefix}-title`));

  const description = element.querySelector(`.${prefix}-description`);
  if (description) {
    setDefaultAttribute(element, "aria-describedby", ensureId(description, `pk-${prefix}-description`));
  }
}

function resolve(target: string | HTMLDialogElement): HTMLDialogElement | null {
  if (target instanceof HTMLDialogElement) return target;
  const found = document.getElementById(target);
  return found instanceof HTMLDialogElement ? found : null;
}
