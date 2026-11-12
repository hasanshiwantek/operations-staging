import { ChevronLeft, ChevronRight } from "lucide-react";

// Page list with gaps: first, last, and the pages around the current one,
// e.g. 1 … 4 5 6 … 47; short lists show every page
const pageItems = (current, total, siblings = 1) => {
  // first + last + current + siblings on both sides + two gaps
  if (total <= siblings * 2 + 5) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const left = Math.max(2, current - siblings);
  const right = Math.min(total - 1, current + siblings);
  const items = [1];
  if (left > 2) items.push("gap-left");
  for (let p = left; p <= right; p += 1) items.push(p);
  if (right < total - 1) items.push("gap-right");
  items.push(total);
  return items;
};

const BTN =
  "min-w-8 sm:min-w-9 h-8 sm:h-9 px-2 sm:px-3 inline-flex items-center justify-center gap-1 border rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed";

// Numbered pagination that fits a phone: Previous / Next shrink to arrows and
// the page list keeps at most 7 entries. `summary` sits left of it from md up,
// above it on smaller screens.
const NumberedPagination = ({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
  summary = null,
}) => {
  const total = Math.max(1, totalPages || 1);
  const go = (p) => {
    if (disabled || p < 1 || p > total || p === currentPage) return;
    onPageChange(p);
  };

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-3 mt-4">
      {summary && (
        <div className="text-sm text-gray-600 text-center md:text-left">
          {summary}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 max-w-full">
      <nav
        aria-label="Pagination"
        className="flex flex-wrap items-center justify-center gap-1 max-w-full"
      >
        <button
          type="button"
          onClick={() => go(currentPage - 1)}
          disabled={disabled || currentPage <= 1}
          className={`${BTN} bg-white text-gray-700 hover:bg-gray-50`}
          aria-label="Previous page"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {pageItems(currentPage, total).map((item) =>
          typeof item === "number" ? (
            <button
              key={item}
              type="button"
              onClick={() => go(item)}
              disabled={disabled}
              aria-current={item === currentPage ? "page" : undefined}
              className={`${BTN} ${
                item === currentPage
                  ? "bg-indigo-600 text-white border-indigo-600 disabled:opacity-100"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {item}
            </button>
          ) : (
            <span
              key={item}
              className="min-w-6 text-center text-sm text-gray-400 select-none"
            >
              …
            </span>
          ),
        )}

        <button
          type="button"
          onClick={() => go(currentPage + 1)}
          disabled={disabled || currentPage >= total}
          className={`${BTN} bg-white text-gray-700 hover:bg-gray-50`}
          aria-label="Next page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={16} />
        </button>
      </nav>

      {/* Jump straight to any page */}
      {total > 1 && (
        <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
          Go to page
          <select
            value={currentPage}
            onChange={(e) => go(Number(e.target.value))}
            disabled={disabled}
            className="h-8 sm:h-9 border rounded-md bg-white px-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <span className="text-gray-400">of {total}</span>
        </label>
      )}
      </div>
    </div>
  );
};

export default NumberedPagination;
