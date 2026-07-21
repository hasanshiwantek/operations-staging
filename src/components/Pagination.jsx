import React from "react";

const Pagination = ({
  totalPages,
  currentPage,
  onPageChange,
  pageNeighbours = 1, // current page ke left/right kitne pages show honge
}) => {
  if (totalPages === 0) return null;

  const renderPages = () => {
    const pages = [];

    if (totalPages <= 5) {
      // chhoti list me sab pages dikhao
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      const left = Math.max(2, currentPage - pageNeighbours);
      const right = Math.min(totalPages - 1, currentPage + pageNeighbours);

      pages.push(1); // first page

      if (left > 2) pages.push("..."); // gap

      for (let i = left; i <= right; i++) pages.push(i);

      if (right < totalPages - 1) pages.push("..."); // gap

      pages.push(totalPages); // last page
    }

    return pages.map((page, i) => {
      if (page === "...") {
        return (
          <span
            key={`dots-${i}`}
            className="px-3 py-2 text-sm text-gray-500 select-none"
          >
            ...
          </span>
        );
      }

      return (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          className={`px-3 py-2 rounded-md border text-sm font-medium ${
            currentPage === page
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-700 hover:bg-gray-100"
          }`}
        >
          {page}
        </button>
      );
    });
  };

  return (
    <div className="flex justify-center items-center gap-2 mt-4 flex-wrap">
      <button
        className="px-3 py-2 rounded-md border text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        ‹ Prev
      </button>

      {renderPages()}

      <button
        className="px-3 py-2 rounded-md border text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Next ›
      </button>
    </div>
  );
};

export default Pagination;
