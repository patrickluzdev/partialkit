import { dispatch } from "../core/dom.js";
import type { Component } from "../core/types.js";

const SLOT = ".input-otp-slot";

/**
 * A one-time code split across slots. Each slot is a real input, so the value
 * reaches a form with no JavaScript at all; this adds the part that cannot be
 * written in HTML — moving between slots, and pasting a whole code at once.
 */
export const inputOtp: Component = {
  name: "input-otp",
  selector: ".input-otp",

  mount(element) {
    const slots = () => Array.from(element.querySelectorAll<HTMLInputElement>(SLOT));

    const publish = () => {
      const value = slots()
        .map((slot) => slot.value)
        .join("");

      const field = element.querySelector<HTMLInputElement>("[data-pk-otp-value]");
      if (field) field.value = value;

      dispatch(element, "pk:otp:change", { value, complete: value.length === slots().length });
      return value;
    };

    const onInput = (event: Event) => {
      const slot = (event.target as Element | null)?.closest<HTMLInputElement>(SLOT);
      if (!slot) return;

      // A slot holds one character; typing over a full one moves the rest along.
      if (slot.value.length > 1) {
        distribute(slots(), slot, slot.value);
      }

      const value = publish();
      if (!slot.value) return;

      const list = slots();
      const next = list[list.indexOf(slot) + 1];
      if (next && !next.value) next.focus();
      else if (value.length === list.length) slot.blur();
    };

    const onKeydown = (event: KeyboardEvent) => {
      const slot = (event.target as Element | null)?.closest<HTMLInputElement>(SLOT);
      if (!slot) return;

      const list = slots();
      const index = list.indexOf(slot);

      if (event.key === "Backspace" && !slot.value) {
        // Deleting from an empty slot clears the one before it, which is what
        // every native code field does.
        event.preventDefault();
        const previous = list[index - 1];
        if (!previous) return;
        previous.value = "";
        previous.focus();
        publish();
        return;
      }

      const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (step === 0) return;

      const rtl = getComputedStyle(element).direction === "rtl";
      const target = list[index + (rtl ? -step : step)];
      if (!target) return;

      event.preventDefault();
      target.focus();
    };

    const onPaste = (event: ClipboardEvent) => {
      const slot = (event.target as Element | null)?.closest<HTMLInputElement>(SLOT);
      const text = event.clipboardData?.getData("text");
      if (!slot || !text) return;

      event.preventDefault();
      distribute(slots(), slot, text);
      publish();
    };

    // Focusing a filled slot selects it, so typing replaces rather than appends.
    const onFocusIn = (event: FocusEvent) => {
      (event.target as Element | null)?.closest<HTMLInputElement>(SLOT)?.select();
    };

    prepare(element);

    element.addEventListener("input", onInput);
    element.addEventListener("keydown", onKeydown);
    element.addEventListener("paste", onPaste);
    element.addEventListener("focusin", onFocusIn);

    return () => {
      element.removeEventListener("input", onInput);
      element.removeEventListener("keydown", onKeydown);
      element.removeEventListener("paste", onPaste);
      element.removeEventListener("focusin", onFocusIn);
    };
  },
};

/** Spreads text across the slots from a starting one, then lands on the end. */
function distribute(slots: HTMLInputElement[], from: HTMLInputElement, text: string): void {
  const pattern = from.getAttribute("pattern");
  const allowed = pattern ? new RegExp(`^(?:${pattern})$`, "u") : undefined;
  const characters = Array.from(text).filter((character) => !allowed || allowed.test(character));

  const start = slots.indexOf(from);
  characters.forEach((character, offset) => {
    const slot = slots[start + offset];
    if (slot) slot.value = character;
  });

  const last = Math.min(start + characters.length, slots.length - 1);
  slots[last]?.focus();
}

function prepare(element: HTMLElement): void {
  for (const slot of element.querySelectorAll<HTMLInputElement>(SLOT)) {
    slot.maxLength = 1;
    if (!slot.hasAttribute("inputmode")) slot.inputMode = "numeric";
    if (!slot.hasAttribute("autocomplete")) slot.autocomplete = "one-time-code";
  }
}
