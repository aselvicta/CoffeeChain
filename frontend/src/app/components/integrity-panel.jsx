import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ExternalLink,
  FileText,
  Loader2,
  Search,
  Shield,
  X,
} from 'lucide-react';
import {
  compareIntegrityTransfer,
  fetchBranches,
  fetchIntegrityTransferDetail,
  fetchIntegrityTransfers,
  scanIntegrityFiltered,
} from '../api/client';
import { getUserMessage } from '../utils/user-messages';
import { HISTORY_PAGE_SIZE } from '../utils/list-limits';
import { usePaginatedList } from '../hooks/use-paginated-list';
import { PaginationBar } from './ui/pagination-bar';

function VerifiedDateCell({ value }) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return (
    <div>
      <div>
        {date.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })}
      </div>
      <div className="text-xs text-gray-500">
        {date.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </div>
  );
}

function sortByVerifiedAt(items, direction = 'desc') {
  return [...items].sort((a, b) => {
    const cmp = String(b.verified_at || '').localeCompare(String(a.verified_at || ''));
    return direction === 'desc' ? cmp : -cmp;
  });
}

function truncateHash(value, head = 12, tail = 8) {
  if (!value) return '—';
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function resolveReceiptHref(receiptUrl) {
  if (!receiptUrl) return null;
  if (receiptUrl.startsWith('http://') || receiptUrl.startsWith('https://')) {
    return receiptUrl;
  }
  const apiBase = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  const path = receiptUrl.startsWith('/') ? receiptUrl : `/${receiptUrl}`;
  return `${apiBase}${path}`;
}

function ReceiptDetails({ snapshot }) {
  if (!snapshot || Object.keys(snapshot).length === 0) {
    return (
      <p className="text-sm text-gray-500">No receipt snapshot available for this transfer.</p>
    );
  }

  const rows = [
    ['Batch', snapshot.batch_code],
    ['Fertilizer', snapshot.fertilizer_type],
    ['Quantity', snapshot.quantity_bags != null ? `${snapshot.quantity_bags} bags` : null],
    ['Farmer', snapshot.farmer_name],
    ['Ministry ID', snapshot.farmer_ministry_id],
    ['Phone', snapshot.farmer_phone],
    ['District', snapshot.farmer_district],
    ['Branch', snapshot.cooperative_name],
    ['Region', snapshot.cooperative_region],
    ['Verified at', snapshot.verified_at],
    ['Verified by', snapshot.verified_by],
    ['Receipt hash', snapshot.data_hash],
    ['Content CID', snapshot.content_cid],
    ['Tx hash', snapshot.tx_hash],
  ].filter(([, value]) => value != null && value !== '');

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-gray-100">
          {rows.map(([label, value]) => (
            <tr key={label}>
              <td className="w-36 bg-gray-50 px-4 py-2 font-medium text-gray-600">{label}</td>
              <td className="px-4 py-2 text-gray-900 break-all">{String(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const COMPARE_META = {
  ok: { label: 'Match', classes: 'bg-emerald-100 text-emerald-800', icon: CheckCircle2 },
  mismatch: { label: 'Mismatch', classes: 'bg-red-100 text-red-800', icon: AlertTriangle },
  missing_receipt: {
    label: 'No receipt',
    classes: 'bg-amber-100 text-amber-800',
    icon: AlertTriangle,
  },
  unchecked: { label: 'Not checked', classes: 'bg-gray-100 text-gray-600', icon: null },
};

function DetailModal({ item, onClose, initialView = 'compare' }) {
  const [view, setView] = useState(initialView);

  useEffect(() => {
    setView(initialView);
  }, [item.transfer_id, initialView]);

  const fields = item.field_comparison || {};
  const changes = item.changes || [];
  const receiptHref = resolveReceiptHref(item.receipt_url);
  const compareMeta = COMPARE_META[item.status] || COMPARE_META.unchecked;
  const CompareIcon = compareMeta.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              Transfer #{item.transfer_id}
            </h3>
            <p className="text-sm text-gray-600">
              {item.batch_code || 'Unknown batch'}
              {item.branch_name ? ` · ${item.branch_name}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-1">
            {[
              { id: 'receipt', label: 'Receipt' },
              { id: 'compare', label: 'Compare result' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setView(tab.id)}
                className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                  view === tab.id
                    ? 'border-green-600 text-green-800'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6 px-6 py-5">
          {view === 'receipt' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-gray-600">
                  Stored on {item.receipt_storage === 'storacha' ? 'Storacha (IPFS)' : 'local server'}
                </p>
                {receiptHref && (
                  <a
                    href={receiptHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700 hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Open JSON file
                  </a>
                )}
              </div>
              <ReceiptDetails snapshot={item.receipt_snapshot} />
            </div>
          )}

          {view === 'compare' && (
            <>
              {item.status && item.status !== 'unchecked' && (
                <div
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${compareMeta.classes}`}
                >
                  {CompareIcon && <CompareIcon className="h-4 w-4" />}
                  {compareMeta.label}
                </div>
              )}

              {changes.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-900">What changed</p>
                  <ul className="mt-2 space-y-2 text-sm text-red-800">
                    {changes.map((change) => (
                      <li key={`${change.field}-${change.database}`}>
                        <span className="font-medium capitalize">{change.field}:</span>{' '}
                        database <strong>{String(change.database ?? '—')}</strong>
                        {' → '}
                        receipt <strong>{String(change.receipt ?? '—')}</strong>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {item.status === 'ok' && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  Database hash and fields match the receipt on{' '}
                  {item.receipt_storage === 'storacha' ? 'Storacha' : 'local storage'}.
                </div>
              )}

              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-800">
                <p className="font-semibold text-gray-900">Last API modification</p>
                {item.last_api_modification?.username ? (
                  <div className="mt-2 space-y-1">
                    <p>
                      Last modified via API by{' '}
                      <strong>{item.last_api_modification.username}</strong>
                      {item.last_api_modification.modified_at && (
                        <span className="text-gray-600">
                          {' '}
                          ·{' '}
                          {new Date(item.last_api_modification.modified_at).toLocaleString()}
                        </span>
                      )}
                    </p>
                    {item.last_api_modification.changes?.length > 0 && (
                      <ul className="mt-1 list-disc space-y-0.5 pl-5 text-gray-700">
                        {item.last_api_modification.changes.map((change) => (
                          <li key={`${change.field}-${change.new}`}>
                            {change.field}: {String(change.old ?? '—')} → {String(change.new ?? '—')}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : item.status === 'mismatch' ? (
                  <p className="mt-2 text-amber-800">
                    Last modified via API by: unknown — change may have been made directly in
                    the database.
                  </p>
                ) : (
                  <p className="mt-2 text-gray-600">No API modification recorded for this transfer.</p>
                )}
              </div>

              <div>
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Hash comparison (database vs receipt)
                </h4>
                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Source</th>
                        <th className="px-4 py-2 text-left font-medium text-gray-600">Hash</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {[
                        ['Database', item.stored_hash],
                        ['Receipt (Storacha/local)', item.receipt_hash],
                      ].map(([label, hash]) => (
                        <tr key={label}>
                          <td className="px-4 py-2 text-gray-700">{label}</td>
                          <td className="px-4 py-2 font-mono text-xs text-gray-900 break-all">
                            {hash || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {Object.keys(fields).length > 0 && (
                <div>
                  <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Field comparison
                  </h4>
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Field</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Database</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Receipt</th>
                          <th className="px-4 py-2 text-left font-medium text-gray-600">Match</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {Object.entries(fields).map(([key, row]) => (
                          <tr key={key}>
                            <td className="px-4 py-2 capitalize text-gray-700">
                              {key.replace(/_/g, ' ')}
                            </td>
                            <td className="px-4 py-2 text-gray-900">{String(row.database ?? '—')}</td>
                            <td className="px-4 py-2 text-gray-900">{String(row.receipt ?? '—')}</td>
                            <td className="px-4 py-2">
                              {row.match ? (
                                <span className="text-emerald-700">Yes</span>
                              ) : (
                                <span className="font-medium text-red-700">No</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {item.explorer_url && (
                  <a
                    href={item.explorer_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Polygon Amoy
                  </a>
                )}
                {receiptHref && (
                  <a
                    href={receiptHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
                  >
                    <FileText className="h-4 w-4" />
                    Open receipt JSON
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function IntegrityPanel({ highlightTransferId = '', onScanComplete }) {
  const [branches, setBranches] = useState([]);
  const [branchType, setBranchType] = useState('all');
  const [branchId, setBranchId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [comparingId, setComparingId] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [results, setResults] = useState([]);
  const [compareResults, setCompareResults] = useState({});
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalView, setModalView] = useState('compare');
  const [dateSort, setDateSort] = useState('desc');

  useEffect(() => {
    fetchBranches()
      .then((data) => setBranches(Array.isArray(data) ? data : []))
      .catch(() => setBranches([]));
  }, []);

  const branchOptions = useMemo(() => {
    return branches.filter((branch) => {
      if (branchType === 'all') return true;
      return branch.branch_type === branchType;
    });
  }, [branches, branchType]);

  const loadTransfers = useCallback(async (overrides = {}) => {
    const activeBranchId = overrides.branchId ?? branchId;
    const activeBranchType = overrides.branchType ?? branchType;
    const activeSearch = (overrides.search ?? search).trim();
    const activeTransferId = overrides.transferId ?? highlightTransferId;

    if (!activeBranchId && !activeSearch && !activeTransferId) {
      setInfoMessage('Select a retailer or AMCOS, or search by name, batch, or transfer ID.');
      setResults([]);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setInfoMessage('');
    try {
      const data = await fetchIntegrityTransfers({
        branchId: activeBranchId,
        branchType: activeBranchType === 'all' ? '' : activeBranchType,
        search: activeSearch,
        transferId: activeTransferId,
      });
      setResults(Array.isArray(data.results) ? data.results : []);
      if (data.message) setInfoMessage(data.message);
    } catch (error) {
      setErrorMessage(getUserMessage(error, 'Could not load transfers.'));
    } finally {
      setLoading(false);
    }
  }, [branchId, branchType, search, highlightTransferId]);

  useEffect(() => {
    if (highlightTransferId) {
      loadTransfers({ transferId: highlightTransferId });
    }
  }, [highlightTransferId, loadTransfers]);

  const handleCompare = async (row) => {
    setComparingId(row.transfer_id);
    setErrorMessage('');
    try {
      const result = await compareIntegrityTransfer(row.transfer_id, { notify: true });
      setCompareResults((current) => ({ ...current, [row.transfer_id]: result }));
      if (result.notified) {
        onScanComplete?.();
      }
      openModal({ ...row, ...result }, 'compare');
    } catch (error) {
      setErrorMessage(getUserMessage(error, 'Compare failed.'));
    } finally {
      setComparingId(null);
    }
  };

  const handleScanAll = async () => {
    if (results.length === 0) {
      setInfoMessage('Load transfers first, then compare the list.');
      return;
    }
    setScanning(true);
    setErrorMessage('');
    try {
      const data = await scanIntegrityFiltered({
        branchId,
        branchType: branchType === 'all' ? '' : branchType,
        search: search.trim(),
        transferIds: results.map((row) => row.transfer_id),
        notify: true,
      });
      const mapped = {};
      (data.results || []).forEach((item) => {
        mapped[item.transfer_id] = item;
      });
      setCompareResults((current) => ({ ...current, ...mapped }));
      if (data.summary?.alerts_sent) {
        onScanComplete?.();
      }
      setInfoMessage(
        `Compared ${data.summary?.total || 0} transfers — ${data.summary?.mismatch || 0} mismatch(es).`
      );
    } catch (error) {
      setErrorMessage(getUserMessage(error, 'Batch compare failed.'));
    } finally {
      setScanning(false);
    }
  };

  const openModal = async (item, view = 'compare') => {
    setModalView(view);
    if (view === 'receipt' && !item.receipt_snapshot) {
      try {
        const detail = await fetchIntegrityTransferDetail(item.transfer_id);
        setSelectedItem({ ...item, ...detail });
        return;
      } catch {
        // Fall back to list row data if detail fetch fails.
      }
    }
    setSelectedItem(item);
  };

  const closeModal = () => {
    setSelectedItem(null);
    setModalView('compare');
  };

  const enrichedResults = useMemo(
    () =>
      results.map((row) => ({
        ...row,
        ...(compareResults[row.transfer_id] || {}),
        compare_status: compareResults[row.transfer_id]?.status || row.compare_status || 'unchecked',
      })),
    [results, compareResults]
  );

  const sortedResults = useMemo(
    () => sortByVerifiedAt(enrichedResults, dateSort),
    [enrichedResults, dateSort]
  );

  const pagination = usePaginatedList(sortedResults, HISTORY_PAGE_SIZE);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-emerald-700" />
          <h2 className="text-xl font-bold text-gray-900">Chain Integrity</h2>
        </div>
        <p className="mt-1 text-sm text-gray-600">
          Search transfers and compare the database against Storacha receipts. Mismatches trigger
          critical alerts.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm text-gray-700">
            <span className="mb-1 block font-medium">Type</span>
            <select
              value={branchType}
              onChange={(event) => {
                setBranchType(event.target.value);
                setBranchId('');
              }}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
            >
              <option value="all">All branches</option>
              <option value="RETAILER">Retailers</option>
              <option value="COOPERATIVE">AMCOS</option>
            </select>
          </label>
          <label className="text-sm text-gray-700">
            <span className="mb-1 block font-medium">Retailer / AMCOS</span>
            <select
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select branch…</option>
              {branchOptions.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-gray-700 md:col-span-2">
            <span className="mb-1 block font-medium">Search</span>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && loadTransfers()}
                placeholder="Farmer, batch, transfer ID…"
                className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:ring-2 focus:ring-green-500"
              />
            </div>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => loadTransfers()}
            disabled={loading || scanning}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search transfers
          </button>
          <button
            type="button"
            onClick={handleScanAll}
            disabled={loading || scanning || results.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
            Compare all in list
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {errorMessage}
        </div>
      )}
      {infoMessage && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          {infoMessage}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {loading ? (
          <div className="flex items-center gap-2 py-10 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading transfers…
          </div>
        ) : enrichedResults.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500">
            Select a branch or search to see verified transactions.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full min-w-[800px] divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Transfer</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Batch / Farmer</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Branch</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">
                      <button
                        type="button"
                        onClick={() => setDateSort((current) => (current === 'desc' ? 'asc' : 'desc'))}
                        className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-gray-100"
                        title={dateSort === 'desc' ? 'Newest first — click for oldest first' : 'Oldest first — click for newest first'}
                      >
                        Verified
                        {dateSort === 'desc' ? (
                          <ArrowDown className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <ArrowUp className="h-3.5 w-3.5" aria-hidden />
                        )}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">DB hash</th>
                    <th className="px-4 py-3 text-left font-medium text-gray-600">Compare</th>
                    <th className="px-4 py-3 text-right font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {pagination.pageItems.map((item) => {
                    const compareMeta = COMPARE_META[item.compare_status] || COMPARE_META.unchecked;
                    const CompareIcon = compareMeta.icon;
                    const isComparing = comparingId === item.transfer_id;
                    const highlighted =
                      highlightTransferId &&
                      String(item.transfer_id) === String(highlightTransferId);
                    return (
                      <tr
                        key={item.transfer_id}
                        className={highlighted ? 'bg-red-50/60' : 'hover:bg-gray-50'}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          #{item.transfer_id}
                          <div className="text-xs text-gray-500">{item.quantity_bags} bags</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">{item.batch_code || '—'}</div>
                          <div className="text-xs text-gray-500">{item.farmer_name || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{item.branch_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                          <VerifiedDateCell value={item.verified_at} />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">
                          {truncateHash(item.stored_hash)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${compareMeta.classes}`}
                          >
                            {CompareIcon && <CompareIcon className="h-3.5 w-3.5" />}
                            {compareMeta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openModal(item, 'receipt')}
                              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Receipt
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCompare(item)}
                              disabled={isComparing}
                              className="inline-flex items-center gap-1 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-800 hover:bg-green-100 disabled:opacity-60"
                            >
                              {isComparing ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Shield className="h-3.5 w-3.5" />
                              )}
                              Compare
                            </button>
                            {item.explorer_url && (
                              <a
                                href={item.explorer_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                              >
                                Polygon
                              </a>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationBar
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              rangeStart={pagination.rangeStart}
              rangeEnd={pagination.rangeEnd}
              onPrev={pagination.goPrev}
              onNext={pagination.goNext}
              canPrev={pagination.canPrev}
              canNext={pagination.canNext}
              className="mt-3"
            />
          </>
        )}
      </div>

      {selectedItem ? (
        <DetailModal
          item={selectedItem}
          initialView={modalView}
          onClose={closeModal}
        />
      ) : null}
    </div>
  );
}
