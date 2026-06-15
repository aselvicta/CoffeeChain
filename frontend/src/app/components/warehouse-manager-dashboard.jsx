import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  Eye,
  History,
  LogOut,
  Package,
  Search,
  Truck,
  Warehouse,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from './logo';
import { NotificationBell } from './notification-bell';
import { useNotifications } from '../hooks/use-notifications';
import { approveTransfer, fetchTransfers, rejectTransfer } from '../api/client';
import { buildDashboardPath, resolveDashboardTab } from '../utils/dashboard-routing';
import { getUserMessage } from '../utils/user-messages';
import { sortByDateDesc, HISTORY_PAGE_SIZE } from '../utils/list-limits';
import { usePaginatedList } from '../hooks/use-paginated-list';
import { PaginationBar } from './ui/pagination-bar';
import {
  ContentListRow,
  PanelOutlineButton,
  PanelPrimaryButton,
  QuickActionCard,
} from './ui/dashboard-ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

function getStatusMeta(status) {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'PENDING') {
    return {
      label: 'Pending Approval',
      tone: 'bg-amber-100 text-amber-800',
      description: 'Waiting for warehouse manager confirmation.',
    };
  }
  if (normalized === 'REJECTED') {
    return {
      label: 'Not Approved',
      tone: 'bg-red-100 text-red-800',
      description: 'Rejected by warehouse manager.',
    };
  }
  if (normalized === 'RECEIVED') {
    return {
      label: 'Received',
      tone: 'bg-green-100 text-green-700',
      description: 'The receiver confirmed receipt.',
    };
  }
  if (normalized === 'VERIFIED') {
    return {
      label: 'Verified',
      tone: 'bg-emerald-100 text-emerald-700',
      description: 'Delivery verified downstream.',
    };
  }
  return {
    label: 'In Transit',
    tone: 'bg-blue-100 text-blue-700',
    description: 'Approved and on the way to the receiver.',
  };
}

function mapTransfer(transfer) {
  return {
    id: transfer.id,
    batchCode: transfer.batch?.batch_code || '—',
    product: transfer.batch?.fertilizer_type || '—',
    manufacturer: transfer.batch?.manufacturer || '—',
    certificationStatus: transfer.batch?.certification_status || '—',
    expiryDate: transfer.batch?.expiry_date || '—',
    bags: transfer.quantity_bags,
    recipient: transfer.to_branch?.name || '—',
    recipientRegion: transfer.to_branch?.region || '—',
    recipientDistrict: transfer.to_branch?.district || '—',
    recipientType: transfer.to_branch?.branch_type || '—',
    warehouse: transfer.warehouse?.name || '—',
    warehouseSection: transfer.warehouse?.section || '',
    date: transfer.created_at?.slice(0, 10) || '—',
    createdAt: transfer.created_at || '',
    rawStatus: transfer.status,
    rejectionMessage: transfer.rejection_message || '',
    rejectedAt: transfer.rejected_at?.slice(0, 10) || '',
    notes: transfer.notes || '',
    status: getStatusMeta(transfer.status).label,
    statusTone: getStatusMeta(transfer.status).tone,
    statusDescription: getStatusMeta(transfer.status).description,
  };
}

function applyTransferFilters(items, { search, statusFilter, warehouseFilter, sortBy }) {
  const needle = search.trim().toLowerCase();
  let result = items.filter((transfer) => {
    if (statusFilter !== 'all' && transfer.rawStatus !== statusFilter) {
      return false;
    }
    if (warehouseFilter !== 'all' && transfer.warehouse !== warehouseFilter) {
      return false;
    }
    if (!needle) {
      return true;
    }
    return [
      transfer.batchCode,
      transfer.product,
      transfer.recipient,
      transfer.warehouse,
      transfer.manufacturer,
    ].some((field) => String(field).toLowerCase().includes(needle));
  });

  if (sortBy === 'batch') {
    result = [...result].sort((left, right) => left.batchCode.localeCompare(right.batchCode));
  } else if (sortBy === 'receiver') {
    result = [...result].sort((left, right) => left.recipient.localeCompare(right.recipient));
  } else if (sortBy === 'warehouse') {
    result = [...result].sort((left, right) => left.warehouse.localeCompare(right.warehouse));
  } else {
    result = sortByDateDesc(result, 'createdAt');
  }

  return result;
}

function TransferFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  warehouseFilter,
  onWarehouseChange,
  sortBy,
  onSortChange,
  warehouseOptions,
  statusOptions,
  showStatusFilter = true,
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:flex-wrap">
      <div className="relative min-w-0 flex-1 lg:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search batch, product, receiver..."
          className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-500"
        />
      </div>
      {showStatusFilter ? (
        <select
          value={statusFilter}
          onChange={(event) => onStatusChange(event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : null}
      <select
        value={warehouseFilter}
        onChange={(event) => onWarehouseChange(event.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
      >
        <option value="all">All warehouses</option>
        {warehouseOptions.map((warehouse) => (
          <option key={warehouse} value={warehouse}>
            {warehouse}
          </option>
        ))}
      </select>
      <select
        value={sortBy}
        onChange={(event) => onSortChange(event.target.value)}
        className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
      >
        <option value="date">Sort by date</option>
        <option value="batch">Sort by batch</option>
        <option value="receiver">Sort by receiver</option>
        <option value="warehouse">Sort by warehouse</option>
      </select>
    </div>
  );
}

function TransferReviewDialog({
  transfer,
  open,
  onOpenChange,
  busyId,
  rejectMode,
  rejectMessage,
  onRejectMessageChange,
  onStartReject,
  onCancelReject,
  onApprove,
  onReject,
}) {
  if (!transfer) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review dispatch #{transfer.id}</DialogTitle>
          <DialogDescription>
            Confirm batch details before approving or sending a disapproval reply to the supplier.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-sm">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Batch</p>
            <p className="mt-1 font-semibold text-gray-900">{transfer.batchCode}</p>
            <p className="text-gray-700">{transfer.product}</p>
            <p className="mt-2 text-gray-600">Manufacturer: {transfer.manufacturer}</p>
            <p className="text-gray-600">Certification: {transfer.certificationStatus}</p>
            <p className="text-gray-600">Expiry: {transfer.expiryDate}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Shipment</p>
            <p className="mt-1 font-semibold text-gray-900">{transfer.bags} bags</p>
            <p className="text-gray-600">
              Warehouse: {transfer.warehouse}
              {transfer.warehouseSection ? ` (${transfer.warehouseSection})` : ''}
            </p>
            <p className="text-gray-600">Submitted: {transfer.date}</p>
            <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${transfer.statusTone}`}>
              {transfer.status}
            </span>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Receiver</p>
            <p className="mt-1 font-semibold text-gray-900">{transfer.recipient}</p>
            <p className="text-gray-600">
              {transfer.recipientType} • {transfer.recipientDistrict || transfer.recipientRegion || '—'}
            </p>
          </div>
          {transfer.notes && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Supplier notes</p>
              <p className="mt-1 text-gray-700">{transfer.notes}</p>
            </div>
          )}
          {transfer.rejectionMessage ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 sm:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Disapproval reply</p>
              <p className="mt-1 text-sm text-red-800">{transfer.rejectionMessage}</p>
              {transfer.rejectedAt ? (
                <p className="mt-1 text-xs text-red-600">Sent on {transfer.rejectedAt}</p>
              ) : null}
            </div>
          ) : null}
        </div>

        {rejectMode ? (
          <label className="block text-sm text-gray-700">
            <span className="mb-1 block font-medium">Disapproval message to supplier</span>
            <textarea
              rows={4}
              value={rejectMessage}
              onChange={(event) => onRejectMessageChange(event.target.value)}
              placeholder="Explain why this dispatch cannot be approved..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-green-500"
            />
          </label>
        ) : null}

        <DialogFooter className="gap-2 sm:gap-2">
          {transfer.rawStatus !== 'PENDING' ? (
            <PanelOutlineButton type="button" onClick={() => onOpenChange(false)}>
              Close
            </PanelOutlineButton>
          ) : rejectMode ? (
            <>
              <PanelOutlineButton type="button" onClick={onCancelReject} disabled={busyId === transfer.id}>
                Back
              </PanelOutlineButton>
              <PanelPrimaryButton
                type="button"
                disabled={busyId === transfer.id || !rejectMessage.trim()}
                onClick={() => onReject(transfer)}
                className="!bg-red-600 hover:!bg-red-700"
              >
                {busyId === transfer.id ? 'Sending…' : 'Send disapproval'}
              </PanelPrimaryButton>
            </>
          ) : (
            <>
              <PanelOutlineButton type="button" onClick={() => onOpenChange(false)}>
                Close
              </PanelOutlineButton>
              <PanelOutlineButton
                type="button"
                icon={XCircle}
                disabled={busyId === transfer.id || transfer.rawStatus !== 'PENDING'}
                onClick={onStartReject}
              >
                Disapprove
              </PanelOutlineButton>
              <PanelPrimaryButton
                type="button"
                disabled={busyId === transfer.id || transfer.rawStatus !== 'PENDING'}
                onClick={() => onApprove(transfer)}
              >
                {busyId === transfer.id ? 'Approving…' : 'Approve & dispatch'}
              </PanelPrimaryButton>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferList({ items, busyId, onReview, emptyMessage }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((transfer) => (
        <ContentListRow
          key={transfer.id}
          icon={Package}
          tone={transfer.rawStatus === 'PENDING' ? 'amber' : transfer.rawStatus === 'REJECTED' ? 'red' : 'green'}
          action={
            <PanelOutlineButton type="button" icon={Eye} onClick={() => onReview(transfer)}>
              Review
            </PanelOutlineButton>
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-gray-900">
              {transfer.batchCode} • {transfer.product}
            </p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${transfer.statusTone}`}>
              {transfer.status}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            {transfer.bags} bags to {transfer.recipient} • {transfer.warehouse}
          </p>
          <p className="text-xs text-gray-500">{transfer.date}</p>
          {transfer.rejectionMessage ? (
            <p className="mt-1 text-xs text-red-700">Reply: {transfer.rejectionMessage}</p>
          ) : null}
        </ContentListRow>
      ))}
    </div>
  );
}

