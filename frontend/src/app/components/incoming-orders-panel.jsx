import { useMemo, useState } from 'react';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  Truck,
  Loader2,
  AlertCircle,
  RefreshCw,
  Ban,
  X,
  Send,
  Eye,
} from 'lucide-react';
import { acceptOrder, rejectOrder, dispatchOrder, fetchOrderAvailableBatches } from '../api/client';
import { sortByDateDesc } from '../utils/list-limits';

const STATUS_CONFIG = {
  PENDING:    { label: 'Pending Review', classes: 'bg-amber-100 text-amber-700',    Icon: Clock },
  ACCEPTED:   { label: 'Accepted',       classes: 'bg-blue-100 text-blue-700',      Icon: CheckCircle2 },
  REJECTED:   { label: 'Rejected',       classes: 'bg-red-100 text-red-600',        Icon: XCircle },
  PROCESSING: { label: 'Processing',     classes: 'bg-purple-100 text-purple-700',  Icon: Package },
  READY:      { label: 'Ready',          classes: 'bg-green-100 text-green-700',    Icon: CheckCircle2 },
  DISPATCHED: { label: 'Dispatched',     classes: 'bg-green-100 text-green-700',    Icon: Truck },
  DELIVERED:  { label: 'Delivered',      classes: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle2 },
  CANCELLED:  { label: 'Cancelled',      classes: 'bg-gray-100 text-gray-500',      Icon: Ban },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${cfg.classes}`}>
      <cfg.Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function safeStr(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return v.batch_code || v.name || v.id || JSON.stringify(v);
  return String(v);
}

function Detail({ label, value, className = '' }) {
  const display = safeStr(value);
  return (
    <div className={className}>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm text-gray-800">{display || '—'}</p>
    </div>
  );
}

export function IncomingOrdersPanel({ orders = [], onRefresh }) {
  const [selected, setSelected]       = useState(null);
  const [busyId, setBusyId]           = useState(null);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState('');
  const [filter, setFilter]           = useState('pending');
  const [supplierNote, setSupplierNote] = useState('');
  const [showReject, setShowReject]   = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [refreshing, setRefreshing]   = useState(false);
  const [dispatching, setDispatching]     = useState(false);
  const [batches, setBatches]             = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);

  async function handleRefresh() {
    setRefreshing(true);
    try { await onRefresh?.(); } finally { setRefreshing(false); }
  }

  const sorted = useMemo(() => sortByDateDesc(orders), [orders]);
  const pendingCount    = sorted.filter((o) => o.status === 'PENDING').length;
  const inProgressCount = sorted.filter((o) => ['ACCEPTED', 'PROCESSING', 'READY'].includes(o.status)).length;
  const doneCount       = sorted.filter((o) => ['DISPATCHED', 'DELIVERED', 'REJECTED', 'CANCELLED'].includes(o.status)).length;

  const displayed = useMemo(() => {
    if (filter === 'pending') return sorted.filter((o) => o.status === 'PENDING');
    if (filter === 'active')  return sorted.filter((o) => ['ACCEPTED', 'PROCESSING', 'READY'].includes(o.status));
    if (filter === 'done')    return sorted.filter((o) => ['DISPATCHED', 'DELIVERED', 'REJECTED', 'CANCELLED'].includes(o.status));
    return sorted;
  }, [sorted, filter]);

  async function openReview(order) {
    setSelected(order);
    setSupplierNote('');
    setShowReject(false);
    setRejectReason('');
    setSelectedBatch(null);
    setBatches([]);
    setError('');
    // Pre-load batches for this fertilizer type
    if (['PENDING', 'ACCEPTED'].includes(order.status)) {
      setLoadingBatches(true);
      try {
        const data = await fetchOrderAvailableBatches(order.fertilizer_type);
        setBatches(Array.isArray(data) ? data : []);
      } catch (err) {
        setBatches([]);
        setError(err.message || 'Could not load warehouse stock.');
      } finally { setLoadingBatches(false); }
    }
  }

  function closeReview() {
    setSelected(null);
    setShowReject(false);
    setRejectReason('');
    setSupplierNote('');
    setSelectedBatch(null);
    setBatches([]);
  }

  async function handleDispatch() {
    if (!selected || !selectedBatch) return;
    setDispatching(true);
    setError('');
    try {
      await dispatchOrder(selected.id, selectedBatch.id);
      setSuccess(`Order #${selected.id} dispatched from batch ${selectedBatch.batch_code}.`);
      closeReview();
      await onRefresh?.();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to dispatch order.');
    } finally { setDispatching(false); }
  }

  async function handleAccept() {
    if (!selected) return;
    setBusyId(selected.id);
    setError('');
    try {
      await acceptOrder(selected.id, supplierNote);
      setSuccess(`Order #${selected.id} accepted.`);
      closeReview();
      await onRefresh?.();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to accept order.');
    } finally { setBusyId(null); }
  }

  async function handleReject() {
    if (!selected) return;
    setBusyId(selected.id);
    setError('');
    try {
      await rejectOrder(selected.id, rejectReason, '');
      setSuccess(`Order #${selected.id} rejected.`);
      closeReview();
      await onRefresh?.();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to reject order.');
    } finally { setBusyId(null); }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            Incoming Orders
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                {pendingCount}
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500">Review and respond to fertilizer orders from retailers and cooperatives.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 text-sm">
        {[
          { key: 'pending', label: `Pending (${pendingCount})` },
          { key: 'active',  label: `In Progress (${inProgressCount})` },
          { key: 'done',    label: `Completed (${doneCount})` },
          { key: 'all',     label: `All (${sorted.length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`flex-1 rounded-md px-3 py-1.5 font-medium transition-colors ${
              filter === tab.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-3 text-sm text-gray-600">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" /> {success}
        </div>
      )}

      {/* Empty */}
      {displayed.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 py-12 text-center">
          <Inbox className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">No orders in this category.</p>
        </div>
      )}

      {/* Order list */}
      <div className="space-y-2">
        {displayed.map((order) => (
          <div
            key={order.id}
            className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-gray-900">
                  {order.quantity_bags} bags · {order.fertilizer_type}
                </span>
                <StatusBadge status={order.status} />
                {order.order_type === 'CUSTOM' && (
                  <span className="rounded-full border border-gray-200 px-2 py-0.5 text-xs text-blue-600">
                    Custom
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-gray-400">
                {order.branch_name} · Order #{order.id} · {new Date(order.created_at).toLocaleDateString()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openReview(order)}
              className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              title="Review order"
            >
              <Eye className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>

      {/* Review modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            {/* Modal header */}
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <p className="text-xs text-gray-400">Order #{selected.id} · {new Date(selected.created_at).toLocaleDateString()}</p>
                <h3 className="mt-0.5 font-semibold text-gray-900">
                  {selected.quantity_bags} bags of {selected.fertilizer_type}
                </h3>
                <p className="text-sm text-gray-500">{selected.branch_name} ({selected.branch_type})</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={selected.status} />
                <button
                  onClick={closeReview}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <Detail label="Fertilizer Type" value={selected.fertilizer_type} />
                <Detail label="Order Type"      value={selected.order_type_display} />
                <Detail label="Quantity"         value={`${selected.quantity_bags} bags`} />
                <Detail label="Unit Weight"      value={`${selected.unit_weight_kg} kg/bag`} />
                {selected.preferred_batch_code && (
                  <Detail label="Preferred Batch" value={selected.preferred_batch_code} />
                )}
                <Detail label="Delivery Address" value={selected.delivery_address} />
                {selected.required_by_date && (
                  <Detail label="Required By" value={selected.required_by_date} />
                )}
                {selected.custom_specifications && (
                  <Detail label="Custom Specs" value={selected.custom_specifications} className="col-span-2" />
                )}
                {selected.notes && (
                  <Detail label="Customer Notes" value={selected.notes} className="col-span-2" />
                )}
                {selected.supplier_notes && (
                  <Detail label="Your Notes" value={selected.supplier_notes} className="col-span-2" />
                )}
                {selected.rejected_reason && (
                  <Detail label="Rejection Reason" value={selected.rejected_reason} className="col-span-2" />
                )}
              </div>

              {/* Actions — Pending: accept / reject */}
              {selected.status === 'PENDING' && (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  {!showReject ? (
                    <>
                      <textarea
                        value={supplierNote}
                        onChange={(e) => setSupplierNote(e.target.value)}
                        rows={2}
                        placeholder="Optional note to the customer…"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleAccept}
                          disabled={busyId === selected.id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-70 transition-all"
                        >
                          {busyId === selected.id ? (
                            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Accepting…</>
                          ) : (
                            <><CheckCircle2 className="h-3.5 w-3.5" /> Accept</>
                          )}
                        </button>
                        <button
                          onClick={() => setShowReject(true)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500">Reason for rejection</p>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={2}
                        placeholder="e.g. Out of stock, cannot fulfill request…"
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleReject}
                          disabled={busyId === selected.id || !rejectReason.trim()}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-40"
                        >
                          {busyId === selected.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                          Confirm Reject
                        </button>
                        <button
                          onClick={() => { setShowReject(false); setRejectReason(''); }}
                          className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Actions — Dispatch from stock (PENDING or ACCEPTED) */}
              {['PENDING', 'ACCEPTED'].includes(selected.status) && (() => {
                const enoughBatches = batches.filter((b) => b.available_bags >= selected.quantity_bags);
                return (
                <div className="border-t border-gray-100 pt-4 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Dispatch from Warehouse Stock
                  </p>

                  {loadingBatches ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" /> Checking stock…
                    </div>
                  ) : batches.length === 0 ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="text-sm font-medium text-amber-800">No {selected.fertilizer_type} batches in warehouse</p>
                      <p className="mt-0.5 text-xs text-amber-600">Add stock to the warehouse first, or reject this order.</p>
                    </div>
                  ) : (
                    <>
                      {enoughBatches.length === 0 && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                          <p className="text-sm font-medium text-red-800">Not enough stock for this order</p>
                          <p className="mt-0.5 text-xs text-red-600">
                            Need {selected.quantity_bags} bags — restock or choose a batch with enough available bags.
                          </p>
                        </div>
                      )}
                      <div className="space-y-2">
                        {batches.map((b) => {
                          const enough = b.available_bags >= selected.quantity_bags;
                          const isSel = selectedBatch?.id === b.id;
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => enough && setSelectedBatch(isSel ? null : b)}
                              className={`w-full rounded-lg border px-4 py-3 text-left transition-colors ${
                                isSel
                                  ? 'border-green-400 bg-green-50'
                                  : enough
                                  ? 'border-gray-200 hover:border-green-300 hover:bg-green-50'
                                  : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{b.batch_code}</p>
                                  <p className="text-xs text-gray-500">{b.fertilizer_type} · {b.unit_weight_kg} kg/bag</p>
                                </div>
                                <div className="text-right">
                                  <p className={`text-sm font-semibold ${enough ? 'text-green-600' : 'text-red-500'}`}>
                                    {b.available_bags} available
                                  </p>
                                  {!enough && (
                                    <p className="text-xs text-red-400">Need {selected.quantity_bags}</p>
                                  )}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {selectedBatch && (
                    <button
                      onClick={handleDispatch}
                      disabled={dispatching}
                      className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {dispatching
                        ? <><Loader2 className="h-4 w-4 animate-spin" /> Dispatching…</>
                        : <><Send className="h-4 w-4" /> Dispatch from {selectedBatch.batch_code}</>}
                    </button>
                  )}
                </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
