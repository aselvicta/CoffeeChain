import { useMemo, useState } from 'react';
import {
  History,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Search,
  Calendar,
} from 'lucide-react';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'receipts', label: 'Receipts' },
  { id: 'distributions', label: 'Distributions' },
];

export function CooperativeHistoryPanel({ receivedBatches, distributions }) {
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const timeline = useMemo(() => {
    const receipts = receivedBatches.map((batch) => ({
      key: `receipt-${batch.id}`,
      id: batch.id,
      kind: 'receipt',
      title: batch.batchCode || `Batch ${batch.id}`,
      subtitle: `${batch.bags} bags from ${batch.source}`,
      date: batch.date,
      status: batch.status,
    }));
    const dists = distributions.map((dist) => ({
      key: `dist-${dist.id}`,
      id: dist.id,
      kind: 'distribution',
      title: dist.farmer,
      subtitle: `${dist.bags} bags • OTP ${dist.otp}`,
      date: dist.date,
      status: dist.otp === 'Verified' ? 'VERIFIED' : 'DISPATCHED',
    }));

    let items = [...receipts, ...dists];
    if (filter === 'receipts') items = receipts;
    if (filter === 'distributions') items = dists;

    const needle = search.trim().toLowerCase();
    if (needle) {
      items = items.filter((item) =>
        [item.title, item.subtitle, item.date]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(needle)
      );
    }

    return items.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [receivedBatches, distributions, filter, search]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Transaction History</h2>
          <p className="text-sm text-gray-600">
            All fertilizer receipts and farmer distributions for this AMCOS.
          </p>
        </div>
        <div className="flex gap-2">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setFilter(option.id)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                filter === option.id
                  ? 'border-green-600 bg-green-50 text-green-800'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search history"
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500"
        />
      </div>

      {timeline.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
          <History className="mx-auto mb-2 h-8 w-8 text-gray-400" />
          <p className="text-sm font-medium text-gray-700">No records yet</p>
          <p className="mt-1 text-xs text-gray-500">
            History will appear here as you receive fertilizer and distribute it
            to farmers.
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {timeline.map((item) => (
            <li
              key={item.key}
              className="flex items-start gap-4 rounded-lg border border-gray-200 p-4 transition-colors hover:bg-gray-50"
            >
              <div
                className={`rounded-lg p-2.5 ${
                  item.kind === 'receipt'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-green-100 text-green-700'
                }`}
              >
                {item.kind === 'receipt' ? (
                  <ArrowDownLeft className="h-4 w-4" />
                ) : (
                  <ArrowUpRight className="h-4 w-4" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-gray-900">{item.title}</p>
                  {item.status === 'VERIFIED' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      <ShieldCheck className="h-3 w-3" />
                      Verified
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">{item.subtitle}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar className="h-3 w-3" />
                {item.date || '—'}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
