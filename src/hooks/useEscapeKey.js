import { useEffect, useRef } from "react";

// Open layers (modals, confirm dialogs, pop-out editors, the sheet's find bar
// / full screen), oldest first. Keys go only to the top one, so a confirm
// dialog inside a modal closes before the modal, and a modal before the sheet
// leaves full screen.
const stack = [];

// Ctrl/Cmd + key → layer handler
const CTRL_KEYS = { s: "save", p: "print" };

const onKeyDown = (e) => {
  if (e.defaultPrevented || !stack.length) return;
  const handlers = stack[stack.length - 1].current;

  // Esc: already handled when e.g. an open dropdown prevented it
  if (e.key === "Escape") {
    if (!handlers.escape) return;
    e.preventDefault();
    handlers.escape(e);
    return;
  }

  if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey) return;
  const handler = handlers[CTRL_KEYS[e.key.toLowerCase()]];
  if (!handler) return;
  e.preventDefault();
  if (e.repeat) return;
  handler(e);
};

const register = (entry) => {
  stack.push(entry);
  if (stack.length === 1) window.addEventListener("keydown", onKeyDown);
  return () => {
    const index = stack.lastIndexOf(entry);
    if (index !== -1) stack.splice(index, 1);
    if (!stack.length) window.removeEventListener("keydown", onKeyDown);
  };
};

// Keyboard handling for an open layer, active while it is the top-most one:
//   escape  Esc
//   save    Ctrl+S
//   print   Ctrl+P
// Leave a handler out to keep the browser's default for that key.
export function useModalShortcuts(handlers, enabled = true) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled) return undefined;
    // Own wrapper object so each registration is a distinct stack entry
    return register({
      get current() {
        return handlersRef.current || {};
      },
    });
  }, [enabled]);
}

// Runs handler when Esc is pressed while this layer is on top
export default function useEscapeKey(handler, enabled = true) {
  useModalShortcuts({ escape: handler }, enabled);
}
