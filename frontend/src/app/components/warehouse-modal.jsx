import { useMemo, useState } from 'react';
import { Download, MapPin, Package, Pencil, Phone, Plus, User, Warehouse, X } from 'lucide-react';
import { updateWarehouse } from '../api/client';
import { getUserMessage } from '../utils/user-messages';
import { PanelOutlineButton, PanelPrimaryButton } from './ui/dashboard-ui';
import { StockInModal } from './stock-in-modal';

function buildDetailsForm(warehouse) {
  return {
    address: warehouse?.address || '',
    region: warehouse?.region || '',
    contact_name: warehouse?.contact_name || warehouse?.contactName || '',
    contact_phone: warehouse?.contact_phone || warehouse?.contactPhone || '',
    notes: warehouse?.notes || '',
  };
}

function getWarehouseCapacityMetrics(warehouse) {
  const capacity = Number(warehouse?.capacity_bags ?? warehouse?.capacity ?? 0);
  const current = Number(warehouse?.current_bags ?? warehouse?.current ?? 0);
  const fillPercent = capacity > 0 ? Math.min(Math.round((current / capacity) * 100), 100) : 0;
  const availableSpace = Math.max(capacity - current, 0);

  let barTone = 'bg-emerald-500';
  let healthLabel = 'Healthy';
  let healthTone = 'bg-emerald-100 text-emerald-700';

  if (current === 0) {
    barTone = 'bg-slate-300';
    healthLabel = 'Empty';
    healthTone = 'bg-slate-100 text-slate-600';
  } else if (fillPercent >= 85) {
    barTone = 'bg-rose-500';
    healthLabel = 'Near capacity';
    healthTone = 'bg-rose-100 text-rose-700';
  } else if (fillPercent >= 60) {
    barTone = 'bg-amber-500';
    healthLabel = 'Getting full';
    healthTone = 'bg-amber-100 text-amber-700';
  }

  return { capacity, current, fillPercent, availableSpace, barTone, healthLabel, healthTone };
}

function getBatchStatus(batch) {
  const lifecycleState = String(batch.lifecycleState || batch.lifecycle_state || '').toUpperCase();
  const available = Number(batch.availableBags ?? batch.available ?? batch.available_bags ?? 0);
  const total = Number(batch.totalBags ?? batch.total_bags ?? batch.quantity_bags ?? available);
  const expiryDate = batch.expiryDate || batch.expiry_date || '';
  const expiry = expiryDate ? new Date(expiryDate) : null;
  const today = new Date();

  if (expiry && expiry < today) return 'Expired';
  if (lifecycleState === 'DISPATCHED' || available === 0) return 'Fully Dispatched';
  if (lifecycleState === 'PARTIALLY_DISPATCHED' || (available > 0 && total > available)) {
    return 'Partially Dispatched';
  }
  return 'In Storage';
}

function getStatusTone(status) {
  if (status === 'Expired') return 'bg-slate-100 text-slate-600';
  if (status === 'Fully Dispatched') return 'bg-rose-100 text-rose-700';
  if (status === 'Partially Dispatched') return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
}

function buildCsvValue(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function formatShortDate(value) {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10) || '—';
  return parsed.toLocaleDateString();
}

