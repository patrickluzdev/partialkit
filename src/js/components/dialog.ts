import { ensureId, setDefaultAttribute } from "../core/a11y.js";
import { closestWithAttribute, dispatch } from "../core/dom.js";
import type { Component } from "../core/types.js";

const OPEN_ATTRIBUTE = "data-pk-dialog-open";
const CLOSE_ATTRIBUTE = "data-pk-dialog-close";
const STATIC_ATTRIBUTE = "data-pk-dialog-static";

export function openDialog(target: string | HTMLDialogElement): void {
  const dialog = resolve(target);
  if (!dialog || dialog.open) return;
  if (!dispatch(dialog, "pk:dialog:before-open")) return;

  dialog.showModal();
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
        openDialog(opener.getAttribute(OPEN_ATTRIBUTE) ?? "");
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

    // A click landing on the dialog box itself means the backdrop was hit.
    const onClick = (event: MouseEvent) => {
      if (event.target !== element_ || element_.hasAttribute(STATIC_ATTRIBUTE)) return;
      element_.close();
    };
    const onClose = () => dispatch(element_, "pk:dialog:close", { returnValue: element_.returnValue });

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
