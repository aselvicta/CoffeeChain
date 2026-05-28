import React, { useState } from 'react';
import { X, Plus, Edit2, Trash, Save } from 'lucide-react';
import { updateBatch, deleteBatch, createBatch } from '../api/client';

export function WarehouseModal({ isOpen, onClose, warehouse, inventory, supplierId, onRefresh }) {
  if (!isOpen || !warehouse) return null;

  const [editingId, setEditingId] = useState(null);
  const [localEdits, setLocalEdits] = useState({});
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ fertilizer_type: '', quantity_bags: '', unit_weight_kg: '' });

  const batches = inventory.filter((item) => item.storageLocationId === warehouse.id);

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
                          <button className="px-2 py-1 border rounded text-red-600" onClick={async () => {
                            if (!confirm('Delete this batch?')) return;
                            try {
                              await deleteBatch(b.id);
                              onClose();
                              if (typeof onRefresh === 'function') onRefresh();
                            } catch (err) {
                              alert(err.message || 'Delete failed');
                            }
                          }}><Trash size={14} /></button>
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
                  <input placeholder="Fertilizer type" value={newItem.fertilizer_type} onChange={(e) => setNewItem({ ...newItem, fertilizer_type: e.target.value })} className="px-2 py-1 border rounded flex-1" />
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
    </div>
  );
}
