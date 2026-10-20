import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Let React paint (modal, progress) before the next chunk of heavy export work.
// requestAnimationFrame never fires in a background tab, so a timeout keeps the export moving there.
export const yieldToBrowser = () =>
  new Promise((resolve) => {
    const fallback = setTimeout(resolve, 50);
    requestAnimationFrame(() => {
      clearTimeout(fallback);
      setTimeout(resolve, 0);
    });
  });

// Work for about this long before yielding — big enough to keep yield overhead small,
// short enough for the progress bar and Cancel button to stay responsive
export const EXPORT_SLICE_MS = 150;

// Thrown to stop an export the user cancelled
export class ExportCancelledError extends Error {}

// Blocking modal shown while a file export runs; progress is 0–1, or null for an indeterminate step
const ExportProgressModal = ({ title, message, progress = null, onCancel }) => {
  const percent =
    progress === null ? null : Math.round(Math.min(Math.max(progress, 0), 1) * 100);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-label={title}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      style={{ cursor: "progress" }}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg"
        style={{ cursor: "default" }}
      >
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            title="Cancel export"
            aria-label="Cancel export"
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        )}

        <div className="flex items-center gap-3 pr-6">
          <span className="h-6 w-6 shrink-0 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
        </div>

        <p className="mt-3 text-sm text-gray-600">{message}</p>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          {percent === null ? (
            <div className="h-full w-1/3 animate-pulse rounded-full bg-indigo-400" />
          ) : (
            <div
              className="h-full rounded-full bg-indigo-600 transition-[width] duration-200"
              style={{ width: `${percent}%` }}
            />
          )}
        </div>
        {percent !== null && (
          <div className="mt-1 text-right text-xs text-gray-500">{percent}%</div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            The download starts automatically when ready.
          </p>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ExportProgressModal;
