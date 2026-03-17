import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * A reusable pagination component for ChatFlex.
 *
 * @param {number} currentPage - The current active page (1-indexed).
 * @param {number} totalPages - The total number of pages available.
 * @param {function} onPageChange - Callback fired when page changes: (newPage) => void.
 * @param {boolean} showInfo - Whether to show the "Showing X-Y of Z" text.
 * @param {number} startItem - The rank of the first item on current page.
 * @param {number} endItem - The rank of the last item on current page.
 * @param {number} totalItems - Total count of items across all pages.
 * @param {string} className - Optional extra CSS classes for the container.
 */
const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  showInfo = false,
  startItem = 0,
  endItem = 0,
  totalItems = 0,
  className = "",
}) => {
  if (totalPages <= 1 && totalItems <= 0) return null;

  return (
    <div
      className={`bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col gap-3 md:flex-row md:items-center md:justify-between ${className}`}
    >
      {showInfo ? (
        <div className="text-xs font-semibold text-gray-500 dark:text-slate-400">
          Showing <span className="text-gray-700 dark:text-slate-200">{startItem}</span>-<span className="text-gray-700 dark:text-slate-200">{endItem}</span> of{" "}
          <span className="text-gray-700 dark:text-slate-200">{totalItems}</span>
        </div>
      ) : (
        <div className="hidden md:block" />
      )}

      <div className="flex items-center gap-2 justify-end">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 text-xs font-bold hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
        >
          <ChevronLeft size={14} />
          <span>Prev</span>
        </button>

        <div className="px-3 py-2 rounded-xl bg-gray-50 dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-xs font-bold text-gray-700 dark:text-slate-200 min-w-[100px] text-center">
          Page {currentPage} / {totalPages}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="px-3 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-200 text-xs font-bold hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
        >
          <span>Next</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
