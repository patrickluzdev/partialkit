import { checkbox } from "./components/checkbox.js";
import { dialog } from "./components/dialog.js";
import { dropdownMenu } from "./components/dropdown-menu.js";
import { slider } from "./components/slider.js";
import { theme } from "./components/theme.js";
import { register, start } from "./core/registry.js";

export * from "./index.js";

register(theme);
register(checkbox);
register(dialog);
register(dropdownMenu);
register(slider);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => start(), { once: true });
} else {
  start();
}
