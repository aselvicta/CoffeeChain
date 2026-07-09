/**
 * AnalyticsExportBar — date range filter + Excel & PDF export buttons.
 * Used in every dashboard's analytics / overview section.
 *
 * Props:
 *   title      {string}   - Section heading
 *   subtitle   {string}   - Section sub-heading
 *   onExcel    {fn}       - called with (from, to) — parent does filtering + export
 *   onPdf      {fn}       - called with (from, to)
 */
import { useState } from 'react';
import { Calendar, Download, FileSpreadsheet } from 'lucide-react';

export function AnalyticsExportBar({ title, subtitle, onExcel, onPdf }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const today = new Date().toISOString().slice(0, 10);

  const handleTo = (val) => {
    setTo(val);
    if (from && val && val < from) setFrom(val);
  };
  const handleFrom = (val) => {
    setFrom(val);
    if (to && val && val > to) setTo(val);
  };

  const rangeLabel = from || to
    ? `${from || '…'} → ${to || today}`
    : null;

  return (
    <div className="flex items-start justify-between flex-wrap gap-4">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      {/* Controls */}
      <div className="flex items-end gap-2 flex-wrap">
        {/* Date range inputs */}
        <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
          <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
          <input
            type="date"
            value={from}
            max={to || today}
            onChange={(e) => handleFrom(e.target.value)}
            className="text-xs text-gray-700 bg-transparent outline-none w-28 cursor-pointer"
            title="From date"
          />
          <span className="text-gray-400 text-xs">→</span>
          <input
            type="date"
            value={to}
            min={from}
            max={today}
            onChange={(e) => handleTo(e.target.value)}
            className="text-xs text-gray-700 bg-transparent outline-none w-28 cursor-pointer"
            title="To date"
          />
          {(from || to) && (
            <button
              type="button"
              onClick={() => { setFrom(''); setTo(''); }}
              className="text-gray-400 hover:text-gray-600 text-xs ml-1"
              title="Clear filter"
            >
              ✕
            </button>
          )}
        </div>

        {rangeLabel && (
          <span className="text-xs text-green-700 font-medium bg-green-50 border border-green-200 rounded-lg px-2 py-1.5 hidden sm:inline">
            {rangeLabel}
          </span>
        )}

        {/* Excel */}
        <button
          type="button"
          onClick={() => onExcel(from, to)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium"
        >
          <FileSpreadsheet className="h-4 w-4 text-green-700" /> Excel
        </button>

        {/* PDF */}
        <button
          type="button"
          onClick={() => onPdf(from, to)}
          className="flex items-center gap-1.5 px-3 py-2 text-sm bg-green-700 text-white rounded-lg hover:bg-green-800 font-medium"
        >
          <Download className="h-4 w-4" /> Export PDF
        </button>
      </div>
    </div>
  );
}

/**
 * filterByDateRange — filter an array of items by their `.date` field.
 * @param {object[]} items  - each item has a `.date` string (YYYY-MM-DD or similar)
 * @param {string}   from   - start date YYYY-MM-DD (inclusive), may be empty
 * @param {string}   to     - end date YYYY-MM-DD (inclusive), may be empty
 */
export function filterByDateRange(items, from, to) {
  if (!from && !to) return items;
  return items.filter((item) => {
    const d = (item.date || item.created_at || '').slice(0, 10);
    if (!d) return true;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
}
