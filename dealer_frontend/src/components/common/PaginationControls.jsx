import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Reusable server-side pagination controls.
 *
 * Props:
 *   currentPage  – number (1-based)
 *   totalPages   – number
 *   onPageChange – (newPage: number) => void
 *   totalCount   – optional number (shows "Showing X–Y of Z")
 *   pageSize     – optional number (default 10, used for range text)
 *   label        – optional string (e.g. "vehicles", "leads")
 */
const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
  totalCount,
  pageSize = 10,
  label = 'results',
}) => {
  if (totalPages <= 1) return null;

  const from = (currentPage - 1) * pageSize + 1;
  const to = Math.min(currentPage * pageSize, totalCount ?? totalPages * pageSize);

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
      {/* Range text */}
      {totalCount != null && (
        <p className="text-gray-500 text-center md:text-left">
          Showing{' '}
          <span className="font-medium text-slate-700">{from}–{to}</span> of{' '}
          <span className="font-medium text-slate-700">{totalCount}</span> {label}
        </p>
      )}

      {/* Page buttons */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2
            text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200
            transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-700 disabled:hover:border-gray-200"
        >
          <ChevronLeft size={16} />
          <span className="hidden sm:inline">Previous</span>
        </button>

        <span className="px-3 py-2 text-sm font-medium text-slate-700">
          Page <span className="text-brand-600">{currentPage}</span> of {totalPages}
        </span>

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2
            text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200
            transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-slate-700 disabled:hover:border-gray-200"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;
