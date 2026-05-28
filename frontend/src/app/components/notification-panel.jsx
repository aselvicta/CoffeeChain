import React from 'react';
import { X } from 'lucide-react';

export function NotificationPanel({ isOpen, onClose }) {
  if (!isOpen) return null;
  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl z-40">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">Notifications</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100"><X /></button>
      </div>
      <div className="p-4 overflow-y-auto h-[calc(100%-56px)]">
        <div className="space-y-3">
          <div className="p-3 border rounded bg-yellow-50">
            <p className="text-sm font-medium">Expiry Risk: Batch BATCH-2026-0001 expiring in 18 days</p>
            <p className="text-xs text-gray-600 mt-1">Location: Main Warehouse</p>
          </div>
          <div className="p-3 border rounded bg-blue-50">
            <p className="text-sm font-medium">Transfer T-20260528-001 dispatched to Retailer 23</p>
            <p className="text-xs text-gray-600 mt-1">Click to view transfer details in history</p>
          </div>
          <div className="p-3 border rounded bg-red-50">
            <p className="text-sm font-medium">Unverified Delivery: Transfer T-20260527-099 needs confirmation</p>
            <p className="text-xs text-gray-600 mt-1">Sent to Retailer 12</p>
          </div>
        </div>
      </div>
    </div>
  );
}
