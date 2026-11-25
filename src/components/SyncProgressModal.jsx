import { AlertCircle, Ban, CheckCircle2 } from "lucide-react";
import { createPortal } from "react-dom";
import useEscapeKey from "../hooks/useEscapeKey";

const DONE_STYLES = {
  completed: {
    title: "Sync completed",
    Icon: CheckCircle2,
    color: "text-green-600",
  },
  cancelled: { title: "Sync cancelled", Icon: Ban, color: "text-amber-600" },
  failed: { title: "Sync failed", Icon: AlertCircle, color: "text-red-600" },
};

// A count from the API ("1200" or 1200) as a number; null when missing
const toCount = (value) => {
  const n = Number(value);
  return value === null ||
    value === undefined ||
    value === "" ||
    !Number.isFinite(n)
    ? null
    : Math.max(0, n);
};
const formatCount = (n) => (n == null ? null : n.toLocaleString());

const Stat = ({ label, value }) => (
  <div className="rounded-lg bg-gray-50 px-3 py-2">
    <div className="text-[11px] uppercase tracking-wide text-gray-500">
      {label}
    </div>
    <div className="mt-0.5 text-sm font-semibold text-gray-800 tabular-nums">
      {value ?? "—"}
    </div>
  </div>
);

// BigCommerce order sync status.
// While running (progress set): live counts, Cancel, and Hide (sync keeps going).
// Once done (result set): final summary and Close.
const SyncProgressModal = ({
  storeName,
  progress,
  result,
  cancelling,
  onCancel,
  onHide,
  onClose,
}) => {
  const running = Boolean(progress);
  const data = progress || result || {};
  const done = !running && DONE_STYLES[data.status];
  // progress: { total: orders to sync, synced: orders synced so far }
  const synced = toCount(data.synced) ?? 0;
  const total = toCount(data.total);
  const hasTotal = total != null && total > 0;
  const percent = hasTotal
    ? Math.min(100, Math.round((synced / total) * 100))
    : null;
  // remaining: orders still to sync (worked out when the API leaves it out)
  const remaining =
    toCount(data.remaining) ?? (hasTotal ? Math.max(total - synced, 0) : null);
  // The API can report "completed" with orders still left (e.g. 80 of 2432)
  const partial = data.status === "completed" && remaining > 0;

  useEscapeKey(running ? onHide : onClose);

  const title = partial
    ? "Sync stopped early"
    : done
      ? done.title
      : cancelling
        ? "Cancelling sync..."
        : `Syncing ${storeName ? storeName.toUpperCase() + " " : ""}orders`;

  const message = running
    ? cancelling
      ? "Stopping after the current batch. Orders already saved are kept."
      : data.message || "Starting sync..."
    : data.status === "cancelled"
      ? "Orders saved before the cancel are kept. The next sync continues from the last order."
      : partial
        ? `${formatCount(synced)} of ${formatCount(total)} orders were synced; ${formatCount(remaining)} are still left. Run Sync Orders again to sync the rest.`
        : data.message;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-busy={running}
      aria-label={title}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex items-center gap-3 pr-6">
          {partial ? (
            <AlertCircle className="h-6 w-6 shrink-0 text-amber-600" />
          ) : done ? (
            <done.Icon className={`h-6 w-6 shrink-0 ${done.color}`} />
          ) : (
            <span className="h-6 w-6 shrink-0 animate-spin rounded-full border-[3px] border-indigo-200 border-t-indigo-600" />
          )}
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
        </div>

        {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}

        {hasTotal ? (
          // Known total: a real bar, synced of total
          <div className="mt-4">
            <div className="flex items-baseline justify-between text-xs text-gray-600 tabular-nums">
              <span>
                {formatCount(synced)} of {formatCount(total)} orders
              </span>
              <span className="font-semibold text-gray-800">{percent}%</span>
            </div>
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={Math.min(synced, total)}
              aria-label="Orders synced"
              className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100"
            >
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${
                  done && (data.status !== "completed" || partial)
                    ? "bg-amber-400"
                    : "bg-indigo-500"
                }`}
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        ) : (
          // No total yet (sync just started): an empty bar at 0%, so nothing
          // looks synced before the API reports any progress
          running && (
            <div className="mt-4">
              <div className="flex items-baseline justify-between text-xs text-gray-500 tabular-nums">
                <span>Counting orders to sync...</span>
                <span className="font-semibold text-gray-700">0%</span>
              </div>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={0}
                aria-label="Orders synced"
                className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-gray-100"
              />
            </div>
          )
        )}

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Stat label="Synced" value={formatCount(synced)} />
          <Stat label="Total" value={formatCount(hasTotal ? total : null)} />
          <Stat label="Remaining" value={formatCount(remaining)} />
          <Stat label="Batches" value={data.batches ?? 0} />
          <Stat label="Last order" value={data.last_order} />
        </div>
        {data.started_at && (
          <p className="mt-2 text-xs text-gray-400">
            Started {data.started_at}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          {running ? (
            <>
              <button
                type="button"
                onClick={onHide}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
              >
                Run in background
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={cancelling}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-progress disabled:opacity-60"
              >
                {cancelling ? "Cancelling..." : "Cancel sync"}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default SyncProgressModal;
