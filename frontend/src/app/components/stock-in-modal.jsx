import { useEffect, useMemo, useRef, useState } from 'react';
import { Package, X } from 'lucide-react';
import { createBatch } from '../api/client';
import { useFertilizerTypes } from '../hooks/use-fertilizer-types';
import { getUserMessage } from '../utils/user-messages';

function getTodayValue() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function buildInitialForm() {
  return {
    fertilizerType: 'DAP',
    customFertilizerType: '',
    batchCode: '',
    quantityBags: '',
    unitWeightKg: '50',
    sourceReference: '',
    dateReceived: getTodayValue(),
    notes: '',
    confirmOverCapacity: false,
  };
}

function getCapacityNumbers(warehouse) {
  return {
    capacity: Number(warehouse?.capacity_bags ?? warehouse?.capacity ?? 0),
    current: Number(warehouse?.current_bags ?? warehouse?.current ?? 0),
  };
}

export function StockInModal({ isOpen, warehouse, supplierId, existingBatches = [], onClose, onSuccess }) {
  const [formData, setFormData] = useState(buildInitialForm());
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const closeTimerRef = useRef(null);
  const { fertilizerTypes } = useFertilizerTypes();

  useEffect(() => {
    if (isOpen) {
      setFormData(buildInitialForm());
      setErrorMessage('');
      setSuccessMessage('');
      setIsSubmitting(false);
    }
    return () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [isOpen, warehouse]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  const existingBatchCodes = useMemo(
    () =>
      new Set(
        existingBatches
          .map((b) => String(b.batch_code || b.batchCode || '').trim().toLowerCase())
          .filter(Boolean)
      ),
    [existingBatches]
  );

  if (!isOpen || !warehouse) return null;

  const { capacity, current } = getCapacityNumbers(warehouse);
  const remainingCapacity = Math.max(capacity - current, 0);
  const quantityBags = Number(formData.quantityBags) || 0;
  const batchCode = formData.batchCode.trim();
  const duplicateBatchCode = batchCode && existingBatchCodes.has(batchCode.toLowerCase());
  const exceedsCapacity = quantityBags > remainingCapacity;
  const fertilizerType =
    formData.fertilizerType === 'Other'
      ? formData.customFertilizerType.trim()
      : formData.fertilizerType;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!batchCode) { setErrorMessage('Batch code is required.'); return; }
    if (!fertilizerType) { setErrorMessage('Fertilizer type is required.'); return; }
    if (!quantityBags || quantityBags <= 0) { setErrorMessage('Quantity must be greater than zero.'); return; }
    if (!formData.dateReceived) { setErrorMessage('Date received is required.'); return; }
    if (exceedsCapacity && !formData.confirmOverCapacity) {
      setErrorMessage('Quantity exceeds warehouse capacity. Tick the override checkbox to continue.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      await createBatch({
        batch_code: batchCode,
        fertilizer_type: fertilizerType,
        quantity_bags: quantityBags,
        unit_weight_kg: Number(formData.unitWeightKg) || 50,
        storage_location_id: warehouse.id,
        source_reference: formData.sourceReference.trim(),
        date_received: formData.dateReceived,
        notes: formData.notes.trim(),
        supplier_id: supplierId,
        allow_capacity_override: formData.confirmOverCapacity,
      });
      setSuccessMessage('Stock recorded successfully. Refreshing warehouse…');
      if (typeof onSuccess === 'function') await onSuccess();
      closeTimerRef.current = window.setTimeout(() => onClose(), 900);
    } catch (error) {
      setErrorMessage(getUserMessage(error, 'Could not save stock receipt. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const field =
    'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-transparent focus:ring-2 focus:ring-green-500';
  const lbl = 'flex flex-col gap-1';
  const lblText = 'text-xs font-medium text-gray-600';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-6">
      <div
        className="flex w-full max-w-xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        style={{ maxHeight: 'calc(100vh - 3rem)' }}
      >
        <div className="shrink-0 flex items-center justify-between border-b border-gray-200 px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2 text-green-700">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">Add Stock</p>
              <h3 className="text-sm font-semibold text-gray-900">{warehouse.name}</h3>
              <p className="text-xs text-gray-600">Section {warehouse.section || '—'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="shrink-0 border-b border-gray-100 bg-gray-50 px-5 py-2">
          <div className="mb-1 flex items-center justify-between text-xs text-gray-600">
            <span>Warehouse capacity</span>
            <span>
              {current} / {capacity} bags used ·{' '}
              <span className="font-medium text-gray-900">{remainingCapacity} free</span>
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full rounded-full transition-all ${
                capacity > 0 && current / capacity >= 0.85
                  ? 'bg-rose-500'
                  : capacity > 0 && current / capacity >= 0.6
                    ? 'bg-amber-400'
                    : 'bg-emerald-500'
              }`}
              style={{ width: capacity > 0 ? `${Math.min((current / capacity) * 100, 100)}%` : '0%' }}
            />
          </div>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

            {successMessage && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                {successMessage}
              </div>
            )}
            {errorMessage && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                {errorMessage}
              </div>
            )}
            {duplicateBatchCode && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Batch code <strong>{batchCode}</strong> already exists in this warehouse. The backend will enforce uniqueness.
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">

              {/* Fertilizer type */}
              <label className={lbl}>
                <span className={lblText}>Fertilizer type <span className="text-rose-500">*</span></span>
                <select
                  value={formData.fertilizerType}
                  onChange={(e) => setFormData({ ...formData, fertilizerType: e.target.value, customFertilizerType: e.target.value === 'Other' ? formData.customFertilizerType : '' })}
                  className={field}
                >
                  {fertilizerTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                  <option value="Other">Other</option>
                </select>
              </label>

              {/* Custom type or placeholder */}
              {formData.fertilizerType === 'Other' ? (
                <label className={lbl}>
                  <span className={lblText}>Custom type <span className="text-rose-500">*</span></span>
                  <input
                    type="text"
                    value={formData.customFertilizerType}
                    onChange={(e) => setFormData({ ...formData, customFertilizerType: e.target.value })}
                    className={field}
                    placeholder="e.g. DAP 18-46-0"
                  />
                </label>
              ) : (
                <label className={lbl}>
                  <span className={lblText}>Batch code <span className="text-rose-500">*</span></span>
                  <input
                    type="text"
                    value={formData.batchCode}
                    onChange={(e) => setFormData({ ...formData, batchCode: e.target.value })}
                    className={field}
                    placeholder="SUP-2026-001"
                  />
                </label>
              )}

              {/* Show batch code in its own row only when Other is selected */}
              {formData.fertilizerType === 'Other' && (
                <label className={`${lbl} col-span-2`}>
                  <span className={lblText}>Batch code <span className="text-rose-500">*</span></span>
                  <input
                    type="text"
                    value={formData.batchCode}
                    onChange={(e) => setFormData({ ...formData, batchCode: e.target.value })}
                    className={field}
                    placeholder="SUP-2026-001"
                  />
                </label>
              )}

              {/* Quantity and unit weight */}
              <label className={lbl}>
                <span className={lblText}>Quantity (bags) <span className="text-rose-500">*</span></span>
                <input
                  type="number"
                  min="1"
                  value={formData.quantityBags}
                  onChange={(e) => setFormData({ ...formData, quantityBags: e.target.value })}
                  className={field}
                  placeholder="150"
                />
              </label>

              <label className={lbl}>
                <span className={lblText}>Unit weight (kg/bag)</span>
                <input
                  type="number"
                  min="1"
                  value={formData.unitWeightKg}
                  onChange={(e) => setFormData({ ...formData, unitWeightKg: e.target.value })}
                  className={field}
                  placeholder="50"
                />
              </label>

              {/* Date received and source reference */}
              <label className={lbl}>
                <span className={lblText}>Date received <span className="text-rose-500">*</span></span>
                <input
                  type="date"
                  value={formData.dateReceived}
                  onChange={(e) => setFormData({ ...formData, dateReceived: e.target.value })}
                  className={field}
                />
              </label>

              <label className={lbl}>
                <span className={lblText}>Source / reference</span>
                <input
                  type="text"
                  value={formData.sourceReference}
                  onChange={(e) => setFormData({ ...formData, sourceReference: e.target.value })}
                  className={field}
                  placeholder="PO number or supplier name"
                />
              </label>

              {/* Notes */}
              <label className={`${lbl} col-span-2`}>
                <span className={lblText}>Notes</span>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className={field}
                  placeholder="Optional receipt notes"
                />
              </label>

              {/* Capacity override — only shown when needed */}
              {exceedsCapacity && (
                <div className="col-span-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
                  <p className="font-medium">Over capacity by {quantityBags - remainingCapacity} bags</p>
                  <label className="mt-2 flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={formData.confirmOverCapacity}
                      onChange={(e) => setFormData({ ...formData, confirmOverCapacity: e.target.checked })}
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-amber-600"
                    />
                    <span>I confirm this exceeds current capacity and want to proceed.</span>
                  </label>
                </div>
              )}

            </div>
          </div>

          <div className="shrink-0 flex items-center justify-end gap-2 border-t border-gray-100 bg-white px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : 'Record Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}