export function WarehouseModal({
  isOpen,
  onClose,
  warehouse,
  inventory,
  supplierId,
  existingBatches = [],
  onRefresh,
}) {
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [detailsForm, setDetailsForm] = useState(buildDetailsForm(null));
  const [detailsError, setDetailsError] = useState('');
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  const batches = useMemo(() => {
    if (!warehouse) return [];
    return inventory
      .filter((item) => String(item.storageLocationId) === String(warehouse.id))
      .map((item) => ({
        ...item,
        status: getBatchStatus(item),
      }))
      .sort((left, right) =>
        String(left.batchCode || left.id).localeCompare(String(right.batchCode || right.id))
      );
  }, [inventory, warehouse]);

  const warehouseBatches = useMemo(
    () =>
      existingBatches.filter(
        (batch) => String(batch.storage_location?.id) === String(warehouse?.id)
      ),
    [existingBatches, warehouse?.id]
  );

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

  const handleStockSuccess = async () => {
    if (typeof onRefresh === 'function') {
      await onRefresh();
    }
  };

  const openDetailsForm = () => {
    setDetailsForm(buildDetailsForm(warehouse));
    setDetailsError('');
    setIsDetailsOpen(true);
  };

  const closeDetailsForm = () => {
    setIsDetailsOpen(false);
    setDetailsError('');
  };

  const handleSaveDetails = async (event) => {
    event?.preventDefault?.();
    setIsSavingDetails(true);
    setDetailsError('');
    try {
      await updateWarehouse(warehouse.id, {
        address: detailsForm.address.trim(),
        region: detailsForm.region.trim(),
        contact_name: detailsForm.contact_name.trim(),
        contact_phone: detailsForm.contact_phone.trim(),
        notes: detailsForm.notes.trim(),
      });
      closeDetailsForm();
      if (typeof onRefresh === 'function') {
        await onRefresh();
      }
    } catch (error) {
      setDetailsError(getUserMessage(error, 'Could not save warehouse details. Please try again.'));
    } finally {
      setIsSavingDetails(false);
    }
  };

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500 disabled:bg-gray-100';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
        <div
          className="flex w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
          style={{ maxHeight: 'calc(100vh - 3rem)' }}
        >
          <div className="flex shrink-0 items-start justify-between border-b border-gray-200 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-green-100 p-2.5 text-green-700">
                <Warehouse className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-green-700">
                  Warehouse Details
                </p>
                <h3 className="text-lg font-bold text-gray-900 sm:text-xl">{warehouse.name}</h3>
                <p className="text-sm text-gray-600">
                  Section {warehouse.section || '—'}
                  {warehouse.region ? ` · ${warehouse.region}` : ''}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close warehouse details"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-gray-100 bg-gray-50 px-5 py-3 sm:grid-cols-4">
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <p className="text-[11px] font-medium uppercase text-gray-500">In storage</p>
              <p className="text-sm font-semibold text-gray-900">{metrics.current} bags</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <p className="text-[11px] font-medium uppercase text-gray-500">Capacity</p>
              <p className="text-sm font-semibold text-gray-900">{metrics.capacity} bags</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <p className="text-[11px] font-medium uppercase text-gray-500">Free space</p>
              <p className="text-sm font-semibold text-gray-900">{metrics.availableSpace} bags</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <p className="text-[11px] font-medium uppercase text-gray-500">Batches</p>
              <p className="text-sm font-semibold text-gray-900">{batches.length}</p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">Location & contact</p>
                    <PanelOutlineButton icon={Pencil} onClick={openDetailsForm}>
                      Edit
                    </PanelOutlineButton>
                  </div>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-2.5">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {warehouse.address || 'No address recorded'}
                        </p>
                        <p className="text-gray-600">{warehouse.region || 'Region not set'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <User className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">
                          {warehouse.contact_name || warehouse.contactName || 'Contact not set'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2.5">
                      <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                      <div>
                        <p className="text-gray-700">
                          {warehouse.contact_phone || warehouse.contactPhone || 'No phone recorded'}
                        </p>
                      </div>
                    </div>
                  </div>
                  {warehouse.notes && (
                    <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
                      {warehouse.notes}
                    </p>
                  )}
                </div>

                <div className="rounded-lg border border-gray-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Capacity overview</p>
                      <p className="text-xs text-gray-600">
                        {metrics.current} of {metrics.capacity} bags used
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${metrics.healthTone}`}
                    >
                      {metrics.healthLabel}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${metrics.barTone}`}
                      style={{ width: `${metrics.fillPercent}%` }}
                    />
                  </div>
                  <div className="mt-2 flex justify-between text-xs text-gray-600">
                    <span>{metrics.fillPercent}% filled</span>
                    <span>{metrics.availableSpace} bags free</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <PanelPrimaryButton icon={Plus} onClick={() => setIsStockInOpen(true)}>
                    Add Stock
                  </PanelPrimaryButton>
                  <PanelOutlineButton icon={Download} onClick={exportInventory}>
                    Export list
                  </PanelOutlineButton>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Batches in storage</p>
                    <p className="text-xs text-gray-600">
                      {batches.length} batch{batches.length === 1 ? '' : 'es'} · {metrics.current}{' '}
                      bags total
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                    <Package className="h-3.5 w-3.5" />
                    {metrics.current}
                  </span>
                </div>

                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full min-w-[480px] divide-y divide-gray-200 text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Batch</th>
                        <th className="px-3 py-2 font-semibold">Type</th>
                        <th className="px-3 py-2 font-semibold">Bags</th>
                        <th className="px-3 py-2 font-semibold">Expiry</th>
                        <th className="px-3 py-2 font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {batches.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="px-3 py-8 text-center text-sm text-gray-500">
                            No batches recorded yet. Use Add Stock to register incoming fertilizer.
                          </td>
                        </tr>
                      ) : (
                        batches.map((batch) => {
                          const bagsAvailable = batch.availableBags ?? batch.available ?? 0;
                          const isLowStock = bagsAvailable <= (batch.threshold || 0);
                          return (
                          <tr key={batch.id} className="hover:bg-gray-50">
                            <td
                              className="max-w-[7rem] truncate px-3 py-2.5 font-medium text-gray-900"
                              title={batch.batchCode || batch.id}
                            >
                              {batch.batchCode || batch.id}
                            </td>
                            <td className="max-w-[6rem] px-3 py-2.5 text-gray-700">
                              <span className="block truncate" title={batch.fertilizerType || batch.name}>
                                {batch.fertilizerType || batch.name}
                              </span>
                              {batch.manufacturer && batch.manufacturer !== '—' && (
                                <span className="block truncate text-[11px] text-gray-500">
                                  {batch.manufacturer}
                                </span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-gray-700">
                              {bagsAvailable}
                              {isLowStock && (
                                <span className="mt-0.5 block text-[11px] font-medium text-red-600">
                                  Low stock
                                </span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2.5 text-xs text-gray-600">
                              {batch.expiryDate || '—'}
                              {batch.expiryRisk && (
                                <span className="mt-0.5 block font-medium text-amber-700">
                                  Expiring soon
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="inline-flex flex-col items-start">
                                <span
                                  className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${getStatusTone(batch.status)}`}
                                >
                                  {batch.status}
                                </span>
                                <span className="mt-0.5 text-[11px] text-gray-500">
                                  {formatShortDate(batch.dateReceived || batch.date_received)}
                                </span>
                              </div>
                            </td>
                          </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <StockInModal
        isOpen={isStockInOpen}
        warehouse={warehouse}
        supplierId={supplierId}
        existingBatches={warehouseBatches}
        onClose={() => setIsStockInOpen(false)}
        onSuccess={handleStockSuccess}
      />

      {isDetailsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Warehouse Details</h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  Set location and contact for {warehouse.name}.
                </p>
              </div>
              <button
                type="button"
                onClick={closeDetailsForm}
                disabled={isSavingDetails}
                className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleSaveDetails} className="space-y-3">
              <div>
                <label htmlFor="warehouse-address" className="mb-1 block text-sm font-medium text-gray-700">
                  Address
                </label>
                <input
                  id="warehouse-address"
                  type="text"
                  value={detailsForm.address}
                  onChange={(e) => setDetailsForm({ ...detailsForm, address: e.target.value })}
                  disabled={isSavingDetails}
                  placeholder="Street, district, or landmark"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="warehouse-region" className="mb-1 block text-sm font-medium text-gray-700">
                  Region
                </label>
                <input
                  id="warehouse-region"
                  type="text"
                  value={detailsForm.region}
                  onChange={(e) => setDetailsForm({ ...detailsForm, region: e.target.value })}
                  disabled={isSavingDetails}
                  placeholder="e.g. Mbeya"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="warehouse-contact-name" className="mb-1 block text-sm font-medium text-gray-700">
                  Contact name
                </label>
                <input
                  id="warehouse-contact-name"
                  type="text"
                  value={detailsForm.contact_name}
                  onChange={(e) => setDetailsForm({ ...detailsForm, contact_name: e.target.value })}
                  disabled={isSavingDetails}
                  placeholder="Warehouse manager"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="warehouse-contact-phone" className="mb-1 block text-sm font-medium text-gray-700">
                  Contact phone
                </label>
                <input
                  id="warehouse-contact-phone"
                  type="tel"
                  value={detailsForm.contact_phone}
                  onChange={(e) => setDetailsForm({ ...detailsForm, contact_phone: e.target.value })}
                  disabled={isSavingDetails}
                  placeholder="e.g. 0712345678"
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="warehouse-notes" className="mb-1 block text-sm font-medium text-gray-700">
                  Notes <span className="font-normal text-gray-500">(optional)</span>
                </label>
                <textarea
                  id="warehouse-notes"
                  rows={2}
                  value={detailsForm.notes}
                  onChange={(e) => setDetailsForm({ ...detailsForm, notes: e.target.value })}
                  disabled={isSavingDetails}
                  placeholder="Access instructions or operating hours"
                  className={inputClass}
                />
              </div>
              {detailsError && <p className="text-sm text-red-600">{detailsError}</p>}
              <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
                <PanelOutlineButton type="button" tone="slate" onClick={closeDetailsForm} disabled={isSavingDetails}>
                  Cancel
                </PanelOutlineButton>
                <PanelPrimaryButton type="submit" disabled={isSavingDetails}>
                  {isSavingDetails ? 'Saving…' : 'Save Details'}
                </PanelPrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
