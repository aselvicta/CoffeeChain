import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { fetchTransfers, fetchBatches } from '../api/client';

export function TraceBatchModal({ isOpen, onClose, batchId }) {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      setLoading(true);
      try {
        const [transfers, batches] = await Promise.all([fetchTransfers(), fetchBatches()]);
        const batch = batches.find((b) => b.batch_code === batchId) || batches.find((b) => String(b.id) === String(batchId));
        const related = transfers.filter((t) => t.batch?.id === (batch?.id || Number(batchId))).sort((a,b)=> new Date(a.created_at)-new Date(b.created_at));
        const items = [];
        if (batch) {
          items.push({ step: 'Created', actor: batch.supplier?.name || 'Supplier', qty: batch.quantity_bags, timestamp: batch.created_at || '' });
        }
        related.forEach((t) => {
          if (t.transfer_type === 'SUPPLIER_TO_BRANCH') {
            items.push({ step: 'Dispatched', actor: t.from_supplier?.name || 'Supplier', qty: t.quantity_bags, timestamp: t.created_at });
            items.push({ step: 'Received', actor: t.to_branch?.name || 'Branch', qty: t.quantity_bags, timestamp: t.received_at || '' });
          } else if (t.transfer_type === 'BRANCH_TO_FARMER') {
            items.push({ step: 'Distributed', actor: t.from_branch?.name || 'Branch', qty: t.quantity_bags, timestamp: t.created_at });
            if (t.status === 'VERIFIED') items.push({ step: 'Verified', actor: 'Farmer', qty: t.quantity_bags, timestamp: t.verified_at || t.created_at });
          }
        });
        setTimeline(items);
      } catch (e) {
        setTimeline([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isOpen, batchId]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white w-3/4 max-w-2xl rounded-lg overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Trace Batch {batchId}</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X /></button>
        </div>
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          {loading ? <p>Loading...</p> : (
            timeline.length === 0 ? <p className="text-sm text-gray-600">No timeline found for this batch.</p> : (
              <ol className="space-y-3">
                {timeline.map((item, idx) => (
                  <li key={idx} className="border rounded p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.step}</p>
                        <p className="text-sm text-gray-600">{item.actor} • {item.qty} bags</p>
                      </div>
                      <div className="text-xs text-gray-500">{item.timestamp ? new Date(item.timestamp).toLocaleString() : '—'}</div>
                    </div>
                  </li>
                ))}
              </ol>
            )
          )}
        </div>
      </div>
    </div>
  );
}
