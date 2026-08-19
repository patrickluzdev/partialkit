import { dialog } from "./components/dialog.js";
import { dropdownMenu } from "./components/dropdown-menu.js";
import { theme } from "./components/theme.js";
import { register, start } from "./core/registry.js";

export * from "./index.js";

register(theme);
register(dialog);
register(dropdownMenu);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => start(), { once: true });
} else {
  start();
}
