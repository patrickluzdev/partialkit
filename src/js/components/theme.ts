import { closestWithAttribute, dispatch } from "../core/dom.js";
import type { Component } from "../core/types.js";

export type Theme = "light" | "dark" | "system";

const TOGGLE_ATTRIBUTE = "data-pk-theme";
const STORAGE_KEY = "pk-theme";

export function getTheme(): Theme {
  const stored = safeRead();
  return stored === "light" || stored === "dark" ? stored : "system";
}

export function setTheme(theme: Theme): void {
  if (theme === "system") safeRemove();
  else safeWrite(theme);

  applyTheme();
}

/** Reflects the stored (or system) theme onto `<html>`. Call it in `<head>` to avoid a flash. */
export function applyTheme(): void {
  const theme = getTheme();
  const dark = theme === "dark"
    || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  document.documentElement.classList.toggle("dark", dark);
  dispatch(document.documentElement, "pk:theme:change", { theme, dark });
}

export const theme: Component = {
  name: "theme",
  selector: `[${TOGGLE_ATTRIBUTE}]`,

  setup() {
    applyTheme();

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onMediaChange = () => {
      if (getTheme() === "system") applyTheme();
    };

    const onClick = (event: MouseEvent) => {
      const toggle = closestWithAttribute(event.target, TOGGLE_ATTRIBUTE);
      if (!toggle) return;

      event.preventDefault();
      const requested = toggle.getAttribute(TOGGLE_ATTRIBUTE);
      setTheme(
        requested === "light" || requested === "dark" || requested === "system"
          ? requested
          : document.documentElement.classList.contains("dark")
            ? "light"
            : "dark",
      );
    };

    media.addEventListener("change", onMediaChange);
    document.addEventListener("click", onClick);

    return () => {
      media.removeEventListener("change", onMediaChange);
      document.removeEventListener("click", onClick);
    };
  },

  mount() {},
};

function safeRead(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function safeWrite(value: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Storage unavailable (private mode, disabled cookies): stay in-memory only.
  }
}

function safeRemove(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // See safeWrite.
  }
}
