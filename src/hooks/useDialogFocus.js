import { useEffect } from "react";

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Keyboard-only use of a small dialog (confirmations):
// - on open, focuses the element marked data-autofocus (else the first button)
//   so Enter answers it straight away
// - Tab / Shift+Tab cycle inside the dialog instead of escaping to the page
// - Arrow keys move between the dialog's buttons
// - on close, focus goes back to where it was
export default function useDialogFocus(ref, open) {
  useEffect(() => {
    if (!open) return undefined;
    const dialog = ref.current;
    if (!dialog) return undefined;
    const previous = document.activeElement;

    const focusables = () =>
      [...dialog.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null,
      );

    (
      dialog.querySelector("[data-autofocus]") ||
      dialog.querySelector("button:not([disabled])")
    )?.focus();

    const onKeyDown = (e) => {
      if (!dialog.contains(e.target) && e.key !== "Tab") return;
      const isArrow = [
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
      ].includes(e.key);
      if (e.key !== "Tab" && !isArrow) return;

      const items = isArrow
        ? focusables().filter((el) => el.tagName === "BUTTON")
        : focusables();
      if (!items.length) return;
      const index = items.indexOf(document.activeElement);
      const back =
        (e.key === "Tab" && e.shiftKey) ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowUp";
      const next =
        index === -1
          ? items[back ? items.length - 1 : 0]
          : items[(index + (back ? -1 : 1) + items.length) % items.length];
      e.preventDefault();
      e.stopPropagation();
      next.focus();
    };

    // Capture: the dialog gets the keys before the page / grid underneath
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      if (previous && document.contains(previous)) previous.focus?.();
    };
  }, [open, ref]);
}
