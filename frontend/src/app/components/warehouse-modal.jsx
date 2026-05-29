import React, { useMemo, useState } from 'react';
import { X, Plus, Edit2, Trash, Save } from 'lucide-react';
import { updateBatch, deleteBatch, createBatch } from '../api/client';

export function WarehouseModal({ isOpen, onClose, warehouse, inventory, supplierId, onRefresh }) {
  if (!isOpen || !warehouse) return null;

  const [editingId, setEditingId] = useState(null);
  const [localEdits, setLocalEdits] = useState({});
  const [adding, setAdding] = useState(false);
  const [isTypePickerOpen, setIsTypePickerOpen] = useState(false);
  const [batchToDelete, setBatchToDelete] = useState(null);
  const [newItem, setNewItem] = useState({ fertilizer_type: '', quantity_bags: '', unit_weight_kg: '' });

  const batches = inventory.filter((item) => item.storageLocationId === warehouse.id);

  const fertilizerTypeOptions = useMemo(() => {
    const options = new Map();
    inventory.forEach((item) => {
      const fertilizerType = String(item.name || '').trim();
      if (!fertilizerType) return;
      const existing = options.get(fertilizerType) || {
        name: fertilizerType,
        count: 0,
        unitWeightKg: item.unitWeightKg || '',
      };
      existing.count += 1;
      if (!existing.unitWeightKg && item.unitWeightKg) {
        existing.unitWeightKg = item.unitWeightKg;
      }
      options.set(fertilizerType, existing);
    });
    return Array.from(options.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [inventory]);

  const applyFertilizerType = (option) => {
    setNewItem((current) => ({
      ...current,
      fertilizer_type: option.name,
      unit_weight_kg: option.unitWeightKg || current.unit_weight_kg,
    }));
    setIsTypePickerOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-11/12 max-w-3xl rounded-lg overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">{warehouse.name} • {warehouse.section}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X /></button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-gray-600 mb-3">Capacity: {warehouse.capacity} bags • Current: {warehouse.current} bags</p>
          {batches.length === 0 ? (
            <p className="text-sm text-gray-600">No batches assigned to this location.</p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-sm text-gray-600 border-b">
                  <th className="py-2">Batch ID</th>
                  <th className="py-2">Fertilizer</th>
                  <th className="py-2">Available</th>
                  <th className="py-2">Expiry</th>
                  <th className="py-2">Certification</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b) => (
                  <tr key={b.id} className="border-b">
                    <td className="py-2">{b.id}</td>
                    <td className="py-2">
                      {editingId === b.id ? (
                        <input className="border px-2 py-1" value={localEdits.fertilizer_type || b.name} onChange={(e) => setLocalEdits({ ...localEdits, fertilizer_type: e.target.value })} />
                      ) : (
                        b.name
                      )}
                    </td>
                    <td className="py-2">
                      {editingId === b.id ? (
                        <input className="border px-2 py-1 w-24" value={localEdits.quantity_bags ?? b.available} onChange={(e) => setLocalEdits({ ...localEdits, quantity_bags: e.target.value })} />
                      ) : (
                        b.available
                      )}
                    </td>
                    <td className="py-2">{b.expiryDate || '—'}</td>
                    <td className="py-2">{b.certificationStatus}</td>
                    <td className="py-2">
                      {editingId === b.id ? (
                        <div className="flex items-center gap-2">
                          <button className="px-2 py-1 bg-green-600 text-white rounded" onClick={async () => {
                            try {
                              const payload = {};
                              if (localEdits.fertilizer_type) payload.fertilizer_type = localEdits.fertilizer_type;
                              if (localEdits.quantity_bags !== undefined) payload.quantity_bags = Number(localEdits.quantity_bags);
                              await updateBatch(b.id, payload);
                              setEditingId(null);
                              setLocalEdits({});
                              onClose();
                              if (typeof onRefresh === 'function') onRefresh();
                            } catch (err) {
                              alert(err.message || 'Update failed');
                            }
                          }}><Save size={14} /> Save</button>
                          <button className="px-2 py-1 border rounded" onClick={() => { setEditingId(null); setLocalEdits({}); }}><X size={14} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button className="px-2 py-1 border rounded" onClick={() => { setEditingId(b.id); setLocalEdits({ fertilizer_type: b.name, quantity_bags: b.available }); }}><Edit2 size={14} /></button>
                          <button className="px-2 py-1 border rounded text-red-600" onClick={() => setBatchToDelete(b)}><Trash size={14} /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <div className="mt-4 border-t pt-3">
            {adding ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <input placeholder="Fertilizer type" value={newItem.fertilizer_type} onChange={(e) => setNewItem({ ...newItem, fertilizer_type: e.target.value })} className="px-2 py-1 border rounded flex-1" />
                      <button type="button" className="px-3 py-1 border rounded text-sm text-green-700" onClick={() => setIsTypePickerOpen(true)}>
                        Pick Existing
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">Choose a type from existing products to reuse the same fertilizer name and unit weight.</p>
                  </div>
                  <input placeholder="Quantity (bags)" type="number" value={newItem.quantity_bags} onChange={(e) => setNewItem({ ...newItem, quantity_bags: e.target.value })} className="px-2 py-1 border rounded w-32" />
                  <input placeholder="Unit weight (kg)" type="number" value={newItem.unit_weight_kg} onChange={(e) => setNewItem({ ...newItem, unit_weight_kg: e.target.value })} className="px-2 py-1 border rounded w-36" />
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={async () => {
                    try {
                      const payload = {
                        supplier_id: supplierId,
                        batch_code: `WH-${warehouse.id}-${Date.now()}`,
                        fertilizer_type: newItem.fertilizer_type,
                        storage_location_id: warehouse.id,
                      };
                      if (newItem.quantity_bags) payload.quantity_bags = Number(newItem.quantity_bags);
                      if (newItem.unit_weight_kg) payload.unit_weight_kg = Number(newItem.unit_weight_kg);
                      await createBatch(payload);
                          setNewItem({ fertilizer_type: '', quantity_bags: '', unit_weight_kg: '' });
                          setAdding(false);
                          onClose();
                          if (typeof onRefresh === 'function') onRefresh();
                    } catch (err) {
                      alert(err.message || 'Create failed');
                    }
                  }}><Plus size={14} /> Add</button>
                  <button className="px-4 py-2 border rounded" onClick={() => { setAdding(false); setNewItem({ fertilizer_type: '', quantity_bags: '', unit_weight_kg: '' }); }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button className="px-3 py-2 bg-blue-600 text-white rounded" onClick={() => setAdding(true)}><Plus size={14} /> Add Product</button>
                <p className="text-sm text-gray-600">Add a new fertilizer batch to this warehouse.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isTypePickerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Choose Fertilizer Type</h3>
                <p className="text-sm text-gray-500">Pick an existing product type to speed up adding a similar batch.</p>
              </div>
              <button
                onClick={() => setIsTypePickerOpen(false)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close fertilizer type picker"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-6">
              {fertilizerTypeOptions.length === 0 ? (
                <p className="text-sm text-gray-600">No existing product types found yet.</p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {fertilizerTypeOptions.map((option) => (
                    <button
                      key={option.name}
                      type="button"
                      onClick={() => applyFertilizerType(option)}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-left hover:border-green-300 hover:bg-green-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-gray-900">{option.name}</p>
                          <p className="text-sm text-gray-600">Used in {option.count} batch{option.count === 1 ? '' : 'es'}</p>
                        </div>
                        <span className="rounded-full bg-white px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-green-200">
                          Select
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        {option.unitWeightKg ? `Suggested unit weight: ${option.unitWeightKg} kg` : 'No unit weight saved for this type yet.'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {batchToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete product batch?</h3>
                <p className="mt-1 text-sm text-gray-500">This action cannot be undone.</p>
              </div>
              <button
                onClick={() => setBatchToDelete(null)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Close delete confirmation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 px-6 py-5">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete <span className="font-semibold text-gray-900">{batchToDelete.name}</span>
                {batchToDelete.expiryDate ? ` with expiry ${batchToDelete.expiryDate}` : ''}?
              </p>
              <p className="text-sm text-gray-500">
                The batch will be removed from this warehouse and cannot be restored.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <button
                onClick={() => setBatchToDelete(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!batchToDelete) return;
                  try {
                    await deleteBatch(batchToDelete.id);
                    setBatchToDelete(null);
                    onClose();
                    if (typeof onRefresh === 'function') onRefresh();
                  } catch (err) {
                    alert(err.message || 'Delete failed');
                  }
                }}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Delete batch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
