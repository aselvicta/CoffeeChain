import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Package, Send, History, BarChart3, LogOut, TrendingUp, Search, AlertCircle, CheckCircle2, Plus, Eye, Trash2, MessageSquare, RotateCcw } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Logo } from './logo';
import { NotificationBell } from './notification-bell';
import { useNotifications } from '../hooks/use-notifications';
import { WarehouseModal } from './warehouse-modal';
import { StockInModal } from './stock-in-modal';
import { createTransfer, createWarehouse, deleteWarehouse, fetchBatches, fetchBranches, fetchIssues, fetchTransfers, fetchWarehouseCatalog, fetchWarehouses, resolveIssue } from '../api/client';
import { QuickActionCard, PanelPrimaryButton, PanelOutlineButton } from './ui/dashboard-ui';
import { ConfirmDialog } from './ui/confirm-dialog';
import { buildDashboardPath, resolveDashboardTab } from '../utils/dashboard-routing';
import { REGION_LIST, TANZANIA_REGIONS } from '../data/tanzania-locations';
import { buildMonthlyTrend } from '../utils/chart-trends';
import { getUserMessage } from '../utils/user-messages';
import { sortByDateDesc, HISTORY_PAGE_SIZE } from '../utils/list-limits';
import { exportAnalyticsPdf, exportAnalyticsCsv } from '../utils/analytics-export';
import { AnalyticsExportBar, filterByDateRange } from './ui/analytics-export-bar';
import { toast } from 'sonner';
import { usePaginatedList } from '../hooks/use-paginated-list';
import { PaginationBar } from './ui/pagination-bar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

function mapSupplierTransfer(transfer, getDispatchStatusMeta) {
  return {
    id: transfer.id,
    batchId: transfer.batch?.id,
    batchCode: transfer.batch?.batch_code || '—',
    product: transfer.batch?.fertilizer_type || '—',
    bags: transfer.quantity_bags,
    destinationId: transfer.to_branch?.id,
    destination: transfer.to_branch?.name || 'Unknown',
    recipient: transfer.to_branch?.name || transfer.receiver_name || 'Unknown',
    rawStatus: transfer.status,
    status: getDispatchStatusMeta(transfer.status).label,
    statusTone: getDispatchStatusMeta(transfer.status).tone,
    statusDescription: getDispatchStatusMeta(transfer.status).description,
    rejectionMessage: transfer.rejection_message || '',
    rejectedAt: transfer.rejected_at || '',
    warehouseId: transfer.warehouse?.id || transfer.batch?.storage_location?.id,
    warehouse: transfer.warehouse?.name || transfer.batch?.storage_location?.name || '—',
    supplier: transfer.from_supplier?.name || '—',
    date: transfer.created_at?.slice(0, 10),
    createdAt: transfer.created_at || '',
    confirmedAt: transfer.confirmed_at || '',
  };
}

