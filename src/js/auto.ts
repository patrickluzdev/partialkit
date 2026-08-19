import { checkbox } from "./components/checkbox.js";
import { contextMenu } from "./components/context-menu.js";
import { carousel } from "./components/carousel.js";
import { dialog } from "./components/dialog.js";
import { dropdownMenu } from "./components/dropdown-menu.js";
import { hoverCard } from "./components/hover-card.js";
import { inputOtp } from "./components/input-otp.js";
import { menubar } from "./components/menubar.js";
import { popover } from "./components/popover.js";
import { slider } from "./components/slider.js";
import { tabs } from "./components/tabs.js";
import { theme } from "./components/theme.js";
import { toggle } from "./components/toggle.js";
import { tooltip } from "./components/tooltip.js";
import { register, start } from "./core/registry.js";

export * from "./index.js";

register(theme);
register(checkbox);
register(dialog);
register(dropdownMenu);
register(contextMenu);
register(menubar);
register(popover);
register(hoverCard);
register(tooltip);
register(carousel);
register(inputOtp);
register(tabs);
register(toggle);
register(slider);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => start(), { once: true });
} else {
  start();
}
