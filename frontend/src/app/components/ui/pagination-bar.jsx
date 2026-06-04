import { ChevronLeft, ChevronRight } from 'lucide-react';

export function PaginationBar({
  page,
  totalPages,
  total,
  rangeStart,
  rangeEnd,
  onPrev,
  onNext,
  canPrev,
  canNext,
  className = '',
}) {
  if (total === 0) return null;

  return (
    <div
      className={`flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <p className="text-sm text-gray-600">
        Showing {rangeStart}–{rangeEnd} of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canPrev}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </button>
        <span className="min-w-[5rem] text-center text-sm font-medium text-gray-700">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function RecentListNote({ shown, total, label = 'transactions', historyHint = 'History' }) {
  if (total <= shown) return null;
  return (
    <p className="text-xs text-gray-500">
      Showing the latest {shown} of {total} {label}.
      {historyHint ? ` Open ${historyHint} for the full list with pages.` : ''}
    </p>
  );
}
