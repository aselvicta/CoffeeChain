import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock,
  Eye,
  History,
  LogOut,
  Package,
  Search,
  ShoppingBag,
  TrendingUp,
  Truck,
  Warehouse,
  XCircle,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { toast } from 'sonner';
import { Logo } from './logo';
import { NotificationBell } from './notification-bell';
import { useNotifications } from '../hooks/use-notifications';
import { fetchOrders, fetchWarehouses, fetchWarehouseCatalog } from '../api/client';
import { WM_ACTION_STATUSES } from '../utils/order-status';
import { approveTransfer, fetchTransfers, rejectTransfer } from '../api/client';
import { OrdersQueuePanel } from './orders-queue-panel';
import { buildDashboardPath, resolveDashboardTab } from '../utils/dashboard-routing';
import { getUserMessage } from '../utils/user-messages';
import { sortByDateDesc, HISTORY_PAGE_SIZE } from '../utils/list-limits';
import { exportAnalyticsPdf, exportAnalyticsCsv } from '../utils/analytics-export';
import { AnalyticsExportBar, filterByDateRange } from './ui/analytics-export-bar';
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
  const dashboardTabs = ['overview', 'orders', 'pending', 'inventory', 'history', 'analytics'];
  const [activeTab, setActiveTab] = useState('overview');
  const [transfers, setTransfers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [warehouseCatalog, setWarehouseCatalog] = useState([]);
  const [ordersQueue, setOrdersQueue] = useState([]);
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
    try {
      const [whData, catalogData] = await Promise.all([fetchWarehouses(), fetchWarehouseCatalog()]);
      setWarehouses(whData || []);
      setWarehouseCatalog(catalogData || []);
    } catch {
      // non-critical
    }
    const data = await fetchTransfers({
      transfer_type: 'SUPPLIER_TO_BRANCH',
      supplier_id: userProfile.supplierRecordId,
    });
    setTransfers(data.map(mapTransfer));
    try {
      const ordersData = await fetchOrders();
      setOrdersQueue(Array.isArray(ordersData) ? ordersData : (ordersData?.results || []));
    } catch {
      // non-critical
    }
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

  // ── Analytics chart data ─────────────────────────────────────────────────
  const dispatchTrend = useMemo(() => {
    const counts = {};
    transfers.forEach((t) => {
      const d = (t.date || '').slice(0, 10);
      if (!d) return;
      counts[d] = counts[d] || { date: d, total: 0, received: 0, rejected: 0 };
      counts[d].total += 1;
      if (t.rawStatus === 'RECEIVED' || t.rawStatus === 'VERIFIED') counts[d].received += 1;
      if (t.rawStatus === 'REJECTED') counts[d].rejected += 1;
    });
    return Object.values(counts).sort((a, b) => a.date.localeCompare(b.date)).slice(-30);
  }, [transfers]);

  const statusBreakdown = useMemo(() => {
    const map = { PENDING: 0, DISPATCHED: 0, RECEIVED: 0, VERIFIED: 0, REJECTED: 0 };
    transfers.forEach((t) => { if (map[t.rawStatus] !== undefined) map[t.rawStatus] += 1; });
    return [
      { name: 'Pending', value: map.PENDING, color: '#f59e0b' },
      { name: 'In Transit', value: map.DISPATCHED, color: '#3b82f6' },
      { name: 'Received', value: map.RECEIVED, color: '#10b981' },
      { name: 'Verified', value: map.VERIFIED, color: '#059669' },
      { name: 'Rejected', value: map.REJECTED, color: '#dc2626' },
    ].filter((s) => s.value > 0);
  }, [transfers]);

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

  const activeOrdersCount = ordersQueue.filter((o) =>
    WM_ACTION_STATUSES.includes(o.status)
  ).length;

  const sidebarItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'orders', label: 'Orders Queue', icon: ShoppingBag, badge: activeOrdersCount },
    { id: 'pending', label: 'Pending Approval', icon: Clock, badge: pendingTransfers.length },
    { id: 'inventory', label: 'Warehouse Inventory', icon: Warehouse },
    { id: 'history', label: 'Dispatch History', icon: History },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
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
                onNavigateTab={(tab) => goToTab(tab || 'overview')}
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
              <AnalyticsExportBar
                title="Warehouse Overview"
                subtitle="Dispatch approvals, inventory, and warehouse activity."
                onExcel={(from, to) => {
                  const filtered = filterByDateRange(transfers, from, to);
                  exportAnalyticsCsv({
                    role: 'Warehouse Manager',
                    orgName: userProfile?.organization || userProfile?.name || '',
                    filename: 'warehouse_analytics',
                    summaryRows: [
                      { label: 'Total Dispatches', value: filtered.length },
                      { label: 'Pending Approval', value: pendingTransfers.length },
                      { label: 'In Transit', value: filtered.filter((t) => t.rawStatus === 'DISPATCHED').length },
                      { label: 'Received', value: filtered.filter((t) => t.rawStatus === 'RECEIVED' || t.rawStatus === 'VERIFIED').length },
                      { label: 'Rejected', value: filtered.filter((t) => t.rawStatus === 'REJECTED').length },
                    ],
                    tableHeaders: ['Date', 'Supplier', 'Product', 'Bags', 'Destination', 'Status'],
                    tableData: filtered.map((t) => [t.date, t.supplier || '—', t.product || '—', t.bags ?? '—', t.destination || '—', t.rawStatus || '—']),
                  });
                }}
                onPdf={(from, to) => {
                  const filtered = filterByDateRange(transfers, from, to);
                  exportAnalyticsPdf({
                    role: 'Warehouse Manager',
                    orgName: userProfile?.organization || userProfile?.name || '',
                    title: 'Warehouse Analytics Report',
                    subtitle: from || to ? `Period: ${from || '…'} to ${to || 'today'}` : 'Dispatch approvals, inventory status & transfer history',
                    summaryRows: [
                      { label: 'Total Dispatches', value: filtered.length },
                      { label: 'Pending Approval', value: pendingTransfers.length },
                      { label: 'Approved & In Transit', value: filtered.filter((t) => t.rawStatus === 'DISPATCHED').length },
                      { label: 'Received', value: filtered.filter((t) => t.rawStatus === 'RECEIVED' || t.rawStatus === 'VERIFIED').length },
                      { label: 'Rejected', value: filtered.filter((t) => t.rawStatus === 'REJECTED').length },
                    ],
                    tableHeaders: ['Date', 'Supplier', 'Product', 'Bags', 'Destination', 'Status'],
                    tableData: filtered.map((t) => [t.date, t.supplier || '—', t.product || '—', t.bags ?? '—', t.destination || '—', t.rawStatus || '—']),
                  });
                }}
              />
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
                  tone="red"
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

          {activeTab === 'orders' && (
            <OrdersQueuePanel orders={ordersQueue} onRefresh={refreshData} />
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

          {/* Inventory tab */}
          {activeTab === 'inventory' && (
            <div className="space-y-5">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Warehouse Inventory</h2>
                <p className="text-sm text-gray-500">Stock levels and batch details for your assigned warehouse(s).</p>
              </div>

              {warehouseCatalog.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-400">
                  No warehouse inventory data available. Contact your supplier if warehouses are not visible.
                </div>
              ) : (
                <div className="space-y-4">
                  {warehouseCatalog.map((wh) => {
                    const usedPct = wh.capacity_bags > 0 ? Math.min(100, Math.round((wh.current_bags / wh.capacity_bags) * 100)) : 0;
                    const alertLevel = usedPct >= 90 ? 'red' : usedPct >= 70 ? 'amber' : 'green';
                    return (
                      <div key={wh.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        {/* Warehouse header */}
                        <div className="flex items-start justify-between gap-4 p-5 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="bg-amber-100 p-2.5 rounded-lg">
                              <Warehouse className="h-5 w-5 text-amber-700" />
                            </div>
                            <div>
                              <h3 className="font-bold text-gray-900">{wh.name}</h3>
                              {wh.section && <p className="text-sm text-gray-500">{wh.section}</p>}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">{wh.current_bags.toLocaleString()} / {wh.capacity_bags.toLocaleString()} bags</p>
                            <p className="text-xs text-gray-500">{wh.available_bags} available to dispatch</p>
                          </div>
                        </div>

                        {/* Capacity bar */}
                        <div className="px-5 py-3 bg-gray-50 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${alertLevel === 'red' ? 'bg-red-500' : alertLevel === 'amber' ? 'bg-amber-500' : 'bg-green-500'}`}
                                style={{ width: `${usedPct}%` }}
                              />
                            </div>
                            <span className={`text-xs font-semibold ${alertLevel === 'red' ? 'text-red-600' : alertLevel === 'amber' ? 'text-amber-600' : 'text-green-600'}`}>
                              {usedPct}% full
                            </span>
                          </div>
                          {alertLevel !== 'green' && (
                            <div className={`flex items-center gap-1.5 mt-1.5 text-xs ${alertLevel === 'red' ? 'text-red-600' : 'text-amber-600'}`}>
                              <AlertCircle className="h-3.5 w-3.5" />
                              {alertLevel === 'red' ? 'Warehouse is near full capacity.' : 'Warehouse is getting full.'}
                            </div>
                          )}
                        </div>

                        {/* Batch list */}
                        {wh.items.length === 0 ? (
                          <p className="px-5 py-4 text-sm text-gray-400">No batches stored in this warehouse.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-gray-100">
                                  {['Batch code', 'Product', 'Total bags', 'Available', 'Certification', 'Expiry'].map((h) => (
                                    <th key={h} className="text-left py-2.5 px-4 text-xs font-semibold text-gray-600">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {wh.items.map((item) => (
                                  <tr key={item.batch_id} className="border-b border-gray-50 hover:bg-gray-50">
                                    <td className="py-2.5 px-4 font-mono text-xs font-medium text-gray-900">{item.batch_code}</td>
                                    <td className="py-2.5 px-4 text-gray-700">{item.fertilizer_type}</td>
                                    <td className="py-2.5 px-4 text-gray-700">{item.total_bags}</td>
                                    <td className="py-2.5 px-4">
                                      <span className={`font-semibold ${item.available_bags === 0 ? 'text-red-500' : 'text-green-600'}`}>
                                        {item.available_bags}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-4">
                                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${item.certification_status === 'Certified' ? 'bg-green-100 text-green-700' : item.certification_status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                        {item.certification_status}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-4 text-gray-600 text-xs">{item.expiry_date || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
              <AnalyticsExportBar
                title="Warehouse Analytics"
                subtitle="Transfer volume, status breakdown, and dispatch performance."
                onExcel={(from, to) => {
                  const filtered = filterByDateRange(transfers, from, to);
                  exportAnalyticsCsv({
                    role: 'Warehouse Manager',
                    orgName: userProfile?.organization || userProfile?.name || '',
                    filename: 'warehouse_analytics',
                    summaryRows: [
                      { label: 'Total Dispatches', value: filtered.length },
                      { label: 'In Transit', value: filtered.filter((t) => t.rawStatus === 'DISPATCHED').length },
                      { label: 'Received / Verified', value: filtered.filter((t) => t.rawStatus === 'RECEIVED' || t.rawStatus === 'VERIFIED').length },
                      { label: 'Rejected', value: filtered.filter((t) => t.rawStatus === 'REJECTED').length },
                      { label: 'Pending Approval', value: pendingTransfers.length },
                    ],
                    tableHeaders: ['Date', 'Supplier', 'Product', 'Bags', 'Destination', 'Status'],
                    tableData: filtered.map((t) => [t.date, t.supplier || '—', t.product || '—', t.bags ?? '—', t.destination || '—', t.rawStatus || '—']),
                  });
                }}
                onPdf={(from, to) => {
                  const filtered = filterByDateRange(transfers, from, to);
                  exportAnalyticsPdf({
                    role: 'Warehouse Manager',
                    orgName: userProfile?.organization || userProfile?.name || '',
                    title: 'Warehouse Analytics Report',
                    subtitle: from || to ? `Period: ${from || '…'} to ${to || 'today'}` : 'Transfer volume, status breakdown & dispatch performance',
                    summaryRows: [
                      { label: 'Total Dispatches', value: filtered.length },
                      { label: 'In Transit', value: filtered.filter((t) => t.rawStatus === 'DISPATCHED').length },
                      { label: 'Received / Verified', value: filtered.filter((t) => t.rawStatus === 'RECEIVED' || t.rawStatus === 'VERIFIED').length },
                      { label: 'Rejected', value: filtered.filter((t) => t.rawStatus === 'REJECTED').length },
                      { label: 'Pending Approval', value: pendingTransfers.length },
                    ],
                    tableHeaders: ['Date', 'Supplier', 'Product', 'Bags', 'Destination', 'Status'],
                    tableData: filtered.map((t) => [t.date, t.supplier || '—', t.product || '—', t.bags ?? '—', t.destination || '—', t.rawStatus || '—']),
                  });
                }}
              />

              {/* Summary cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total Dispatches', value: transfers.length, color: 'text-gray-900', labelColor: 'text-gray-500' },
                  { label: 'In Transit', value: transfers.filter((t) => t.rawStatus === 'DISPATCHED').length, color: 'text-blue-600', labelColor: 'text-blue-500' },
                  { label: 'Received / Verified', value: transfers.filter((t) => t.rawStatus === 'RECEIVED' || t.rawStatus === 'VERIFIED').length, color: 'text-green-600', labelColor: 'text-green-600' },
                  { label: 'Rejected', value: transfers.filter((t) => t.rawStatus === 'REJECTED').length, color: 'text-red-500', labelColor: 'text-red-500' },
                ].map((s) => (
                  <div key={s.label} className="border border-gray-200 rounded-lg p-4">
                    <p className={`text-sm font-medium ${s.labelColor}`}>{s.label}</p>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Dispatch trend */}
                <div className="border border-gray-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Dispatch Volume (last 30 days)</p>
                  {dispatchTrend.length === 0 ? (
                    <p className="text-sm text-gray-400 py-8 text-center">No dispatch data yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={dispatchTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v, n) => [v, n]} labelFormatter={(l) => `Date: ${l}`} />
                        <Legend
                          iconSize={10}
                          formatter={(value) => {
                            const c = value === 'Rejected' ? '#dc2626' : value === 'Received' ? '#16a34a' : '#15803d';
                            return <span style={{ color: c, fontSize: 11 }}>{value}</span>;
                          }}
                        />
                        <Bar dataKey="total" fill="#16a34a" name="Total" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="received" fill="#4ade80" name="Received" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="rejected" fill="#dc2626" name="Rejected" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Status breakdown */}
                <div className="border border-gray-200 rounded-xl p-4">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Status Breakdown</p>
                  {statusBreakdown.length === 0 ? (
                    <p className="text-sm text-gray-400 py-8 text-center">No data yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={statusBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={85}
                          paddingAngle={3}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {statusBreakdown.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v, n) => [v, n]} />
                        <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Recent dispatch table */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Recent Dispatches <span className="text-gray-400 font-normal">(last 20)</span>
                </p>
                {historyTransfers.length === 0 ? (
                  <p className="text-sm text-gray-400">No dispatch history yet.</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-green-700 text-white text-left">
                          {['Date', 'Supplier', 'Product', 'Bags', 'Destination', 'Status'].map((h) => (
                            <th key={h} className="px-4 py-2.5 text-xs font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {historyTransfers.slice(0, 20).map((t) => (
                          <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-4 py-2.5 text-gray-500 text-xs">{t.date || '—'}</td>
                            <td className="px-4 py-2.5 text-gray-800">{t.supplier || '—'}</td>
                            <td className="px-4 py-2.5 text-gray-700">{t.product || '—'}</td>
                            <td className="px-4 py-2.5 font-medium text-gray-900">{t.bags ?? '—'}</td>
                            <td className="px-4 py-2.5 text-gray-700">{t.destination || '—'}</td>
                            <td className={`px-4 py-2.5 text-xs font-medium ${
                              t.rawStatus === 'VERIFIED' ? 'text-emerald-600'
                              : t.rawStatus === 'RECEIVED' ? 'text-teal-600'
                              : t.rawStatus === 'DISPATCHED' ? 'text-blue-600'
                              : t.rawStatus === 'REJECTED' ? 'text-red-500'
                              : t.rawStatus === 'PENDING' ? 'text-amber-600'
                              : 'text-gray-500'
                            }`}>{t.status || t.rawStatus || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
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
