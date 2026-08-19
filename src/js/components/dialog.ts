import { ensureId, focusIsLoose, setDefaultAttribute } from "../core/a11y.js";
import { closestWithAttribute, dispatch } from "../core/dom.js";
import type { Component } from "../core/types.js";

const OPEN_ATTRIBUTE = "data-pk-dialog-open";
const CLOSE_ATTRIBUTE = "data-pk-dialog-close";
const STATIC_ATTRIBUTE = "data-pk-dialog-static";

const openers = new WeakMap<HTMLDialogElement, HTMLElement>();

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
  selector: "dialog.dialog",

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
    applyLabels(element_);
    setDefaultAttribute(element_, "data-state", element_.open ? "open" : "closed");

    // A click landing on the dialog box itself means the backdrop was hit.
    const onClick = (event: MouseEvent) => {
      if (event.target !== element_ || element_.hasAttribute(STATIC_ATTRIBUTE)) return;
      element_.close();
    };
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
      element_.removeEventListener("click", onClick);
      element_.removeEventListener("close", onClose);
    };
  },
};

/** Points the dialog at its own heading and description, so it is announced with both. */
function applyLabels(element: HTMLDialogElement): void {
  const title = element.querySelector(".dialog-title");
  if (title) setDefaultAttribute(element, "aria-labelledby", ensureId(title, "pk-dialog-title"));

  const description = element.querySelector(".dialog-description");
  if (description) {
    setDefaultAttribute(element, "aria-describedby", ensureId(description, "pk-dialog-description"));
  }
}

function resolve(target: string | HTMLDialogElement): HTMLDialogElement | null {
  if (target instanceof HTMLDialogElement) return target;
  const found = document.getElementById(target);
  return found instanceof HTMLDialogElement ? found : null;
}