export function WarehouseManagerDashboard({ userProfile, onLogout }) {
  const dashboardRole = 'warehouse_manager';
  const dashboardTabs = ['overview', 'pending', 'history'];
  const [activeTab, setActiveTab] = useState('overview');
  const [transfers, setTransfers] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectMessage, setRejectMessage] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingWarehouseFilter, setPendingWarehouseFilter] = useState('all');
  const [pendingSort, setPendingSort] = useState('date');
  const [historySearch, setHistorySearch] = useState('');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [historyWarehouseFilter, setHistoryWarehouseFilter] = useState('all');
  const [historySort, setHistorySort] = useState('date');
  const {
    notifications,
    unreadCount,
    refresh: refreshNotifications,
    markRead,
    markAllRead,
    dismiss,
  } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setActiveTab(
      resolveDashboardTab(location.pathname, dashboardRole, {
        defaultTab: 'overview',
        validTabs: dashboardTabs,
      })
    );
  }, [location.pathname]);

  const goToTab = (tab) => {
    const nextTab = dashboardTabs.includes(tab) ? tab : 'overview';
    setActiveTab(nextTab);
    navigate(buildDashboardPath(dashboardRole, nextTab));
  };

  const refreshData = async () => {
    const data = await fetchTransfers({
      transfer_type: 'SUPPLIER_TO_BRANCH',
      supplier_id: userProfile.supplierRecordId,
    });
    setTransfers(data.map(mapTransfer));
  };

  useEffect(() => {
    refreshData().catch(() => setTransfers([]));
  }, [userProfile.supplierRecordId]);

  const warehouseOptions = useMemo(
    () => [...new Set(transfers.map((transfer) => transfer.warehouse).filter(Boolean))].sort(),
    [transfers]
  );

  const pendingTransfers = useMemo(
    () => transfers.filter((transfer) => transfer.rawStatus === 'PENDING'),
    [transfers]
  );

  const historyTransfers = useMemo(
    () => transfers.filter((transfer) => transfer.rawStatus !== 'PENDING'),
    [transfers]
  );

  const filteredPending = useMemo(
    () =>
      applyTransferFilters(pendingTransfers, {
        search: pendingSearch,
        statusFilter: 'PENDING',
        warehouseFilter: pendingWarehouseFilter,
        sortBy: pendingSort,
      }),
    [pendingTransfers, pendingSearch, pendingWarehouseFilter, pendingSort]
  );

  const filteredHistory = useMemo(
    () =>
      applyTransferFilters(historyTransfers, {
        search: historySearch,
        statusFilter: historyStatusFilter,
        warehouseFilter: historyWarehouseFilter,
        sortBy: historySort,
      }),
    [historyTransfers, historySearch, historyStatusFilter, historyWarehouseFilter, historySort]
  );

  const pendingPagination = usePaginatedList(filteredPending, HISTORY_PAGE_SIZE);
  const historyPagination = usePaginatedList(filteredHistory, HISTORY_PAGE_SIZE);

  const closeReview = () => {
    setReviewOpen(false);
    setRejectMode(false);
    setRejectMessage('');
    setSelectedTransfer(null);
  };

  const openReview = (transfer) => {
    setSelectedTransfer(transfer);
    setRejectMode(false);
    setRejectMessage('');
    setReviewOpen(true);
  };

  const handleApprove = async (transfer) => {
    setBusyId(transfer.id);
    try {
      await approveTransfer(transfer.id);
      toast.success(
        `Approved ${transfer.bags} bags of ${transfer.product} to ${transfer.recipient}. Now in transit.`,
        { duration: 8000 }
      );
      closeReview();
      await refreshData();
      await refreshNotifications();
    } catch (error) {
      toast.error(getUserMessage(error, 'Could not approve this dispatch.'));
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (transfer) => {
    const message = rejectMessage.trim();
    if (!message) {
      toast.error('Enter a disapproval message for the supplier.');
      return;
    }
    setBusyId(transfer.id);
    try {
      await rejectTransfer(transfer.id, message);
      toast.success('Disapproval sent to the supplier.', { duration: 8000 });
      closeReview();
      await refreshData();
      await refreshNotifications();
    } catch (error) {
      toast.error(getUserMessage(error, 'Could not reject this dispatch.'));
    } finally {
      setBusyId(null);
    }
  };

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'pending', label: 'Pending Approval', icon: Clock, badge: pendingTransfers.length },
    { id: 'history', label: 'Dispatch History', icon: History },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="w-72 bg-gradient-to-b from-green-700 to-green-900 text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-green-600">
          <div className="w-fit mx-auto bg-white rounded-xl px-4 py-2 shadow-lg">
            <Logo size="md" variant="full" showText={false} />
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => goToTab(item.id)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === item.id
                  ? 'bg-green-600 text-white'
                  : 'text-green-100 hover:bg-green-600/50'
              }`}
            >
              <span className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </span>
              {item.badge > 0 ? (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Warehouse Manager Dashboard</h1>
              <p className="text-sm text-gray-600">{userProfile.organization}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <NotificationBell
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkRead={markRead}
                onMarkAllRead={markAllRead}
                onDismiss={dismiss}
              />
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <QuickActionCard
                  icon={Clock}
                  tone="amber"
                  title={`${pendingTransfers.length} pending`}
                  description="Dispatches waiting for your sign-off"
                  onClick={() => goToTab('pending')}
                />
                <QuickActionCard
                  icon={Truck}
                  tone="green"
                  title={`${transfers.filter((t) => t.rawStatus === 'DISPATCHED').length} in transit`}
                  description="Approved and awaiting branch receipt"
                  onClick={() => goToTab('history')}
                />
                <QuickActionCard
                  icon={Package}
                  tone="green"
                  title={`${transfers.filter((t) => t.rawStatus === 'REJECTED').length} not approved`}
                  description="Rejected dispatches returned to supplier"
                  onClick={() => {
                    setHistoryStatusFilter('REJECTED');
                    goToTab('history');
                  }}
                />
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Recent pending dispatches</h2>
                <TransferList
                  items={pendingTransfers.slice(0, 5)}
                  busyId={busyId}
                  onReview={openReview}
                  emptyMessage="No dispatches waiting for approval."
                />
              </div>
            </div>
          )}

          {activeTab === 'pending' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Pending warehouse approval</h2>
              <p className="mb-4 text-sm text-gray-600">
                Review full dispatch details before approving or sending a disapproval reply.
              </p>
              <TransferFilters
                search={pendingSearch}
                onSearchChange={setPendingSearch}
                statusFilter="PENDING"
                onStatusChange={() => {}}
                warehouseFilter={pendingWarehouseFilter}
                onWarehouseChange={setPendingWarehouseFilter}
                sortBy={pendingSort}
                onSortChange={setPendingSort}
                warehouseOptions={warehouseOptions}
                statusOptions={[]}
                showStatusFilter={false}
              />
              <TransferList
                items={pendingPagination.pageItems}
                busyId={busyId}
                onReview={openReview}
                emptyMessage="No pending dispatches match your filters."
              />
              <PaginationBar
                page={pendingPagination.page}
                totalPages={pendingPagination.totalPages}
                total={pendingPagination.total}
                rangeStart={pendingPagination.rangeStart}
                rangeEnd={pendingPagination.rangeEnd}
                onPrev={pendingPagination.goPrev}
                onNext={pendingPagination.goNext}
                canPrev={pendingPagination.canPrev}
                canNext={pendingPagination.canNext}
              />
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Dispatch history</h2>
              <TransferFilters
                search={historySearch}
                onSearchChange={setHistorySearch}
                statusFilter={historyStatusFilter}
                onStatusChange={setHistoryStatusFilter}
                warehouseFilter={historyWarehouseFilter}
                onWarehouseChange={setHistoryWarehouseFilter}
                sortBy={historySort}
                onSortChange={setHistorySort}
                warehouseOptions={warehouseOptions}
                statusOptions={[
                  { value: 'all', label: 'All statuses' },
                  { value: 'DISPATCHED', label: 'In transit' },
                  { value: 'RECEIVED', label: 'Received' },
                  { value: 'VERIFIED', label: 'Verified' },
                  { value: 'REJECTED', label: 'Not approved' },
                ]}
              />
              <TransferList
                items={historyPagination.pageItems}
                busyId={busyId}
                onReview={openReview}
                emptyMessage="No dispatches match your filters."
              />
              <PaginationBar
                page={historyPagination.page}
                totalPages={historyPagination.totalPages}
                total={historyPagination.total}
                rangeStart={historyPagination.rangeStart}
                rangeEnd={historyPagination.rangeEnd}
                onPrev={historyPagination.goPrev}
                onNext={historyPagination.goNext}
                canPrev={historyPagination.canPrev}
                canNext={historyPagination.canNext}
              />
            </div>
          )}
        </main>
      </div>

      <TransferReviewDialog
        transfer={selectedTransfer}
        open={reviewOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeReview();
          } else {
            setReviewOpen(true);
          }
        }}
        busyId={busyId}
        rejectMode={rejectMode}
        rejectMessage={rejectMessage}
        onRejectMessageChange={setRejectMessage}
        onStartReject={() => setRejectMode(true)}
        onCancelReject={() => {
          setRejectMode(false);
          setRejectMessage('');
        }}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
