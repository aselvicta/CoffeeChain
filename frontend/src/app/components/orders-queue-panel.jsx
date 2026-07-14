import { useMemo, useState } from 'react';
import {
  ListOrdered,
  CheckCircle2,
  Package,
  Loader2,
  AlertCircle,
  RefreshCw,
  X,
  Eye,
} from 'lucide-react';
import { acceptOrder, verifyDispatch } from '../api/client';
import { sortByDateDesc } from '../utils/list-limits';

// WM actions: accept new orders, verify dispatched ones
const NEXT_STEP = {
  PENDING:    { label: 'Accept Order',    icon: CheckCircle2, action: 'accept', color: 'bg-green-600 hover:bg-green-700' },
  DISPATCHED: { label: 'Verify Dispatch', icon: Package,      action: 'verify', color: 'bg-green-600 hover:bg-green-700' },
};

const STATUS_BADGE = {
  PENDING:    { label: 'New',        classes: 'bg-amber-100 text-amber-700' },
  ACCEPTED:   { label: 'Accepted',   classes: 'bg-blue-100 text-blue-700' },
  DISPATCHED: { label: 'Needs verification', classes: 'border border-gray-200 text-gray-600 bg-white' },
  READY:      { label: 'Sent to customer', classes: 'bg-green-100 text-green-700' },
  DELIVERED:  { label: 'Delivered',  classes: 'bg-emerald-100 text-emerald-700' },
  REJECTED:   { label: 'Rejected',   classes: 'bg-red-100 text-red-500' },
  CANCELLED:  { label: 'Cancelled',  classes: 'bg-gray-100 text-gray-400' },
};

const STATUS_LABEL = {
  PENDING:    'New order — awaiting acceptance',
  ACCEPTED:   'Accepted — supplier is preparing stock',
  DISPATCHED: 'Dispatched by supplier — verify before delivery',
  READY:      'Verified — en route to customer',
  DELIVERED:  'Delivered',
};

function safeStr(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return v.batch_code || v.name || String(v.id || '');
  return String(v);
}

function Detail({ label, value, className = '' }) {
  return (
    <div className={className}>
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-0.5 text-sm text-gray-800">{safeStr(value) || '—'}</p>
    </div>
  );
}

