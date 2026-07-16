import { useMemo, useState } from 'react';
import { Download, MapPin, Package, Pencil, Phone, Plus, Search, User, Warehouse, X } from 'lucide-react';
import { updateWarehouse } from '../api/client';
import { getUserMessage } from '../utils/user-messages';
import {
  ensureTanzaniaPhonePrefix,
  formatTanzaniaPhone,
  isValidTanzaniaPhone,
  sanitizeTanzaniaPhoneInput,
  TZ_PHONE_PLACEHOLDER,
  TZ_PHONE_PREFIX,
} from '../utils/form-validation';
import { PanelOutlineButton, PanelPrimaryButton } from './ui/dashboard-ui';
import { StockInModal } from './stock-in-modal';
import { REGION_LIST, TANZANIA_REGIONS } from '../data/tanzania-locations';

function buildDetailsForm(warehouse) {
  return {
    address: warehouse?.address || '',
    region: warehouse?.region || '',
    district: warehouse?.district || '',
    contact_name: warehouse?.contact_name || warehouse?.contactName || '',
    contact_phone: ensureTanzaniaPhonePrefix(warehouse?.contact_phone || warehouse?.contactPhone || ''),
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

const BATCH_STATUSES = ['All', 'In Storage', 'Partially Dispatched', 'Fully Dispatched', 'Expired'];

function BatchesPopup({ batches, warehouseName, onClose }) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const totalBags = batches.reduce((sum, b) => sum + Number(b.totalBags ?? b.total_bags ?? b.quantity_bags ?? b.availableBags ?? b.available ?? 0), 0);
  const availableBags = batches.reduce((sum, b) => sum + Number(b.availableBags ?? b.available ?? b.available_bags ?? 0), 0);

  const visible = batches.filter((b) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q
      || (b.batchCode || b.id || '').toLowerCase().includes(q)
      || (b.fertilizerType || b.name || '').toLowerCase().includes(q)
      || (b.manufacturer || '').toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
          <div>
            <p className="text-xl font-bold text-gray-900">Batches in storage</p>
            <p className="text-sm text-gray-500 mt-1">
              {warehouseName} &mdash; {batches.length} batch{batches.length === 1 ? '' : 'es'} ·{' '}
              <span className="font-semibold text-green-700">{availableBags} available</span>
              {totalBags !== availableBags && <span className="text-gray-400"> / {totalBags} received</span>}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-7 py-3 border-b border-gray-100 bg-gray-50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by batch code, type or manufacturer…"
              className="w-full rounded-lg border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {BATCH_STATUSES.map((s) => <option key={s} value={s}>{s === 'All' ? 'All statuses' : s}</option>)}
          </select>
        </div>

        {/* Results count */}
        {(search || statusFilter !== 'All') && (
          <div className="px-7 pt-3 text-xs text-gray-500">
            Showing {visible.length} of {batches.length} batch{batches.length === 1 ? '' : 'es'}
            {(search || statusFilter !== 'All') && (
              <button type="button" onClick={() => { setSearch(''); setStatusFilter('All'); }} className="ml-2 text-green-700 hover:underline">
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Batch cards */}
        <div className="overflow-y-auto flex-1 px-7 py-4 space-y-3">
          {visible.length === 0 ? (
            <p className="py-12 text-center text-gray-400">
              {batches.length === 0 ? 'No batches recorded yet. Use Add Stock to register incoming fertilizer.' : 'No batches match your filters.'}
            </p>
          ) : (
            visible.map((batch) => {
              const bagsAvailable = batch.availableBags ?? batch.available ?? 0;
              const isLowStock = bagsAvailable <= (batch.threshold || 0);
              return (
                <div key={batch.id} className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 hover:bg-white transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold text-gray-900 truncate">{batch.batchCode || batch.id}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{batch.fertilizerType || batch.name}</p>
                    {batch.manufacturer && batch.manufacturer !== '—' && (
                      <p className="text-xs text-gray-400 mt-0.5">{batch.manufacturer}</p>
                    )}
                  </div>
                  <div className="text-center shrink-0 w-20">
                    <p className="text-xl font-bold text-gray-900">{bagsAvailable}</p>
                    <p className="text-xs text-gray-400">bags</p>
                    {isLowStock && <p className="text-xs font-semibold text-red-500 mt-0.5">Low stock</p>}
                  </div>
                  <div className="text-center shrink-0 w-24">
                    <p className="text-sm font-medium text-gray-700">{batch.expiryDate || '—'}</p>
                    <p className="text-xs text-gray-400">expiry</p>
                    {batch.expiryRisk && <p className="text-xs font-semibold text-amber-600 mt-0.5">Expiring soon</p>}
                  </div>
                  <div className="shrink-0 text-center">
                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getStatusTone(batch.status)}`}>
                      {batch.status}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">{formatShortDate(batch.dateReceived || batch.date_received)}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
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
  const [showBatches, setShowBatches] = useState(false);
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

  // Compute bag totals from actual batch data so stats match the cards
  const batchAvailableBags = batches.reduce((sum, b) => sum + Number(b.availableBags ?? b.available ?? b.available_bags ?? 0), 0);
  const batchTotalBags = batches.reduce((sum, b) => sum + Number(b.totalBags ?? b.total_bags ?? b.quantity_bags ?? b.availableBags ?? b.available ?? 0), 0);

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
    const { address, region, district, contact_name, contact_phone } = detailsForm;
    if (!address.trim() || !region || !district || !contact_name.trim()) {
      setDetailsError('Please fill in all required fields.');
      return;
    }
    if (!isValidTanzaniaPhone(contact_phone)) {
      setDetailsError('Enter a valid Tanzania mobile number (+255 6XX/7XX…).');
      return;
    }
    setIsSavingDetails(true);
    setDetailsError('');
    try {
      await updateWarehouse(warehouse.id, {
        address: detailsForm.address.trim(),
        region: detailsForm.region,
        district: detailsForm.district,
        contact_name: detailsForm.contact_name.trim(),
        contact_phone: formatTanzaniaPhone(detailsForm.contact_phone),
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
              <p className="text-[11px] font-medium uppercase text-gray-500">Available bags</p>
              <p className="text-sm font-semibold text-gray-900">{batchAvailableBags.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <p className="text-[11px] font-medium uppercase text-gray-500">Total received</p>
              <p className="text-sm font-semibold text-gray-900">{batchTotalBags.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <p className="text-[11px] font-medium uppercase text-gray-500">Capacity</p>
              <p className="text-sm font-semibold text-gray-900">{metrics.capacity.toLocaleString()} bags</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
              <p className="text-[11px] font-medium uppercase text-gray-500">Batches</p>
              <p className="text-sm font-semibold text-gray-900">{batches.length}</p>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {/* Location & contact */}
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">Location & contact</p>
                <PanelOutlineButton icon={Pencil} onClick={openDetailsForm}>Edit</PanelOutlineButton>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="flex items-start gap-2.5">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Address</p>
                    <p className="font-medium text-gray-900">{warehouse.address || '—'}</p>
                    <p className="text-gray-500 text-xs">{[warehouse.district, warehouse.region].filter(Boolean).join(', ') || 'Region not set'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <User className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Contact</p>
                    <p className="font-medium text-gray-900">{warehouse.contact_name || warehouse.contactName || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                    <p className="text-gray-700">{warehouse.contact_phone || warehouse.contactPhone || '—'}</p>
                  </div>
                </div>
              </div>
              {warehouse.notes && (
                <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">{warehouse.notes}</p>
              )}
            </div>

            {/* Capacity overview */}
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">Capacity overview</p>
                  <p className="text-xs text-gray-600">{batchAvailableBags.toLocaleString()} available of {metrics.capacity.toLocaleString()} capacity</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${metrics.healthTone}`}>
                  {metrics.healthLabel}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                {(() => {
                  const pct = metrics.capacity > 0 ? Math.min(100, Math.round((batchAvailableBags / metrics.capacity) * 100)) : 0;
                  const tone = pct >= 85 ? 'bg-rose-500' : pct >= 60 ? 'bg-amber-500' : 'bg-emerald-500';
                  return <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />;
                })()}
              </div>
              <div className="mt-2 flex justify-between text-xs text-gray-600">
                <span>{metrics.capacity > 0 ? Math.min(100, Math.round((batchAvailableBags / metrics.capacity) * 100)) : 0}% of capacity used</span>
                <span>{Math.max(0, metrics.capacity - batchAvailableBags).toLocaleString()} bags free</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <PanelPrimaryButton icon={Plus} onClick={() => setIsStockInOpen(true)}>
                Add Stock
              </PanelPrimaryButton>
              <PanelOutlineButton icon={Package} onClick={() => setShowBatches((v) => !v)}>
                {showBatches ? 'Hide Batches' : `View Batches (${batches.length})`}
              </PanelOutlineButton>
              <PanelOutlineButton icon={Download} onClick={exportInventory}>
                Export list
              </PanelOutlineButton>
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

      {/* Batches popup */}
      {showBatches && (
        <BatchesPopup
          batches={batches}
          warehouseName={warehouse.name}
          onClose={() => setShowBatches(false)}
        />
      )}

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
                  Address <span className="text-red-500">*</span>
                </label>
                <input
                  id="warehouse-address"
                  type="text"
                  value={detailsForm.address}
                  onChange={(e) => setDetailsForm({ ...detailsForm, address: e.target.value })}
                  disabled={isSavingDetails}
                  placeholder="Street or landmark"
                  className={inputClass}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="warehouse-region" className="mb-1 block text-sm font-medium text-gray-700">
                    Region <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="warehouse-region"
                    value={detailsForm.region}
                    onChange={(e) => setDetailsForm({ ...detailsForm, region: e.target.value, district: '' })}
                    disabled={isSavingDetails}
                    className={inputClass}
                    required
                  >
                    <option value="">Select region…</option>
                    {REGION_LIST.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="warehouse-district" className="mb-1 block text-sm font-medium text-gray-700">
                    District <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="warehouse-district"
                    value={detailsForm.district}
                    onChange={(e) => setDetailsForm({ ...detailsForm, district: e.target.value })}
                    disabled={isSavingDetails || !detailsForm.region}
                    className={inputClass}
                    required
                  >
                    <option value="">{detailsForm.region ? 'Select district…' : 'Select region first'}</option>
                    {(TANZANIA_REGIONS[detailsForm.region] || []).map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="warehouse-contact-name" className="mb-1 block text-sm font-medium text-gray-700">
                    Contact name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="warehouse-contact-name"
                    type="text"
                    value={detailsForm.contact_name}
                    onChange={(e) => setDetailsForm({ ...detailsForm, contact_name: e.target.value })}
                    disabled={isSavingDetails}
                    placeholder="Warehouse manager"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label htmlFor="warehouse-contact-phone" className="mb-1 block text-sm font-medium text-gray-700">
                    Contact phone <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="warehouse-contact-phone"
                    type="tel"
                    value={detailsForm.contact_phone}
                    onChange={(e) => {
                      setDetailsForm({
                        ...detailsForm,
                        contact_phone: sanitizeTanzaniaPhoneInput(e.target.value),
                      });
                    }}
                    onFocus={(e) => {
                      if (!detailsForm.contact_phone) {
                        setDetailsForm({ ...detailsForm, contact_phone: TZ_PHONE_PREFIX });
                      }
                      e.target.setSelectionRange(e.target.value.length, e.target.value.length);
                    }}
                    disabled={isSavingDetails}
                    placeholder={TZ_PHONE_PLACEHOLDER}
                    className={inputClass}
                    required
                  />
                  {detailsForm.contact_phone.trim() !== TZ_PHONE_PREFIX.trim() &&
                    !isValidTanzaniaPhone(detailsForm.contact_phone) && (
                    <p className="mt-1 text-xs text-red-500">Enter a valid Tanzania mobile (+255 6XX/7XX…).</p>
                  )}
                </div>
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
