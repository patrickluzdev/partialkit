import { checkbox } from "./components/checkbox.js";
import { contextMenu } from "./components/context-menu.js";
import { dialog } from "./components/dialog.js";
import { dropdownMenu } from "./components/dropdown-menu.js";
import { popover } from "./components/popover.js";
import { slider } from "./components/slider.js";
import { tabs } from "./components/tabs.js";
import { theme } from "./components/theme.js";
import { tooltip } from "./components/tooltip.js";
import { register, start } from "./core/registry.js";

export * from "./index.js";

register(theme);
register(checkbox);
register(dialog);
register(dropdownMenu);
register(contextMenu);
register(popover);
register(tooltip);
register(tabs);
register(slider);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => start(), { once: true });
} else {
  start();
}