export function OrdersQueuePanel({ orders = [], onRefresh }) {
  const [selected, setSelected] = useState(null);
  const [busyId, setBusyId]     = useState(null);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [filter, setFilter]     = useState('active');
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try { await onRefresh?.(); } finally { setRefreshing(false); }
  }

  const sorted = useMemo(() => sortByDateDesc(orders), [orders]);
  const pendingCount    = sorted.filter((o) => o.status === 'PENDING').length;
  const dispatchedCount = sorted.filter((o) => o.status === 'DISPATCHED').length;
  const actionCount     = pendingCount + dispatchedCount;

  const displayed = useMemo(() => {
    if (filter === 'pending')    return sorted.filter((o) => o.status === 'PENDING');
    if (filter === 'dispatched') return sorted.filter((o) => o.status === 'DISPATCHED');
    if (filter === 'done')       return sorted.filter((o) => ['READY', 'DELIVERED'].includes(o.status));
    return sorted;
  }, [sorted, filter]);

  function openOrder(order) {
    setSelected(order);
    setError('');
  }

  function closeOrder() {
    setSelected(null);
    setError('');
  }

  async function handleNextStep(order) {
    const step = NEXT_STEP[order.status];
    if (!step) return;
    setBusyId(order.id);
    setError('');
    try {
      if (step.action === 'accept') await acceptOrder(order.id, '');
      if (step.action === 'verify') await verifyDispatch(order.id);
      const messages = {
        accept: `Order #${order.id} accepted — supplier will prepare stock.`,
        verify: `Order #${order.id} verified — sent to ${order.branch_name || 'customer'}.`,
      };
      setSuccess(messages[step.action]);
      closeOrder();
      await onRefresh?.();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update order.');
    } finally { setBusyId(null); }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            Orders Queue
            {actionCount > 0 && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                {actionCount}
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500">Accept new orders and verify dispatched ones.</p>
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

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 p-1 text-sm">
        {[
          { key: 'pending',    label: `New (${pendingCount})` },
          { key: 'dispatched', label: `Verify (${dispatchedCount})` },
          { key: 'done',       label: 'Done' },
          { key: 'all',        label: 'All' },
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
          <ListOrdered className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">No orders to process right now.</p>
        </div>
      )}

      {/* Order list */}
      <div className="space-y-2">
        {displayed.map((order) => {
          const badge = STATUS_BADGE[order.status] || { label: order.status, classes: 'bg-gray-100 text-gray-500' };
          const next  = NEXT_STEP[order.status];
          const busy  = busyId === order.id;
          return (
            <div
              key={order.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {order.quantity_bags} bags · {order.fertilizer_type}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge.classes}`}>
                    {badge.label}
                  </span>
                  {order.order_type === 'CUSTOM' && (
                    <span className="rounded-full border border-gray-200 px-2 py-0.5 text-xs text-blue-600">Custom</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-gray-400">
                  {order.branch_name} · Order #{order.id}
                  {order.required_by_date && ` · by ${order.required_by_date}`}
                </p>
              </div>

              {/* Eye — view details */}
              <button
                type="button"
                onClick={() => openOrder(order)}
                className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                title="View details"
              >
                <Eye className="h-4 w-4" />
              </button>

              {/* Direct action button */}
              {next && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleNextStep(order)}
                  className={`shrink-0 inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white disabled:opacity-60 transition-colors ${next.color}`}
                >
                  {busy
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> …</>
                    : <>{next.label}</>}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Order detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            {/* Modal header */}
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-4">
              <div>
                <p className="text-xs text-gray-400">
                  Order #{selected.id} · {new Date(selected.created_at).toLocaleDateString()}
                </p>
                <h3 className="mt-0.5 font-semibold text-gray-900">
                  {selected.quantity_bags} bags of {selected.fertilizer_type}
                </h3>
                <p className="text-sm text-gray-500">
                  For {selected.branch_name} · {selected.delivery_address}
                  {selected.required_by_date && ` · by ${selected.required_by_date}`}
                </p>
              </div>
              <button onClick={closeOrder} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Custom specs — prominent for custom orders */}
              {selected.order_type === 'CUSTOM' && selected.custom_specifications && (
                <div className="rounded-lg border border-gray-200 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Custom Specifications
                  </p>
                  <p className="mt-1 text-sm text-gray-800">{selected.custom_specifications}</p>
                </div>
              )}

              {/* Order details */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                <Detail label="Customer"        value={`${selected.branch_name} (${selected.branch_type})`} />
                <Detail label="Fertilizer"      value={selected.fertilizer_type} />
                <Detail label="Quantity"        value={`${selected.quantity_bags} bags`} />
                <Detail label="Unit Weight"     value={`${selected.unit_weight_kg} kg/bag`} />
                {selected.preferred_batch_code && (
                  <Detail label="Preferred Batch" value={selected.preferred_batch_code} />
                )}
                <Detail label="Delivery To"     value={selected.delivery_address} />
                {selected.required_by_date && (
                  <Detail label="Required By"   value={selected.required_by_date} />
                )}
                {selected.notes && (
                  <Detail label="Customer Notes" value={selected.notes} className="col-span-2" />
                )}
                {selected.linked_transfer_id && (
                  <Detail label="Linked Transfer" value={`#${selected.linked_transfer_id}`} />
                )}
              </div>

              {/* Action */}
              <div className="border-t border-gray-100 pt-4">
                {NEXT_STEP[selected.status] ? (
                  <>
                    <p className="mb-3 text-xs text-gray-400">
                      Status: <span className="font-medium text-gray-700">{STATUS_LABEL[selected.status]}</span>
                    </p>
                    <button
                      onClick={() => handleNextStep(selected)}
                      disabled={busyId === selected.id}
                      className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60 transition-colors ${NEXT_STEP[selected.status].color}`}
                    >
                      {busyId === selected.id ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Updating…</>
                      ) : (
                        (() => { const Icon = NEXT_STEP[selected.status].icon; return <><Icon className="h-4 w-4" /> {NEXT_STEP[selected.status].label}</>; })()
                      )}
                    </button>
                  </>
                ) : (
                  <p className="text-xs italic text-gray-400">
                    {STATUS_LABEL[selected.status] || 'No further action needed.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
