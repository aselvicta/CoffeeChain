import { useMemo } from 'react';
import { Download, Package, Plus, Warehouse, X } from 'lucide-react';

function getWarehouseCapacityMetrics(warehouse) {
  const capacity = Number(warehouse?.capacity_bags ?? warehouse?.capacity ?? 0);
  const current = Number(warehouse?.current_bags ?? warehouse?.current ?? 0);
  const fillPercent = capacity > 0 ? Math.min(Math.round((current / capacity) * 100), 100) : 0;
  const availableSpace = Math.max(capacity - current, 0);

  let barTone = 'bg-emerald-500';
  if (current === 0) {
    barTone = 'bg-slate-300';
  } else if (fillPercent >= 85) {
    barTone = 'bg-rose-500';
  } else if (fillPercent >= 60) {
    barTone = 'bg-amber-500';
  }

  return { capacity, current, fillPercent, availableSpace, barTone };
}

function getBatchStatus(batch) {
  const lifecycleState = String(batch.lifecycleState || batch.lifecycle_state || '').toUpperCase();
  const available = Number(batch.availableBags ?? batch.available ?? batch.available_bags ?? 0);
  const total = Number(batch.totalBags ?? batch.total_bags ?? batch.quantity_bags ?? available);
  const expiryDate = batch.expiryDate || batch.expiry_date || '';
  const expiry = expiryDate ? new Date(expiryDate) : null;
  const today = new Date();

  if (expiry && expiry < today) {
    return 'Expired';
  }
  if (lifecycleState === 'DISPATCHED' || available === 0) {
    return 'Fully Dispatched';
  }
  if (lifecycleState === 'PARTIALLY_DISPATCHED' || (available > 0 && total > available)) {
    return 'Partially Dispatched';
  }
  return 'In Storage';
}

function buildCsvValue(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function WarehouseModal({ isOpen, onClose, warehouse, inventory, onAddStock }) {
  const batches = useMemo(() => {
    if (!warehouse) return [];
    return inventory
      .filter((item) => String(item.storageLocationId) === String(warehouse.id))
      .map((item) => ({
        ...item,
        status: getBatchStatus(item),
      }))
      .sort((left, right) => String(left.batchCode || left.id).localeCompare(String(right.batchCode || right.id)));
  }, [inventory, warehouse]);

  if (!isOpen || !warehouse) {
    return null;
  }

  const metrics = getWarehouseCapacityMetrics(warehouse);

  const exportInventory = () => {
    const rows = [
      ['Batch Code', 'Fertilizer Type', 'Bags Available', 'Date Received', 'Status'],
      ...batches.map((batch) => [
        batch.batchCode || batch.id,
        batch.fertilizerType || batch.name,
        batch.availableBags ?? batch.available ?? 0,
        batch.dateReceived || batch.date_received || '',
        batch.status,
      ]),
    ];
    const csvContent = rows.map((row) => row.map(buildCsvValue).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const downloadUrl = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = `warehouse-${warehouse.id}-inventory.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(downloadUrl);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <Warehouse className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Warehouse Details</p>
              <h3 className="mt-1 text-2xl font-semibold text-slate-900">{warehouse.name}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {warehouse.section || 'No section'}
                {warehouse.region ? ` • ${warehouse.region} Region` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close warehouse details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Location</p>
                  <p className="mt-2 text-sm text-slate-800">{warehouse.address || 'No address recorded'}</p>
                  <p className="mt-1 text-sm text-slate-600">{warehouse.region || 'Region not set'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</p>
                  <p className="mt-2 text-sm text-slate-800">{warehouse.contact_name || warehouse.contactName || 'Not set'}</p>
                  <p className="mt-1 text-sm text-slate-600">{warehouse.contact_phone || warehouse.contactPhone || 'No phone recorded'}</p>
                </div>
              </div>
              {warehouse.notes && (
                <div className="mt-4 rounded-2xl bg-white px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
                  {warehouse.notes}
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Capacity overview</p>
                  <p className="text-sm text-slate-500">
                    {metrics.current} / {metrics.capacity} bags in storage
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    metrics.current === 0
                      ? 'bg-slate-100 text-slate-600'
                      : metrics.fillPercent >= 85
                        ? 'bg-rose-100 text-rose-700'
                        : metrics.fillPercent >= 60
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {metrics.current === 0 ? 'Empty' : metrics.fillPercent >= 85 ? 'Near capacity' : metrics.fillPercent >= 60 ? 'Low stock' : 'Healthy'}
                </span>
              </div>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${metrics.barTone}`}
                  style={{ width: `${metrics.fillPercent}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-sm text-slate-600">
                <span>{metrics.fillPercent}% filled</span>
                <span>{metrics.availableSpace} bags free</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onAddStock?.(warehouse)}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                Add Stock to this warehouse
              </button>
              <button
                type="button"
                onClick={exportInventory}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Export inventory list
              </button>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Batches in storage</p>
                <p className="text-sm text-slate-500">{batches.length} batch{batches.length === 1 ? '' : 'es'}</p>
              </div>
              <div className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <Package className="mr-2 inline-block h-4 w-4" />
                {metrics.current} bags
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Batch code</th>
                    <th className="px-4 py-3 font-medium">Fertilizer type</th>
                    <th className="px-4 py-3 font-medium">Bags available</th>
                    <th className="px-4 py-3 font-medium">Date received</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-slate-500">
                        No batches have been recorded for this warehouse yet.
                      </td>
                    </tr>
                  ) : (
                    batches.map((batch) => (
                      <tr key={batch.id} className="align-top">
                        <td className="px-4 py-3 font-medium text-slate-900">{batch.batchCode || batch.id}</td>
                        <td className="px-4 py-3 text-slate-700">{batch.fertilizerType || batch.name}</td>
                        <td className="px-4 py-3 text-slate-700">{batch.availableBags ?? batch.available ?? 0}</td>
                        <td className="px-4 py-3 text-slate-700">{batch.dateReceived || batch.date_received || '—'}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                              batch.status === 'Expired'
                                ? 'bg-slate-100 text-slate-600'
                                : batch.status === 'Fully Dispatched'
                                  ? 'bg-rose-100 text-rose-700'
                                  : batch.status === 'Partially Dispatched'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {batch.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}