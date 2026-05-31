import { useMemo, useState } from 'react';
import {
  Package,
  Truck,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Calendar,
  Inbox,
} from 'lucide-react';
import { receiveTransfer } from '../api/client';

const STATUS_BADGES = {
  DISPATCHED: {
    label: 'Awaiting Receipt',
    classes: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  RECEIVED: {
    label: 'Received',
    classes: 'bg-green-100 text-green-700 border-green-200',
  },
  VERIFIED: {
    label: 'Verified',
    classes: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
};

export function ReceiveFertilizerPanel({ inboundTransfers, onRefresh, highlightTransferId = '' }) {
  const [busyId, setBusyId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const pending = useMemo(
    () => inboundTransfers.filter((transfer) => transfer.status === 'DISPATCHED'),
    [inboundTransfers]
  );
  const completed = useMemo(
    () => inboundTransfers.filter((transfer) => transfer.status !== 'DISPATCHED'),
    [inboundTransfers]
  );

  const handleReceive = async (transfer) => {
    setBusyId(transfer.id);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await receiveTransfer(transfer.id);
      setSuccessMessage(
        `Receipt confirmed for ${transfer.batchCode || `Transfer #${transfer.id}`}.`
      );
      await onRefresh?.();
    } catch (error) {
      setErrorMessage(error.message || 'Failed to confirm receipt.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
          <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
          <p className="text-sm text-green-800">{successMessage}</p>
        </div>
      )}
      {errorMessage && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
          <p className="text-sm text-red-800">{errorMessage}</p>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900">Pending Receipts</h2>
          <p className="text-sm text-gray-600">
            Confirm fertilizer batches dispatched to this AMCOS. Confirming
            updates the stock and notifies the supplier.
          </p>
          {highlightTransferId && (
            <p className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              Notification selected Transfer ID: {highlightTransferId}
            </p>
          )}
        </div>

        {pending.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <Inbox className="mx-auto mb-2 h-8 w-8 text-gray-400" />
            <p className="text-sm font-medium text-gray-700">No pending receipts</p>
            <p className="mt-1 text-xs text-gray-500">
              You'll see batches here when a supplier dispatches them to your
              AMCOS.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map((transfer) => {
              const badge = STATUS_BADGES[transfer.status] || STATUS_BADGES.DISPATCHED;
              const isBusy = busyId === transfer.id;
              return (
                <div
                  key={transfer.id}
                  className={`flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between ${
                    String(highlightTransferId) === String(transfer.id)
                      ? 'border-emerald-300 bg-emerald-50/70 shadow-sm'
                      : 'border-gray-200 bg-gradient-to-r from-white to-amber-50/30'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-amber-100 p-3">
                      <Package className="h-5 w-5 text-amber-700" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900">
                          {transfer.batchCode || `Transfer #${transfer.id}`}
                        </p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badge.classes}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {transfer.bags} bags
                        {transfer.fertilizerType ? ` • ${transfer.fertilizerType}` : ''}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Truck className="h-3 w-3" />
                          From {transfer.source}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {transfer.date}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleReceive(transfer)}
                    disabled={isBusy}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isBusy ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Confirming
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-4 w-4" />
                        Confirm Receipt
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-gray-900">Receipt History</h3>
        {completed.length === 0 ? (
          <p className="text-sm text-gray-500">
            Receipts you confirm will appear here.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Batch
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Source
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Bags
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {completed.map((transfer) => {
                  const badge =
                    STATUS_BADGES[transfer.status] || STATUS_BADGES.RECEIVED;
                  return (
                    <tr key={transfer.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                        {transfer.batchCode || `#${transfer.id}`}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                        {transfer.source}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                        {transfer.bags}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm">
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badge.classes}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                        {transfer.date}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
