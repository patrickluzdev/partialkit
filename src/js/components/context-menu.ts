import { ensureId, setDefaultAttribute } from "../core/a11y.js";
import { position } from "../core/anchor.js";
import type { Component } from "../core/types.js";

/**
 * Opens a menu where the pointer is. The panel itself is a dropdown menu — the
 * roles, keyboard handling and styling are the same component; only the way it
 * is summoned differs.
 */
export const contextMenu: Component = {
  name: "context-menu",
  selector: "[data-pk-context-menu]",

  mount(element) {
    const id = element.getAttribute("data-pk-context-menu");
    const menu = id ? document.getElementById(id) : null;
    if (!menu) return;

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();

      // The context-menu key and Shift+F10 fire the same event with no click
      // count behind it; those open against the element, not against 0,0.
      if (event.detail === 0 && event.clientX === 0 && event.clientY === 0) {
        menu.removeAttribute("data-pk-point");
        menu.setAttribute("data-pk-anchor", `#${CSS.escape(ensureId(element, "pk-context-menu-target"))}`);
      } else {
        menu.setAttribute("data-pk-point", `${event.clientX},${event.clientY}`);
      }

      if (menu.matches(":popover-open")) {
        position(menu);
        return;
      }
      menu.showPopover();
    };

    setDefaultAttribute(element, "aria-haspopup", "menu");
    setDefaultAttribute(element, "aria-controls", ensureId(menu, "pk-dropdown-menu"));
    // Reachable by keyboard, so the context-menu key has somewhere to fire from.
    if (!element.hasAttribute("tabindex") && !element.matches("a[href], button, input, select, textarea")) {
      element.tabIndex = 0;
    }

    element.addEventListener("contextmenu", onContextMenu);

    return () => element.removeEventListener("contextmenu", onContextMenu);
  },
};
