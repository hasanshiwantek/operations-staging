import { useCallback, useRef, useState } from "react";
import { createPortal } from "react-dom";
import useDialogFocus from "../hooks/useDialogFocus";
import { useModalShortcuts } from "../hooks/useEscapeKey";

const CONFIRM_STYLES = {
  danger: "bg-red-600 hover:bg-red-700 focus:ring-red-500",
  primary: "bg-[#06245f] hover:bg-[#041b4a] focus:ring-indigo-500",
};

// Confirmation dialog (replaces window.confirm). Keyboard: the autoFocus
// button ("cancel" by default, the safe choice) is focused so Enter picks it,
// Esc cancels, Tab / arrow keys switch buttons.
const ConfirmDialog = ({
  open,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger", // "danger" (red) | "primary" (navy)
  autoFocus = "cancel", // "cancel" | "confirm"
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useRef(null);
  useDialogFocus(dialogRef, open);
  // Esc = Cancel; Ctrl+S / Ctrl+P do nothing until it is answered
  useModalShortcuts(
    { escape: () => onCancel?.(), save: () => {}, print: () => {} },
    open,
  );

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[200] p-4">
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden"
      >
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
          {message && <p className="text-sm text-gray-600">{message}</p>}
        </div>
        <div className="border-t p-4 flex gap-3 bg-gray-50">
          <button
            type="button"
            data-autofocus={autoFocus === "cancel" ? "" : undefined}
            onClick={onCancel}
            className="flex-1 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-100 font-medium text-gray-700 outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            data-autofocus={autoFocus === "confirm" ? "" : undefined}
            onClick={onConfirm}
            className={`flex-1 py-2.5 text-white rounded-xl font-medium outline-none focus:ring-2 focus:ring-offset-2 ${
              CONFIRM_STYLES[variant] || CONFIRM_STYLES.danger
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

// Promise-based confirm, a drop-in for window.confirm:
//   const [confirm, confirmDialog] = useConfirm();
//   if (!(await confirm({ title, message, confirmLabel }))) return;
//   ...and render {confirmDialog} somewhere in the component
export function useConfirm() {
  const [request, setRequest] = useState(null); // { options, resolve }

  const confirm = useCallback(
    (options = {}) =>
      new Promise((resolve) => setRequest({ options, resolve })),
    [],
  );

  const settle = (result) => {
    request?.resolve(result);
    setRequest(null);
  };

  const confirmDialog = (
    <ConfirmDialog
      {...request?.options}
      open={Boolean(request)}
      onConfirm={() => settle(true)}
      onCancel={() => settle(false)}
    />
  );

  return [confirm, confirmDialog];
}

export default ConfirmDialog;
