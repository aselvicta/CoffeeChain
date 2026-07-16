import { useMemo, useState } from 'react';
import { sortByDateDesc, HISTORY_PAGE_SIZE } from '../utils/list-limits';
import { usePaginatedList } from '../hooks/use-paginated-list';
import { PaginationBar } from './ui/pagination-bar';
import {
  FileWarning,
  Package,
  Truck,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Calendar,
  Inbox,
} from 'lucide-react';
import { createIssue, receiveTransfer } from '../api/client';
import { ContentListRow, PanelOutlineButton } from './ui/dashboard-ui';
import { getUserMessage } from '../utils/user-messages';

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
  const [issueBusy, setIssueBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [issueForm, setIssueForm] = useState({
    issueType: 'DISCREPANCY',
    summary: '',
    description: '',
    evidenceFile: null,
  });

  const pending = useMemo(
    () => inboundTransfers.filter((transfer) => transfer.status === 'DISPATCHED'),
    [inboundTransfers]
  );
  const completed = useMemo(
    () =>
      sortByDateDesc(
        inboundTransfers.filter((transfer) => transfer.status !== 'DISPATCHED')
      ),
    [inboundTransfers]
  );
  const receiptHistoryPagination = usePaginatedList(completed, HISTORY_PAGE_SIZE);

  const closeIssueForm = () => {
    setSelectedTransfer(null);
    setIssueForm({
      issueType: 'DISCREPANCY',
      summary: '',
      description: '',
      evidenceFile: null,
    });
  };

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
      setErrorMessage(getUserMessage(error, 'Could not confirm receipt. Please try again.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleOpenDetails = (transfer) => {
    closeIssueForm();
    setSelectedTransfer(transfer);
    setErrorMessage('');
  };

  const handleIssueSubmit = async (event) => {
    event.preventDefault();
    if (!selectedTransfer) {
      return;
    }
    const summary = issueForm.summary.trim();
    const description = issueForm.description.trim();
    if (!summary || !description) {
      setErrorMessage('Please provide both summary and detailed description for the issue.');
      return;
    }

    setIssueBusy(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await createIssue({
        transferId: selectedTransfer.id,
        issueType: issueForm.issueType,
        summary,
        description,
        evidenceFile: issueForm.evidenceFile,
      });
      setSuccessMessage(`Issue submitted for ${selectedTransfer.batchCode || `Transfer #${selectedTransfer.id}`}.`);
      closeIssueForm();
      await onRefresh?.();
    } catch (error) {
      setErrorMessage(getUserMessage(error, 'Could not submit issue. Please try again.'));
    } finally {
      setIssueBusy(false);
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
                <ContentListRow
                  key={transfer.id}
                  icon={Package}
                  tone="amber"
                  highlighted={String(highlightTransferId) === String(transfer.id)}
                  action={
                    <div className="flex items-center gap-2">
                      <PanelOutlineButton
                        icon={FileWarning}
                        onClick={() => handleOpenDetails(transfer)}
                      >
                        View details
                      </PanelOutlineButton>
                      <PanelOutlineButton
                        icon={isBusy ? Loader2 : CheckCircle2}
                        onClick={() => handleReceive(transfer)}
                        disabled={isBusy}
                        className={isBusy ? '[&_svg]:animate-spin' : ''}
                      >
                        {isBusy ? 'Confirming' : 'Confirm Receipt'}
                      </PanelOutlineButton>
                    </div>
                  }
                >
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
                </ContentListRow>
              );
            })}
          </div>
        )}
      </div>

      {selectedTransfer && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-900">Received dispatch details</h3>
            <p className="text-sm text-gray-600">
              Batch {selectedTransfer.batchCode || `Transfer #${selectedTransfer.id}`} from {selectedTransfer.source}
            </p>
            <p className="text-sm text-gray-600">
              {selectedTransfer.bags} bags
              {selectedTransfer.fertilizerType ? ` • ${selectedTransfer.fertilizerType}` : ''} • {selectedTransfer.date}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleIssueSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="text-sm text-gray-700">
                <span className="mb-1 block font-medium">Issue type</span>
                <select
                  value={issueForm.issueType}
                  onChange={(event) =>
                    setIssueForm((current) => ({ ...current, issueType: event.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500"
                >
                  <option value="DISCREPANCY">Discrepancy</option>
                  <option value="COMPLAINT">Complaint</option>
                </select>
              </label>
              <label className="text-sm text-gray-700">
                <span className="mb-1 block font-medium">Evidence (optional)</span>
                <input
                  type="file"
                  accept="image/*,video/*,.pdf,.doc,.docx,.txt,.csv"
                  onChange={(event) =>
                    setIssueForm((current) => ({ ...current, evidenceFile: event.target.files?.[0] || null }))
                  }
                  className="w-full text-sm text-gray-600"
                />
              </label>
            </div>

            <label className="text-sm text-gray-700">
              <span className="mb-1 block font-medium">Summary</span>
              <input
                type="text"
                value={issueForm.summary}
                onChange={(event) =>
                  setIssueForm((current) => ({ ...current, summary: event.target.value }))
                }
                placeholder="Short issue summary"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500"
              />
            </label>

            <label className="text-sm text-gray-700">
              <span className="mb-1 block font-medium">Description</span>
              <textarea
                rows={4}
                value={issueForm.description}
                onChange={(event) =>
                  setIssueForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="Describe the complaint/discrepancy and expected resolution"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500"
              />
            </label>

            <div className="flex items-center gap-2">
              <PanelOutlineButton
                icon={issueBusy ? Loader2 : AlertCircle}
                type="submit"
                disabled={issueBusy || !issueForm.summary.trim() || !issueForm.description.trim()}
                className={issueBusy ? '[&_svg]:animate-spin' : ''}
              >
                {issueBusy ? 'Submitting issue' : 'Submit issue'}
              </PanelOutlineButton>
              <PanelOutlineButton
                icon={AlertCircle}
                type="button"
                onClick={closeIssueForm}
                disabled={issueBusy}
              >
                Close
              </PanelOutlineButton>
            </div>
          </form>
        </div>
      )}

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
                {receiptHistoryPagination.pageItems.map((transfer) => {
                  const badge =
                    STATUS_BADGES[transfer.status] || STATUS_BADGES.RECEIVED;
                  return (
                    <tr
                      key={transfer.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => handleOpenDetails(transfer)}
                    >
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
            <PaginationBar
              page={receiptHistoryPagination.page}
              totalPages={receiptHistoryPagination.totalPages}
              total={receiptHistoryPagination.total}
              rangeStart={receiptHistoryPagination.rangeStart}
              rangeEnd={receiptHistoryPagination.rangeEnd}
              onPrev={receiptHistoryPagination.goPrev}
              onNext={receiptHistoryPagination.goNext}
              canPrev={receiptHistoryPagination.canPrev}
              canNext={receiptHistoryPagination.canNext}
              className="px-4 pb-4"
            />
          </div>
        )}
      </div>
    </div>
  );
}