export function SupplierDashboard({ userProfile, onLogout }) {
  const dashboardRole = 'supplier';
  const dashboardTabs = ['overview', 'dispatch', 'dispatched', 'warehouse', 'issues', 'analytics', 'history'];
  function createDispatchLineItem() {
    return {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      batchCode: '',
      bags: '',
    };
  }

  const [activeTab, setActiveTab] = useState('overview');
  const [dispatchForm, setDispatchForm] = useState({
    destinationId: '',
    warehouseId: '',
  });
  const [dispatches, setDispatches] = useState([]);
  const [dispatchedSearch, setDispatchedSearch] = useState('');
  const [dispatchedStatusFilter, setDispatchedStatusFilter] = useState('all');
  const [dispatchedSort, setDispatchedSort] = useState('date');
  const [dispatchedTransfers, setDispatchedTransfers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [branches, setBranches] = useState([]);
  const [warehouseCatalog, setWarehouseCatalog] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [issues, setIssues] = useState([]);
  const [resolutionByIssueId, setResolutionByIssueId] = useState({});
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [showWarehouseForm, setShowWarehouseForm] = useState(false);
  const [warehouseFormError, setWarehouseFormError] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [newWarehouse, setNewWarehouse] = useState({ name: '', section: '', capacity: '', contact_name: '', contact_phone: '+255 ', address: '', region: '', district: '' });
  const [statusMessage, setStatusMessage] = useState('');
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState([]);
  const [dispatchItems, setDispatchItems] = useState([createDispatchLineItem()]);
  const [rejectedDispatchReview, setRejectedDispatchReview] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const {
    notifications: apiNotifications,
    refresh: refreshNotifications,
    markRead: markApiRead,
    markAllRead: markAllApiRead,
    dismiss: dismissApi,
  } = useNotifications();

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

  const getDispatchStatusMeta = (status) => {
    const normalizedStatus = String(status || '').toUpperCase();
    if (normalizedStatus === 'PENDING') {
      return {
        label: 'Pending Approval',
        tone: 'bg-amber-100 text-amber-800',
        description: 'Waiting for warehouse manager approval before dispatch.',
      };
    }
    if (normalizedStatus === 'REJECTED') {
      return {
        label: 'Not Approved',
        tone: 'bg-red-100 text-red-800',
        description: 'Rejected by warehouse manager. See manager reply.',
      };
    }
    if (normalizedStatus === 'RECEIVED') {
      return {
        label: 'Received',
        tone: 'bg-green-100 text-green-700',
        description: 'The receiver has confirmed the package was received.',
      };
    }
    if (normalizedStatus === 'VERIFIED') {
      return {
        label: 'Verified',
        tone: 'bg-emerald-100 text-emerald-700',
        description: 'The transfer has been verified after receipt.',
      };
    }
    return {
      label: 'In Transit',
      tone: 'bg-blue-100 text-blue-700',
      description: 'The dispatch is on the way to the receiver.',
    };
  };

  const normalizeWarehouse = (warehouse) => ({
    ...warehouse,
    capacity: warehouse.capacity_bags ?? warehouse.capacity ?? 0,
    current: warehouse.current_bags ?? warehouse.current ?? 0,
  });

  const formatWarehouseLocation = (location) => {
    if (!location) return '—';
    if (typeof location === 'string') return location;
    const name = location.name || '—';
    const section = location.section ? ` - ${location.section}` : '';
    return `${name}${section}`;
  };

  const refreshData = async () => {
    try {
      const [branchData, batchData, transferData, warehouseData, catalogData, issueData] = await Promise.all([
        fetchBranches(),
        fetchBatches(),
        fetchTransfers(),
        fetchWarehouses(),
        fetchWarehouseCatalog(),
        fetchIssues(),
      ]);
      setBranches(branchData);
      setBatches(batchData);
      setWarehouseCatalog(catalogData);
      setWarehouses(
        warehouseData.map((warehouse) => ({
          id: warehouse.id,
          name: warehouse.name,
          section: warehouse.section,
          capacity: warehouse.capacity_bags,
          current: warehouse.current_bags,
          address: warehouse.address || '',
          region: warehouse.region || '',
          contact_name: warehouse.contact_name || '',
          contact_phone: warehouse.contact_phone || '',
          notes: warehouse.notes || '',
        }))
      );

      const supplierTransfers = transferData.filter(
        (transfer) =>
          transfer.transfer_type === 'SUPPLIER_TO_BRANCH' &&
          transfer.from_supplier?.id === userProfile.supplierRecordId
      );
      setDispatches(supplierTransfers.map((transfer) => mapSupplierTransfer(transfer, getDispatchStatusMeta)));
      setDispatchedTransfers(
        [...supplierTransfers]
          .map((transfer) => mapSupplierTransfer(transfer, getDispatchStatusMeta))
          .sort(
            (left, right) =>
              new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()
          )
      );

      const batchInventory = batchData.map((batch) => {
        const storageLocation = batch.storage_location || null;
        const storageCapacity = Number(storageLocation?.capacity_bags) || 0;
        const dispatched = supplierTransfers
          .filter((transfer) => transfer.batch?.id === batch.id)
          .reduce((sum, transfer) => sum + transfer.quantity_bags, 0);
        const available = Math.max(batch.quantity_bags - dispatched, 0);
        const today = new Date();
        const expiry = batch.expiry_date ? new Date(batch.expiry_date) : null;
        const daysToExpiry = expiry ? Math.ceil((expiry - today) / (1000 * 60 * 60 * 24)) : null;
        let lifecycle = 'In Storage';
        if (expiry && expiry < today) lifecycle = 'Expired';
        else if (available === 0) lifecycle = 'Dispatched';
        else if (dispatched > 0) lifecycle = 'Partially Dispatched';
        const expiryRisk = daysToExpiry !== null && daysToExpiry <= 30 && daysToExpiry >= 0;
        return {
          id: batch.id,
          batchCode: batch.batch_code || `Batch ${batch.id}`,
          name: batch.fertilizer_type,
          fertilizerType: batch.fertilizer_type,
          available,
          availableBags: available,
          unit: 'bags',
          threshold: storageCapacity ? Math.max(1, Math.round(storageCapacity * 0.2)) : 200,
          manufacturer: batch.manufacturer || '—',
          unitWeightKg: batch.unit_weight_kg || '',
          productionDate: batch.production_date || '',
          expiryDate: batch.expiry_date || '',
          dateReceived: batch.date_received?.slice(0, 10) || batch.created_at?.slice(0, 10) || '',
          certificationStatus: batch.certification_status || 'Pending',
          storageLocation: batch.storage_location?.name || '',
          storageLocationId: batch.storage_location?.id || null,
          lifecycle,
          expiryRisk,
        };
      });
      setInventory(batchInventory);
      setIssues(issueData);
      await refreshNotifications();
    } catch (error) {
      setStatusMessage(getUserMessage(error));
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    if (!selectedWarehouse) return;
    const updated = warehouses.find((w) => w.id === selectedWarehouse.id);
    if (updated) setSelectedWarehouse(updated);
  }, [warehouses, selectedWarehouse?.id]);

  const productMix = useMemo(() => {
    const totals = inventory.reduce((acc, item) => {
      acc[item.name] = (acc[item.name] || 0) + item.available;
      return acc;
    }, {});
    const colors = ['#16a34a', '#15803d', '#166534', '#84cc16'];
    return Object.entries(totals).map(([name, value], index) => ({
      name,
      value,
      color: colors[index % colors.length],
    }));
  }, [inventory]);

  const dispatchTrends = useMemo(
    () =>
      buildMonthlyTrend(dispatches, {
        dateKey: 'date',
        countKeys: {
          bags: 'bags',
          deliveries: () => 1,
        },
      }),
    [dispatches]
  );

  const deliveredRate = useMemo(() => {
    if (!dispatches.length) return 0;
    const confirmed = dispatches.filter(
      (dispatch) => dispatch.rawStatus === 'RECEIVED' || dispatch.rawStatus === 'VERIFIED'
    ).length;
    return Math.round((confirmed / dispatches.length) * 100);
  }, [dispatches]);

  const warehouseSummaries = useMemo(() => {
    const summaries = new Map();
    warehouses.forEach((warehouse) => {
      summaries.set(warehouse.id, { batchCount: 0, lowStock: 0, expiryRisk: 0 });
    });
    inventory.forEach((item) => {
      if (!item.storageLocationId) return;
      const summary = summaries.get(item.storageLocationId) || {
        batchCount: 0,
        lowStock: 0,
        expiryRisk: 0,
      };
      summary.batchCount += 1;
      if (item.available <= item.threshold) summary.lowStock += 1;
      if (item.expiryRisk) summary.expiryRisk += 1;
      summaries.set(item.storageLocationId, summary);
    });
    return summaries;
  }, [warehouses, inventory]);

  const selectedWarehouseCatalog = useMemo(
    () =>
      warehouseCatalog.find((warehouse) => String(warehouse.id) === String(dispatchForm.warehouseId)) ||
      null,
    [warehouseCatalog, dispatchForm.warehouseId]
  );

  const dispatchBatchOptions = useMemo(() => {
    return [...(selectedWarehouseCatalog?.items || [])].sort((a, b) => {
      const left = `${a.fertilizer_type} ${a.batch_code}`.toLowerCase();
      const right = `${b.fertilizer_type} ${b.batch_code}`.toLowerCase();
      return left.localeCompare(right);
    });
  }, [selectedWarehouseCatalog]);

  const dispatchCartTotal = useMemo(
    () =>
      dispatchItems.reduce((sum, item) => {
        const quantity = Number(item.bags) || 0;
        return sum + quantity;
      }, 0),
    [dispatchItems]
  );

  const receiverBranches = useMemo(
    () => branches.filter((branch) => ['RETAILER', 'COOPERATIVE'].includes(branch.branch_type)),
    [branches]
  );

  const sortedDispatches = useMemo(
    () => sortByDateDesc(dispatches, 'date'),
    [dispatches]
  );

  const recentDispatches = useMemo(() => sortedDispatches.slice(0, 8), [sortedDispatches]);

  const dispatchHistoryPagination = usePaginatedList(sortedDispatches, HISTORY_PAGE_SIZE);

  const issuesPagination = usePaginatedList(issues, HISTORY_PAGE_SIZE);

  const filteredDispatchedTransfers = useMemo(() => {
    const needle = dispatchedSearch.trim().toLowerCase();
    let items = dispatchedTransfers.filter((dispatch) => {
      if (dispatchedStatusFilter !== 'all' && dispatch.rawStatus !== dispatchedStatusFilter) {
        return false;
      }
      if (!needle) return true;
      return [
        dispatch.batchCode,
        dispatch.product,
        dispatch.recipient,
        dispatch.warehouse,
        dispatch.date,
        dispatch.status,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });

    if (dispatchedSort === 'batch') {
      items = [...items].sort((a, b) => a.batchCode.localeCompare(b.batchCode));
    } else if (dispatchedSort === 'receiver') {
      items = [...items].sort((a, b) => a.recipient.localeCompare(b.recipient));
    } else {
      items = sortByDateDesc(items, 'date');
    }

    return items;
  }, [dispatchedTransfers, dispatchedSearch, dispatchedStatusFilter, dispatchedSort]);

  const dispatchedPagination = usePaginatedList(filteredDispatchedTransfers, HISTORY_PAGE_SIZE);

  const openWarehouseForm = () => {
    setNewWarehouse({ name: '', section: '', capacity: '' });
    setWarehouseFormError('');
    setShowWarehouseForm(true);
  };

  const closeWarehouseForm = () => {
    setShowWarehouseForm(false);
    setWarehouseFormError('');
    setNewWarehouse({ name: '', section: '', capacity: '', contact_name: '', contact_phone: '+255 ', address: '', region: '', district: '' });
  };

  const handleRegisterWarehouse = async (event) => {
    event?.preventDefault?.();
    if (!newWarehouse.name.trim() || !newWarehouse.section.trim() || !newWarehouse.capacity) {
      setWarehouseFormError('Name, section, and capacity are required.');
      return;
    }
    setIsSaving(true);
    setWarehouseFormError('');
    try {
      await createWarehouse({
        name: newWarehouse.name.trim(),
        section: newWarehouse.section.trim(),
        capacity_bags: Number(newWarehouse.capacity),
        current_bags: 0,
        contact_name: newWarehouse.contact_name.trim(),
        contact_phone: newWarehouse.contact_phone.trim(),
        address: newWarehouse.address.trim(),
        region: newWarehouse.region,
        district: newWarehouse.district,
      });
      closeWarehouseForm();
      await refreshData();
    } catch (error) {
      setWarehouseFormError(getUserMessage(error, 'Could not register warehouse. Please try again.'));
    } finally {
      setIsSaving(false);
    }
  };

  const formatShortDate = (value) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value).slice(0, 10) || '—';
    return parsed.toLocaleDateString();
  };

  const openRejectedReview = (dispatch) => {
    setRejectedDispatchReview(dispatch);
  };

  const handleRedispatch = (dispatch) => {
    setDispatchForm({
      warehouseId: dispatch.warehouseId ? String(dispatch.warehouseId) : '',
      destinationId: dispatch.destinationId ? String(dispatch.destinationId) : '',
    });
    setDispatchItems([
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        batchCode: dispatch.batchCode !== '—' ? dispatch.batchCode : '',
        bags: dispatch.bags ? String(dispatch.bags) : '',
      },
    ]);
    setRejectedDispatchReview(null);
    goToTab('dispatch');
    toast.info(
      'Update the dispatch details if needed, then submit again for warehouse approval.',
      { duration: 8000 }
    );
  };

  const tableHeadCell =
    'px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-600 sm:px-3';
  const tableBodyCell = 'px-2 py-2 text-xs text-gray-700 sm:px-3 sm:text-sm';

  const localNotifications = useMemo(() => {
    const inventoryNotifications = inventory
      .filter((item) => item.expiryRisk || item.available <= item.threshold)
      .map((item) => {
        const isExpiryRisk = Boolean(item.expiryRisk);
        const notificationId = `inventory-${item.id}-${isExpiryRisk ? 'expiry' : 'stock'}`;
        return {
          id: notificationId,
          type: isExpiryRisk ? 'expiry' : 'stock',
          title: isExpiryRisk ? `Expiry risk: ${item.name}` : `Low stock: ${item.name}`,
          message: isExpiryRisk
            ? `Batch ${item.id} may expire soon.`
            : `${item.available} bags remain before replenishment is needed.`,
          details: `Location: ${formatWarehouseLocation(item.storageLocation)}`,
          timeLabel: isExpiryRisk ? (item.expiryDate || 'Soon') : 'Stock review needed',
          meta: item.manufacturer || item.certificationStatus,
          priority: isExpiryRisk ? 'high' : 'medium',
          badgeTone: isExpiryRisk ? 'bg-amber-500' : 'bg-sky-600',
          unread: !readNotificationIds.includes(notificationId),
          actionLabel: 'Open warehouse',
        };
      });

    const dispatchNotifications = dispatches.map((dispatch) => {
      const isVerified = dispatch.rawStatus === 'VERIFIED';
      const isReceived = dispatch.rawStatus === 'RECEIVED';
      const notificationId = `dispatch-${dispatch.id}`;
      return {
        id: notificationId,
        type: isVerified ? 'delivery' : 'dispatch',
        title: isVerified ? `Delivery confirmed: ${dispatch.batchCode}` : `Dispatch update: ${dispatch.batchCode}`,
        message: `${dispatch.bags} bags sent to ${dispatch.destination}.`,
        details: `${dispatch.warehouse} • ${dispatch.date || 'Recent update'}`,
        timeLabel: dispatch.date || 'Today',
        meta: dispatch.status,
        priority: isReceived ? 'low' : 'medium',
        badgeTone: isVerified ? 'bg-emerald-600' : 'bg-blue-600',
        unread: !readNotificationIds.includes(notificationId),
        dispatchId: dispatch.id,
        actionLabel: 'Open dispatch details',
      };
    });

    return [...inventoryNotifications, ...dispatchNotifications];
  }, [dispatches, inventory, readNotificationIds]);

  const notifications = useMemo(() => {
    const merged = [...apiNotifications, ...localNotifications].filter(
      (notification) => !dismissedNotificationIds.includes(notification.id)
    );
    return merged.sort((left, right) => {
      const leftScore = left.priority === 'high' ? 2 : left.priority === 'medium' ? 1 : 0;
      const rightScore = right.priority === 'high' ? 2 : right.priority === 'medium' ? 1 : 0;
      if (rightScore !== leftScore) return rightScore - leftScore;
      return String(right.timeLabel || '').localeCompare(String(left.timeLabel || ''));
    });
  }, [apiNotifications, localNotifications, dismissedNotificationIds]);

  const unreadNotificationCount = notifications.filter((notification) => notification.unread).length;

  const handleMarkRead = (notificationId) => {
    if (typeof notificationId === 'string' && notificationId.includes('-')) {
      setReadNotificationIds((currentIds) =>
        currentIds.includes(notificationId) ? currentIds : [...currentIds, notificationId]
      );
      return;
    }
    markApiRead(notificationId);
  };

  const handleMarkAllRead = async () => {
    setReadNotificationIds(localNotifications.map((notification) => notification.id));
    await markAllApiRead();
  };

  const handleDismiss = (notificationId) => {
    if (typeof notificationId === 'string' && notificationId.includes('-')) {
      setDismissedNotificationIds((current) =>
        current.includes(notificationId) ? current : [...current, notificationId]
      );
      return;
    }
    dismissApi(notificationId);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <ConfirmDialog
        open={!!confirmDialog}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel}
        danger={confirmDialog?.danger ?? true}
        onConfirm={confirmDialog?.onConfirm}
        onCancel={() => setConfirmDialog(null)}
      />
      {/* Sidebar */}
      <div className="w-72 bg-gradient-to-b from-green-700 to-green-900 text-white flex flex-col">
        <div className="p-4 border-b border-green-600">
          <div className="w-fit mx-auto bg-white rounded-xl px-4 py-2 shadow-lg">
            <Logo size="md" variant="full" showText={false} />
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'dispatch', label: 'Dispatch Batches', icon: Send },
            { id: 'dispatched', label: 'Dispatched', icon: History },
            { id: 'warehouse', label: 'Warehouse', icon: Package },
            { id: 'issues', label: 'Issues', icon: AlertCircle },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
            { id: 'history', label: 'History', icon: History },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => goToTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === item.id
                  ? 'bg-green-600 text-white'
                  : 'text-green-100 hover:bg-green-600/50'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Supplier Dashboard</h1>
              <p className="text-sm text-gray-600">{userProfile.organization}</p>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell
                notifications={notifications}
                unreadCount={unreadNotificationCount}
                onMarkRead={handleMarkRead}
                onMarkAllRead={handleMarkAllRead}
                onDismiss={handleDismiss}
                onNavigateTab={(tab) => goToTab(tab === 'dispatch' ? 'dispatch' : tab)}
                onOpenInventory={() => goToTab('warehouse')}
                onOpenDispatch={() => goToTab('dispatch')}
              />
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{userProfile.name}</p>
                <p className="text-xs text-gray-500">Supplier ID: {userProfile.supplierId}</p>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </header>

        {/* CONTENTS */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8">
          {activeTab === 'overview' && (
           // Quick actions sections
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Total Dispatched', value: `${dispatches.length} transfers`, change: 'Live from ledger', icon: Send },
                  { label: 'Active Batches', value: `${batches.length}`, change: 'Registered batches', icon: Package },
                  { label: 'Delivery Rate', value: `${dispatches.length ? Math.round((dispatches.filter((d) => d.rawStatus === 'RECEIVED' || d.rawStatus === 'VERIFIED').length / dispatches.length) * 100) : 0}%`, change: 'Confirmed by receiver', icon: TrendingUp },
                ].map((metric, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-green-100 p-3 rounded-lg">
                        <metric.icon className="h-6 w-6 text-green-700" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</h3>
                    <p className="text-sm font-medium text-gray-600 mb-2">{metric.label}</p>
                    <p className="text-xs text-green-600">{metric.change}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <QuickActionCard
                    icon={Send}
                    tone="green"
                    title="Create New Dispatch"
                    description="Send fertilizer to retailers/AMCOS"
                    onClick={() => goToTab('dispatch')}
                  />
                  <QuickActionCard
                    icon={Package}
                    tone="green"
                    title="Manage Warehouses"
                    description="View stock, add batches, and locations"
                    onClick={() => goToTab('warehouse')}
                  />
                </div>
              </div>
            </div>
          )}
          {activeTab === 'dispatch' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Dispatch</h2>
                <p className="text-sm text-gray-600 mb-5">Choose warehouse, receiver, product, and bags.</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">From warehouse</label>
                    <select
                      value={dispatchForm.warehouseId}
                      onChange={(e) => {
                        setDispatchForm({ ...dispatchForm, warehouseId: e.target.value });
                        setDispatchItems([createDispatchLineItem()]);
                      }}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select warehouse</option>
                      {warehouseCatalog.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>
                          {warehouse.name}
                          {warehouse.section ? ` (${warehouse.section})` : ''}
                          {` — ${warehouse.available_bags || 0} bags`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Send to</label>
                    <select
                      value={dispatchForm.destinationId}
                      onChange={(e) =>
                        setDispatchForm({ ...dispatchForm, destinationId: e.target.value })
                      }
                      className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select receiver</option>
                      {receiverBranches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                          {branch.district ? ` — ${branch.district}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  {dispatchItems.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                      <div className="sm:col-span-8">
                        <label className="mb-1 block text-sm font-medium text-gray-700">
                          {index === 0 ? 'Product' : `Product ${index + 1}`}
                        </label>
                        <select
                          value={item.batchCode}
                          onChange={(e) =>
                            setDispatchItems((prev) =>
                              prev.map((currentItem) =>
                                currentItem.id === item.id
                                  ? { ...currentItem, batchCode: e.target.value }
                                  : currentItem
                              )
                            )
                          }
                          disabled={!dispatchForm.warehouseId}
                          className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                        >
                          <option value="">
                            {dispatchForm.warehouseId ? 'Select product' : 'Select warehouse first'}
                          </option>
                          {dispatchBatchOptions.map((option) => (
                            <option key={option.batch_code} value={option.batch_code}>
                              {option.fertilizer_type} — {option.available_bags} bags left
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="sm:col-span-3">
                        <label className="mb-1 block text-sm font-medium text-gray-700">Bags</label>
                        <input
                          type="number"
                          min="1"
                          placeholder="0"
                          value={item.bags}
                          onChange={(e) =>
                            setDispatchItems((prev) =>
                              prev.map((currentItem) =>
                                currentItem.id === item.id
                                  ? { ...currentItem, bags: e.target.value }
                                  : currentItem
                              )
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-green-500"
                        />
                      </div>
                      <div className="sm:col-span-1 flex items-end">
                        {dispatchItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setDispatchItems((prev) =>
                                prev.filter((currentItem) => currentItem.id !== item.id)
                              )
                            }
                            className="w-full rounded-lg border border-gray-200 px-3 py-3 text-sm text-red-600 hover:bg-red-50"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setDispatchItems((prev) => [...prev, createDispatchLineItem()])}
                    disabled={!dispatchForm.warehouseId}
                    className="text-sm font-medium text-green-700 disabled:opacity-50"
                  >
                    + Add another product
                  </button>
                  <p className="text-sm text-gray-600">Total: {dispatchCartTotal} bags</p>
                </div>

                <div className="mt-5">
                  <PanelPrimaryButton
                    icon={Send}
                    disabled={isSaving}
                    onClick={async () => {
                      if (
                        !dispatchForm.destinationId ||
                        !dispatchForm.warehouseId ||
                        dispatchItems.length === 0
                      ) {
                        return;
                      }
                      setIsSaving(true);
                      try {
                        const destinationId = Number(dispatchForm.destinationId);
                        const warehouseId = Number(dispatchForm.warehouseId);
                        if (!destinationId) {
                          throw new Error('Select a receiver.');
                        }
                        const lineItems = dispatchItems
                          .map((item) => {
                            const selected = dispatchBatchOptions.find(
                              (option) => option.batch_code === item.batchCode
                            );
                            const bags = Number(item.bags);
                            if (!selected || !bags || bags < 1) return null;
                            if (bags > selected.available_bags) {
                              throw new Error(
                                `Only ${selected.available_bags} bags available for ${selected.fertilizer_type}.`
                              );
                            }
                            return {
                              batch_id: selected.batch_id,
                              warehouse_id: warehouseId,
                              transfer_type: 'SUPPLIER_TO_BRANCH',
                              from_supplier_id: userProfile.supplierRecordId,
                              to_branch_id: destinationId,
                              quantity_bags: bags,
                            };
                          })
                          .filter(Boolean);

                        if (lineItems.length === 0) {
                          throw new Error('Select a product and enter bag quantity.');
                        }

                        await Promise.all(lineItems.map((payload) => createTransfer(payload)));
                        setDispatchForm({ destinationId: '', warehouseId: '' });
                        setDispatchItems([createDispatchLineItem()]);
                        toast.success(
                          `Submitted ${dispatchCartTotal} bags in ${lineItems.length} transfer(s) for warehouse approval.`,
                          { duration: 8000 }
                        );
                        await refreshData();
                      } catch (error) {
                        toast.error(getUserMessage(error));
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                  >
                    {isSaving ? 'Dispatching...' : 'Dispatch'}
                  </PanelPrimaryButton>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent</h3>
                {recentDispatches.length === 0 ? (
                  <p className="text-sm text-gray-500">No dispatches yet.</p>
                ) : (
                  <div className="space-y-2">
                    {recentDispatches.map((dispatch) => (
                      <div
                        key={dispatch.id}
                        className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 text-sm"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {dispatch.product} · {dispatch.bags} bags
                          </p>
                          <p className="text-gray-600">
                            {dispatch.destination} · {dispatch.date || 'Today'}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${dispatch.statusTone}`}
                        >
                          {dispatch.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'dispatched' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
              <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <h2 className="text-lg font-bold text-gray-900 sm:text-xl">Dispatched</h2>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'PENDING', label: 'Pending' },
                    { id: 'DISPATCHED', label: 'In transit' },
                    { id: 'REJECTED', label: 'Not approved' },
                    { id: 'RECEIVED', label: 'Received' },
                    { id: 'VERIFIED', label: 'Verified' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setDispatchedStatusFilter(option.id)}
                      className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:py-2 sm:text-sm ${
                        dispatchedStatusFilter === option.id
                          ? 'border-green-600 bg-green-50 text-green-800'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {dispatchedTransfers.length === 0 ? (
                <p className="text-sm text-gray-500">No dispatched batches yet.</p>
              ) : (
                <>
                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative min-w-0 flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="search"
                        value={dispatchedSearch}
                        onChange={(event) => setDispatchedSearch(event.target.value)}
                        placeholder="Search batch, receiver, warehouse…"
                        className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <select
                      value={dispatchedSort}
                      onChange={(event) => setDispatchedSort(event.target.value)}
                      className="w-full shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500 sm:w-40"
                    >
                      <option value="date">Sort by date</option>
                      <option value="batch">Sort by batch</option>
                      <option value="receiver">Sort by receiver</option>
                    </select>
                  </div>

                  {filteredDispatchedTransfers.length === 0 ? (
                    <p className="text-sm text-gray-500">No dispatches match your search or filters.</p>
                  ) : (
                    <>
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full min-w-[720px] table-fixed divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className={`${tableHeadCell} w-[18%]`}>Batch</th>
                              <th className={`${tableHeadCell} w-[12%]`}>Shipment</th>
                              <th className={`${tableHeadCell} w-[16%]`}>Receiver</th>
                              <th className={`${tableHeadCell} hidden w-[14%] xl:table-cell`}>Warehouse</th>
                              <th className={`${tableHeadCell} w-[14%]`}>Status</th>
                              <th className={`${tableHeadCell} w-[10%]`}>Date</th>
                              <th className={`${tableHeadCell} w-[16%]`}>Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200 bg-white">
                            {dispatchedPagination.pageItems.map((dispatch) => (
                              <tr key={dispatch.id} className="hover:bg-gray-50">
                                <td
                                  className={`${tableBodyCell} truncate font-medium text-gray-900`}
                                  title={dispatch.batchCode}
                                >
                                  {dispatch.batchCode}
                                </td>
                                <td className={tableBodyCell}>
                                  <span className="block truncate" title={dispatch.product}>
                                    {dispatch.product}
                                  </span>
                                  <span className="text-[11px] text-gray-500 sm:text-xs">
                                    {dispatch.bags} bags
                                  </span>
                                </td>
                                <td
                                  className={`${tableBodyCell} truncate`}
                                  title={dispatch.recipient}
                                >
                                  {dispatch.recipient}
                                </td>
                                <td
                                  className={`${tableBodyCell} hidden truncate xl:table-cell`}
                                  title={dispatch.warehouse}
                                >
                                  {dispatch.warehouse}
                                </td>
                                <td className={tableBodyCell}>
                                  <div className="inline-flex flex-col items-start">
                                    <span
                                      className={`inline-block max-w-full truncate rounded-full px-2 py-0.5 text-[11px] font-medium sm:text-xs ${dispatch.statusTone}`}
                                    >
                                      {dispatch.status}
                                    </span>
                                    <span className="mt-0.5 truncate text-[11px] text-gray-500">
                                      {dispatch.confirmedAt
                                        ? formatShortDate(dispatch.confirmedAt)
                                        : dispatch.rawStatus === 'REJECTED'
                                          ? 'Needs correction'
                                          : 'Awaiting'}
                                    </span>
                                  </div>
                                </td>
                                <td className={`${tableBodyCell} text-gray-500`}>
                                  {dispatch.date || '—'}
                                </td>
                                <td className={tableBodyCell}>
                                  {dispatch.rawStatus === 'REJECTED' ? (
                                    <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap">
                                      <PanelOutlineButton
                                        type="button"
                                        icon={MessageSquare}
                                        onClick={() => openRejectedReview(dispatch)}
                                        className="!px-2 !py-1 text-xs"
                                      >
                                        Feedback
                                      </PanelOutlineButton>
                                      <PanelPrimaryButton
                                        type="button"
                                        icon={RotateCcw}
                                        onClick={() => handleRedispatch(dispatch)}
                                        className="!px-2 !py-1 text-xs"
                                      >
                                        Redispatch
                                      </PanelPrimaryButton>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-gray-400">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <PaginationBar
                        page={dispatchedPagination.page}
                        totalPages={dispatchedPagination.totalPages}
                        total={dispatchedPagination.total}
                        rangeStart={dispatchedPagination.rangeStart}
                        rangeEnd={dispatchedPagination.rangeEnd}
                        onPrev={dispatchedPagination.goPrev}
                        onNext={dispatchedPagination.goNext}
                        canPrev={dispatchedPagination.canPrev}
                        canNext={dispatchedPagination.canNext}
                        className="mt-3"
                      />
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'warehouse' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-bold text-gray-900 sm:text-xl">Warehouse Locations</h2>
                <PanelPrimaryButton icon={Plus} onClick={openWarehouseForm}>
                  Add Warehouse
                </PanelPrimaryButton>
              </div>

              {warehouses.length === 0 ? (
                <p className="text-sm text-gray-500">No warehouses registered yet.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full min-w-[680px] divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className={tableHeadCell}>Name</th>
                        <th className={tableHeadCell}>Section</th>
                        <th className={tableHeadCell}>Capacity</th>
                        <th className={tableHeadCell}>Current</th>
                        <th className={tableHeadCell}>Batches</th>
                        <th className={tableHeadCell}>Alerts</th>
                        <th className={`${tableHeadCell} text-right`}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {warehouses.map((w) => {
                        const summary = warehouseSummaries.get(w.id) || {
                          batchCount: 0,
                          lowStock: 0,
                          expiryRisk: 0,
                        };
                        return (
                        <tr key={w.id} className="hover:bg-gray-50">
                          <td className={`${tableBodyCell} font-medium text-gray-900`}>{w.name}</td>
                          <td className={tableBodyCell}>{w.section || '—'}</td>
                          <td className={tableBodyCell}>{w.capacity} bags</td>
                          <td className={tableBodyCell}>{w.current} bags</td>
                          <td className={tableBodyCell}>{summary.batchCount}</td>
                          <td className={tableBodyCell}>
                            {summary.lowStock === 0 && summary.expiryRisk === 0 ? (
                              <span className="text-gray-500">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {summary.lowStock > 0 && (
                                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
                                    {summary.lowStock} low
                                  </span>
                                )}
                                {summary.expiryRisk > 0 && (
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                                    {summary.expiryRisk} expiry
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className={`${tableBodyCell} text-right`}>
                            <div className="flex items-center justify-end gap-2">
                              <PanelOutlineButton
                                icon={Eye}
                                onClick={() => {
                                  setSelectedWarehouse(w);
                                  setIsWarehouseModalOpen(true);
                                }}
                              >
                                View
                              </PanelOutlineButton>
                              <button
                                type="button"
                                onClick={() => setConfirmDialog({
                                  title: 'Delete Warehouse',
                                  message: `Delete "${w.name}"? This cannot be undone.`,
                                  confirmLabel: 'Yes, Delete',
                                  onConfirm: () => {
                                    setConfirmDialog(null);
                                    deleteWarehouse(w.id)
                                      .then(() => refreshData())
                                      .catch((error) => setStatusMessage(getUserMessage(error)));
                                  },
                                })}
                                className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-3 sm:text-xl">Dispatch History</h2>
              {dispatches.length === 0 ? (
                <p className="text-sm text-gray-500">No dispatches yet.</p>
              ) : (
                <>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full min-w-[520px] table-fixed divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className={`${tableHeadCell} w-[24%]`}>Batch</th>
                          <th className={`${tableHeadCell} w-[16%]`}>Shipment</th>
                          <th className={`${tableHeadCell} w-[24%]`}>Destination</th>
                          <th className={`${tableHeadCell} w-[18%]`}>Status</th>
                          <th className={`${tableHeadCell} w-[12%]`}>Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {dispatchHistoryPagination.pageItems.map((dispatch) => (
                          <tr key={dispatch.id} className="hover:bg-gray-50">
                            <td
                              className={`${tableBodyCell} truncate font-medium text-gray-900`}
                              title={dispatch.batchCode}
                            >
                              {dispatch.batchCode}
                            </td>
                            <td className={tableBodyCell}>
                              <span className="block truncate" title={dispatch.product}>
                                {dispatch.product}
                              </span>
                              <span className="text-[11px] text-gray-500 sm:text-xs">
                                {dispatch.bags} bags
                              </span>
                            </td>
                            <td
                              className={`${tableBodyCell} truncate`}
                              title={dispatch.destination}
                            >
                              {dispatch.destination}
                            </td>
                            <td className={tableBodyCell}>
                              <span
                                className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium sm:text-xs ${dispatch.statusTone}`}
                              >
                                {dispatch.status}
                              </span>
                            </td>
                            <td className={`${tableBodyCell} text-gray-500`}>
                              {dispatch.date || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <PaginationBar
                    page={dispatchHistoryPagination.page}
                    totalPages={dispatchHistoryPagination.totalPages}
                    total={dispatchHistoryPagination.total}
                    rangeStart={dispatchHistoryPagination.rangeStart}
                    rangeEnd={dispatchHistoryPagination.rangeEnd}
                    onPrev={dispatchHistoryPagination.goPrev}
                    onNext={dispatchHistoryPagination.goNext}
                    canPrev={dispatchHistoryPagination.canPrev}
                    canNext={dispatchHistoryPagination.canNext}
                    className="mt-3"
                  />
                </>
              )}
            </div>
          )}

          {activeTab === 'issues' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Issues</h2>
                <p className="text-sm text-gray-600">
                  Review discrepancies and complaints reported by receiving branches.
                </p>
              </div>

              {issues.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-sm text-gray-500">
                  No issues reported yet.
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {issuesPagination.pageItems.map((issue) => {
                    const isResolved = issue.status === 'RESOLVED';
                    const transfer = issue.transfer || {};
                    const batchCode = transfer.batch?.batch_code || `Transfer #${transfer.id || issue.transfer_id}`;
                    const transferDestination = transfer.to_branch?.name || 'Unknown destination';
                    const resolutionNotes = resolutionByIssueId[issue.id] || '';

                    return (
                      <div key={issue.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm text-gray-500">{issue.issue_type === 'COMPLAINT' ? 'Complaint' : 'Discrepancy'}</p>
                            <h3 className="text-base font-semibold text-gray-900">{issue.summary}</h3>
                            <p className="text-sm text-gray-600 mt-1">{issue.description}</p>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${isResolved ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {isResolved ? 'Resolved' : 'Outstanding'}
                          </span>
                        </div>

                        <div className="text-xs text-gray-500 flex flex-wrap gap-3">
                          <span>Batch: {batchCode}</span>
                          <span>Destination: {transferDestination}</span>
                          <span>Reported: {(issue.created_at || '').slice(0, 10) || '—'}</span>
                        </div>

                        {issue.evidence_file_url && (
                          <a
                            href={issue.evidence_file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex text-sm font-medium text-green-700 hover:underline"
                          >
                            View evidence
                          </a>
                        )}

                        {!isResolved ? (
                          <div className="space-y-2">
                            <textarea
                              rows={3}
                              value={resolutionNotes}
                              onChange={(event) =>
                                setResolutionByIssueId((current) => ({
                                  ...current,
                                  [issue.id]: event.target.value,
                                }))
                              }
                              placeholder="Resolution notes (optional)"
                              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-green-500"
                            />
                            <PanelPrimaryButton
                              icon={CheckCircle2}
                              onClick={async () => {
                                setStatusMessage('');
                                try {
                                  await resolveIssue(issue.id, resolutionNotes.trim());
                                  await refreshData();
                                } catch (error) {
                                  setStatusMessage(getUserMessage(error, 'Could not resolve this issue. Please try again.'));
                                }
                              }}
                            >
                              Mark as resolved
                            </PanelPrimaryButton>
                          </div>
                        ) : (
                          issue.resolution_notes && (
                            <p className="text-sm text-gray-600">Resolution: {issue.resolution_notes}</p>
                          )
                        )}
                      </div>
                    );
                  })}
                  </div>
                  <PaginationBar
                    page={issuesPagination.page}
                    totalPages={issuesPagination.totalPages}
                    total={issuesPagination.total}
                    rangeStart={issuesPagination.rangeStart}
                    rangeEnd={issuesPagination.rangeEnd}
                    onPrev={issuesPagination.goPrev}
                    onNext={issuesPagination.goNext}
                    canPrev={issuesPagination.canPrev}
                    canNext={issuesPagination.canNext}
                  />
                </>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
              <AnalyticsExportBar
                title="Supplier Analytics"
                subtitle="Monitor dispatch volume, delivery performance, and low-stock alerts."
                onExcel={(from, to) => {
                  const filtered = filterByDateRange(dispatches, from, to);
                  exportAnalyticsCsv({
                    role: 'Supplier',
                    orgName: userProfile?.organization || userProfile?.name || '',
                    filename: 'supplier_analytics',
                    summaryRows: [
                      { label: 'Total Dispatches', value: filtered.length },
                      { label: 'Delivered', value: filtered.filter((d) => d.rawStatus === 'RECEIVED' || d.rawStatus === 'VERIFIED').length },
                      { label: 'Delivery Rate', value: `${filtered.length ? Math.round((filtered.filter((d) => d.rawStatus === 'RECEIVED' || d.rawStatus === 'VERIFIED').length / filtered.length) * 100) : 0}%` },
                      { label: 'Active Batches', value: batches.length },
                      { label: 'Low Stock Batches', value: inventory.filter((i) => i.available <= i.threshold).length },
                    ],
                    tableHeaders: ['Date', 'Destination', 'Product', 'Bags', 'Warehouse', 'Status'],
                    tableData: filtered.map((d) => [d.date, d.destination || '—', d.product || '—', d.bags ?? '—', d.warehouse || '—', d.status || '—']),
                  });
                }}
                onPdf={(from, to) => {
                  const filtered = filterByDateRange(dispatches, from, to);
                  exportAnalyticsPdf({
                    role: 'Supplier',
                    orgName: userProfile?.organization || userProfile?.name || '',
                    title: 'Supplier Analytics Report',
                    subtitle: from || to ? `Period: ${from || '…'} to ${to || 'today'}` : 'Dispatch volume, delivery performance & stock overview',
                    summaryRows: [
                      { label: 'Total Dispatches', value: filtered.length },
                      { label: 'Delivered', value: filtered.filter((d) => d.rawStatus === 'RECEIVED' || d.rawStatus === 'VERIFIED').length },
                      { label: 'Delivery Rate', value: `${filtered.length ? Math.round((filtered.filter((d) => d.rawStatus === 'RECEIVED' || d.rawStatus === 'VERIFIED').length / filtered.length) * 100) : 0}%` },
                      { label: 'Active Batches', value: batches.length },
                      { label: 'Low Stock Batches', value: inventory.filter((i) => i.available <= i.threshold).length },
                      { label: 'Active Warehouses', value: warehouses.length },
                    ],
                    tableHeaders: ['Date', 'Destination', 'Product', 'Bags', 'Warehouse', 'Status'],
                    tableData: filtered.map((d) => [d.date, d.destination || '—', d.product || '—', d.bags ?? '—', d.warehouse || '—', d.status || '—']),
                  });
                }}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Dispatches (30 days)</p>
                  <p className="text-2xl font-bold text-gray-900">{dispatches.length}</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Low Stock Batches</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {inventory.filter((item) => item.available <= item.threshold).length}
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Delivered Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{deliveredRate}%</p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700">Dispatch Volume (bags)</p>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dispatchTrends}>
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="bags" stroke="#16a34a" strokeWidth={2} name="Bags Dispatched" />
                        <Line type="monotone" dataKey="deliveries" stroke="#15803d" strokeWidth={2} name="Deliveries" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Product Mix</p>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={productMix} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={4}>
                          {productMix.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      {showWarehouseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Register Warehouse</h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  Add a storage location for your fertilizer batches.
                </p>
              </div>
              <button
                type="button"
                onClick={closeWarehouseForm}
                disabled={isSaving}
                className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleRegisterWarehouse} className="space-y-3">
              {/* Core */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Warehouse name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. Main Warehouse"
                    value={newWarehouse.name}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                    disabled={isSaving}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Section <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g. A1"
                    value={newWarehouse.section}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, section: e.target.value })}
                    disabled={isSaving}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Capacity (bags) <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 5000"
                    value={newWarehouse.capacity}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, capacity: e.target.value })}
                    disabled={isSaving}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  />
                </div>
              </div>

              {/* Contact */}
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide pt-1">Contact Information</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Contact name <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="text"
                    placeholder="Manager name"
                    value={newWarehouse.contact_name}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, contact_name: e.target.value })}
                    disabled={isSaving}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Contact phone <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="tel"
                    placeholder="+255 7XX XXX XXX"
                    value={newWarehouse.contact_phone}
                    onChange={(e) => { if (e.target.value.startsWith('+255')) setNewWarehouse({ ...newWarehouse, contact_phone: e.target.value }); }}
                    onFocus={(e) => { if (!newWarehouse.contact_phone) setNewWarehouse({ ...newWarehouse, contact_phone: '+255 ' }); e.target.setSelectionRange(e.target.value.length, e.target.value.length); }}
                    disabled={isSaving}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Region <span className="text-gray-400 font-normal">(optional)</span></label>
                  <select
                    value={newWarehouse.region}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, region: e.target.value, district: '' })}
                    disabled={isSaving}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 bg-white"
                  >
                    <option value="">Select region…</option>
                    {REGION_LIST.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">District <span className="text-gray-400 font-normal">(optional)</span></label>
                  <select
                    value={newWarehouse.district}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, district: e.target.value })}
                    disabled={isSaving || !newWarehouse.region}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 bg-white"
                  >
                    <option value="">{newWarehouse.region ? 'Select district…' : 'Select region first'}</option>
                    {(TANZANIA_REGIONS[newWarehouse.region] || []).map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Address <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input
                    type="text"
                    placeholder="Street / area"
                    value={newWarehouse.address}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, address: e.target.value })}
                    disabled={isSaving}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  />
                </div>
              </div>

              {warehouseFormError && (
                <p className="text-sm text-red-600">{warehouseFormError}</p>
              )}
              <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4">
                <PanelOutlineButton type="button" tone="slate" onClick={closeWarehouseForm} disabled={isSaving}>
                  Cancel
                </PanelOutlineButton>
                <PanelPrimaryButton type="submit" disabled={isSaving}>
                  {isSaving ? 'Registering…' : 'Register Warehouse'}
                </PanelPrimaryButton>
              </div>
            </form>
          </div>
        </div>
      )}
      {isWarehouseModalOpen && (
        <WarehouseModal
          isOpen={isWarehouseModalOpen}
          onClose={() => { setIsWarehouseModalOpen(false); setSelectedWarehouse(null); }}
          warehouse={selectedWarehouse}
          inventory={inventory}
          supplierId={userProfile.supplierRecordId}
          existingBatches={batches}
          onRefresh={refreshData}
        />
      )}

      <Dialog
        open={Boolean(rejectedDispatchReview)}
        onOpenChange={(open) => {
          if (!open) {
            setRejectedDispatchReview(null);
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Dispatch not approved</DialogTitle>
            <DialogDescription>
              Review the warehouse manager feedback, correct the dispatch details, and submit again.
            </DialogDescription>
          </DialogHeader>

          {rejectedDispatchReview ? (
            <div className="space-y-4 text-sm">
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="font-semibold text-gray-900">
                  {rejectedDispatchReview.batchCode} • {rejectedDispatchReview.product}
                </p>
                <p className="mt-1 text-gray-600">
                  {rejectedDispatchReview.bags} bags to {rejectedDispatchReview.recipient}
                </p>
                <p className="text-gray-600">Warehouse: {rejectedDispatchReview.warehouse}</p>
                <p className="text-gray-500">
                  Originally submitted: {formatShortDate(rejectedDispatchReview.date)}
                </p>
              </div>

              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
                  Warehouse manager feedback
                </p>
                <p className="mt-2 text-red-900">{rejectedDispatchReview.rejectionMessage}</p>
                {rejectedDispatchReview.rejectedAt ? (
                  <p className="mt-2 text-xs text-red-700">
                    Received {formatShortDate(rejectedDispatchReview.rejectedAt)}
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          <DialogFooter className="gap-2">
            <PanelOutlineButton type="button" onClick={() => setRejectedDispatchReview(null)}>
              Close
            </PanelOutlineButton>
            {rejectedDispatchReview ? (
              <PanelPrimaryButton
                type="button"
                icon={RotateCcw}
                onClick={() => handleRedispatch(rejectedDispatchReview)}
              >
                Redispatch
              </PanelPrimaryButton>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
