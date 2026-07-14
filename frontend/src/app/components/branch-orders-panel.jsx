import { useMemo, useState } from 'react';
import {
  ShoppingCart,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Truck,
  Loader2,
  AlertCircle,
  RefreshCw,
  Ban,
  X,
  Eye,
} from 'lucide-react';
import { cancelOrder, markOrderDelivered } from '../api/client';
import { sortByDateDesc } from '../utils/list-limits';

const STATUS_CONFIG = {
  PENDING:    { label: 'Pending Review', classes: 'bg-amber-100 text-amber-700',    Icon: Clock },
  ACCEPTED:   { label: 'Accepted',       classes: 'bg-blue-100 text-blue-700',      Icon: CheckCircle2 },
  REJECTED:   { label: 'Rejected',       classes: 'bg-red-100 text-red-600',        Icon: XCircle },
  PROCESSING: { label: 'Processing',     classes: 'bg-purple-100 text-purple-700',  Icon: Package },
  READY:      { label: 'En route',     classes: 'bg-green-100 text-green-700',    Icon: Truck },
  DISPATCHED: { label: 'Dispatched',   classes: 'bg-blue-100 text-blue-700',      Icon: Truck },
  DELIVERED:  { label: 'Delivered',      classes: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle2 },
  CANCELLED:  { label: 'Cancelled',      classes: 'bg-gray-100 text-gray-500',      Icon: Ban },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.classes}`}>
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

export function BranchOrdersPanel({ orders = [], onRefresh }) {
  const [selected, setSelected]     = useState(null);
  const [busyId, setBusyId]         = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');
  const [filter, setFilter]         = useState('active');

  const activeStatuses = ['PENDING', 'ACCEPTED', 'PROCESSING', 'READY', 'DISPATCHED'];
  const sortedOrders = useMemo(() => sortByDateDesc(orders), [orders]);

  const displayed = useMemo(() => {
    if (filter === 'active') return sortedOrders.filter((o) => activeStatuses.includes(o.status));
    if (filter === 'done')   return sortedOrders.filter((o) => ['DELIVERED', 'CANCELLED', 'REJECTED'].includes(o.status));
    return sortedOrders;
  }, [sortedOrders, filter]);

  async function handleRefresh() {
    setRefreshing(true);
    try { await onRefresh?.(); } finally { setRefreshing(false); }
  }

  function openOrder(order) {
    setSelected(order);
    setError('');
  }

  function closeOrder() {
    setSelected(null);
    setError('');
  }

  async function handleCancel(order) {
    if (!window.confirm(`Cancel order for ${order.quantity_bags} bags of ${order.fertilizer_type}?`)) return;
    setBusyId(order.id);
    setError('');
    try {
      await cancelOrder(order.id);
      setSuccess('Order cancelled.');
      closeOrder();
      await onRefresh?.();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to cancel order.');
    } finally { setBusyId(null); }
  }

  async function handleMarkDelivered(order) {
    setBusyId(order.id);
    setError('');
    try {
      await markOrderDelivered(order.id);
      setSuccess('Order marked as delivered.');
      closeOrder();
      await onRefresh?.();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to mark as delivered.');
    } finally { setBusyId(null); }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">My Orders</h2>
          <p className="text-sm text-gray-500">Track your fertilizer orders to suppliers.</p>
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
          { key: 'active', label: `Active (${sortedOrders.filter((o) => activeStatuses.includes(o.status)).length})` },
          { key: 'done',   label: 'Completed' },
          { key: 'all',    label: 'All' },
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
          <ShoppingCart className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">No orders found.</p>
          <p className="mt-1 text-xs text-gray-400">Go to the Supplier Catalog to place your first order.</p>
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
                  <span className="rounded-full border border-gray-200 px-2 py-0.5 text-xs text-blue-600">Custom</span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-gray-400">
                {order.supplier_name} · Order #{order.id} · {new Date(order.created_at).toLocaleDateString()}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openOrder(order)}
              className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
            >
              <Eye className="h-5 w-5" />
            </button>
          </div>
        ))}
      </div>

      {/* Detail modal */}
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
                <p className="text-sm text-gray-500">{selected.supplier_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={selected.status} />
                <button onClick={closeOrder} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <Detail label="Order Type"       value={selected.order_type_display} />
                <Detail label="Quantity"         value={`${selected.quantity_bags} bags`} />
                <Detail label="Unit Weight"      value={`${selected.unit_weight_kg} kg/bag`} />
                <Detail label="Delivery Address" value={selected.delivery_address} />
                {selected.required_by_date && (
                  <Detail label="Required By" value={selected.required_by_date} />
                )}
                {selected.preferred_batch_code && (
                  <Detail label="Preferred Batch" value={selected.preferred_batch_code} />
                )}
                {selected.linked_transfer_id && (
                  <Detail label="Transfer" value={`#${selected.linked_transfer_id}`} />
                )}
                {selected.custom_specifications && (
                  <Detail label="Custom Specs" value={selected.custom_specifications} className="col-span-2" />
                )}
                {selected.supplier_notes && (
                  <Detail label="Supplier Notes" value={selected.supplier_notes} className="col-span-2" />
                )}
                {selected.notes && (
                  <Detail label="Your Notes" value={selected.notes} className="col-span-2" />
                )}
                {selected.rejected_reason && (
                  <Detail label="Rejection Reason" value={selected.rejected_reason} className="col-span-2" />
                )}
              </div>

              {/* Actions */}
              <div className="border-t border-gray-100 pt-4 flex flex-wrap gap-2">
                {['PENDING', 'ACCEPTED'].includes(selected.status) && (
                  <button
                    onClick={() => handleCancel(selected)}
                    disabled={busyId === selected.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    {busyId === selected.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                    Cancel Order
                  </button>
                )}
                {selected.status === 'READY' && (
                  <button
                    onClick={() => handleMarkDelivered(selected)}
                    disabled={busyId === selected.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60"
                  >
                    {busyId === selected.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Confirm Delivery
                  </button>
                )}
                {selected.status === 'DISPATCHED' && (
                  <p className="text-xs italic text-gray-400">Awaiting warehouse verification before delivery.</p>
                )}
                {['DELIVERED', 'CANCELLED', 'REJECTED'].includes(selected.status) && (
                  <p className="text-xs italic text-gray-400">No further actions for this order.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
