import { useEffect, useMemo, useState } from 'react';
import { Package, Send, History, BarChart3, LogOut, TrendingUp } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Logo } from './logo';
import { NotificationBell } from './notification-bell';
import { useNotifications } from '../hooks/use-notifications';
import { WarehouseModal } from './warehouse-modal';
import { createTransfer, createWarehouse, deleteWarehouse, fetchBatches, fetchBranches, fetchTransfers, fetchWarehouseCatalog, fetchWarehouses } from '../api/client';
import { QuickActionCard, PanelPrimaryButton } from './ui/dashboard-ui';

export function SupplierDashboard({ userProfile, onLogout }) {
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
  const [batches, setBatches] = useState([]);
  const [branches, setBranches] = useState([]);
  const [warehouseCatalog, setWarehouseCatalog] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [newWarehouse, setNewWarehouse] = useState({ name: '', section: '', capacity: '' });
  const [statusMessage, setStatusMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const [dispatchItems, setDispatchItems] = useState([createDispatchLineItem()]);
  const {
    notifications: apiNotifications,
    refresh: refreshNotifications,
    markRead: markApiRead,
    markAllRead: markAllApiRead,
  } = useNotifications();

  const getDispatchStatusMeta = (status) => {
    const normalizedStatus = String(status || '').toUpperCase();
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
      const [branchData, batchData, transferData, warehouseData, catalogData] = await Promise.all([
        fetchBranches(),
        fetchBatches(),
        fetchTransfers(),
        fetchWarehouses(),
        fetchWarehouseCatalog(),
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
        }))
      );

      const supplierTransfers = transferData.filter(
        (transfer) =>
          transfer.transfer_type === 'SUPPLIER_TO_BRANCH' &&
          transfer.from_supplier?.id === userProfile.supplierRecordId
      );
      setDispatches(
        supplierTransfers.map((transfer) => ({
          id: transfer.id,
          batchCode: transfer.batch?.batch_code || '—',
          product: transfer.batch?.fertilizer_type,
          bags: transfer.quantity_bags,
          destination: transfer.to_branch?.name || 'Unknown',
          rawStatus: transfer.status,
          status: getDispatchStatusMeta(transfer.status).label,
          statusTone: getDispatchStatusMeta(transfer.status).tone,
          statusDescription: getDispatchStatusMeta(transfer.status).description,
          warehouse: transfer.warehouse?.name || transfer.batch?.storage_location?.name || '—',
          supplier: transfer.from_supplier?.name || '—',
          date: transfer.created_at?.slice(0, 10),
          createdAt: transfer.created_at || '',
        }))
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
          name: batch.fertilizer_type,
          available,
          unit: 'bags',
          threshold: storageCapacity ? Math.max(1, Math.round(storageCapacity * 0.2)) : 200,
          manufacturer: batch.manufacturer || '—',
          unitWeightKg: batch.unit_weight_kg || '',
          productionDate: batch.production_date || '',
          expiryDate: batch.expiry_date || '',
          certificationStatus: batch.certification_status || 'Pending',
          storageLocation: batch.storage_location?.name || '',
          storageLocationId: batch.storage_location?.id || null,
          lifecycle,
          expiryRisk,
        };
      });
      setInventory(batchInventory);
      await refreshNotifications();
    } catch (error) {
      setStatusMessage(error.message);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

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

  const dispatchTrends = useMemo(() => {
    return [
      { month: 'Jan', bags: dispatches.length * 20, deliveries: dispatches.length },
      { month: 'Feb', bags: dispatches.length * 24, deliveries: dispatches.length + 2 },
      { month: 'Mar', bags: dispatches.length * 26, deliveries: dispatches.length + 3 },
    ];
  }, [dispatches.length]);

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

  const recentDispatches = useMemo(() => dispatches.slice(0, 8), [dispatches]);

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
          actionLabel: 'Open inventory',
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
    const merged = [...apiNotifications, ...localNotifications];
    return merged.sort((left, right) => {
      const leftScore = left.priority === 'high' ? 2 : left.priority === 'medium' ? 1 : 0;
      const rightScore = right.priority === 'high' ? 2 : right.priority === 'medium' ? 1 : 0;
      if (rightScore !== leftScore) return rightScore - leftScore;
      return String(right.timeLabel || '').localeCompare(String(left.timeLabel || ''));
    });
  }, [apiNotifications, localNotifications]);

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

  return (
    <div className="min-h-screen bg-gray-50 flex">
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
            { id: 'warehouse', label: 'Warehouse', icon: Package },
            { id: 'inventory', label: 'Inventory', icon: Package },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
            { id: 'history', label: 'History', icon: History },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
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
      <div className="flex-1 flex flex-col">
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
                onNavigateTab={(tab) => setActiveTab(tab === 'dispatch' ? 'dispatch' : tab)}
                onOpenInventory={() => setActiveTab('inventory')}
                onOpenDispatch={() => setActiveTab('dispatch')}
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
        <main className="flex-1 overflow-y-auto p-8">
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
                    onClick={() => setActiveTab('dispatch')}
                  />
                  <QuickActionCard
                    icon={Package}
                    tone="blue"
                    title="Check Inventory"
                    description="View current stock levels"
                    onClick={() => setActiveTab('inventory')}
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
                      setStatusMessage('');
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
                              status: 'DISPATCHED',
                            };
                          })
                          .filter(Boolean);

                        if (lineItems.length === 0) {
                          throw new Error('Select a product and enter bag quantity.');
                        }

                        await Promise.all(lineItems.map((payload) => createTransfer(payload)));
                        setDispatchForm({ destinationId: '', warehouseId: '' });
                        setDispatchItems([createDispatchLineItem()]);
                        setStatusMessage(
                          `Dispatched ${dispatchCartTotal} bags in ${lineItems.length} transfer(s).`
                        );
                        await refreshData();
                      } catch (error) {
                        setStatusMessage(error.message);
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                  >
                    {isSaving ? 'Dispatching...' : 'Dispatch'}
                  </PanelPrimaryButton>
                </div>
                {statusMessage && (
                  <p
                    className={`mt-3 text-sm ${
                      statusMessage.startsWith('Dispatched') ? 'text-green-700' : 'text-red-600'
                    }`}
                  >
                    {statusMessage}
                  </p>
                )}
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

          {activeTab === 'inventory' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Inventory</h2>
              <div className="space-y-4">
                {inventory.map((item) => (
                  <div key={item.id} className="flex flex-col border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">{item.name} <span className="text-sm text-gray-500">(Batch {item.id})</span></p>
                        <p className="text-sm text-gray-600">{item.available} {item.unit} available • {item.manufacturer}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{item.lifecycle}</p>
                        {item.expiryRisk && <p className="text-xs text-red-600">Expiry risk ({item.expiryDate})</p>}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      <div className="text-sm text-gray-600">
                        <div>Production: {item.productionDate || '—'}</div>
                        <div>Expiry: {item.expiryDate || '—'}</div>
                        <div>Location: {formatWarehouseLocation(item.storageLocation)}</div>
                      </div>
                      <div className="text-sm text-gray-600">
                        <div>Certification: {item.certificationStatus}</div>
                        <div>Threshold: {item.threshold} bags</div>
                      </div>
                      <div className="flex items-center gap-3 justify-end">
                        {item.available <= item.threshold && (
                          <span className="text-xs font-medium text-red-600">Low stock</span>
                        )}
                        <button
                          onClick={() =>
                            setInventory((prev) =>
                              prev.map((stock) =>
                                stock.id === item.id ? { ...stock, available: stock.available + 20 } : stock
                              )
                            )
                          }
                          className="text-green-700 text-sm font-medium"
                        >
                          + Restock
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'warehouse' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Warehouse Locations</h2>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Name"
                    value={newWarehouse.name}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, name: e.target.value })}
                    className="px-3 py-2 border rounded"
                  />
                  <input
                    type="text"
                    placeholder="Section"
                    value={newWarehouse.section}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, section: e.target.value })}
                    className="px-3 py-2 border rounded"
                  />
                  <input
                    type="number"
                    placeholder="Capacity"
                    value={newWarehouse.capacity}
                    onChange={(e) => setNewWarehouse({ ...newWarehouse, capacity: e.target.value })}
                    className="px-3 py-2 border rounded w-28"
                  />
                  <button
                    onClick={async () => {
                      if (!newWarehouse.name || !newWarehouse.section || !newWarehouse.capacity) return;
                      setIsSaving(true);
                      setStatusMessage('');
                      try {
                        await createWarehouse({
                          name: newWarehouse.name,
                          section: newWarehouse.section,
                          capacity_bags: Number(newWarehouse.capacity),
                          current_bags: 0,
                        });
                        setNewWarehouse({ name: '', section: '', capacity: '' });
                        await refreshData();
                      } catch (error) {
                        setStatusMessage(error.message);
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    className="bg-green-600 text-white px-4 py-2 rounded"
                  >{isSaving ? 'Saving...' : 'Add Warehouse'}</button>
                </div>
              </div>
              <div className="space-y-4">
                {warehouses.map((w) => (
                  <div key={w.id} className="border rounded p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{w.name} • {w.section}</p>
                      <p className="text-sm text-gray-600">Capacity: {w.capacity} bags • Current: {w.current} bags</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button onClick={() => { setSelectedWarehouse(w); setIsWarehouseModalOpen(true); }} className="px-4 py-2 bg-blue-600 text-white rounded">View</button>
                      <button onClick={() => {
                        if (!confirm(`Delete warehouse ${w.name}? This cannot be undone.`)) return;
                        deleteWarehouse(w.id)
                          .then(() => refreshData())
                          .catch((error) => setStatusMessage(error.message));
                      }} className="px-4 py-2 border rounded text-red-600">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Dispatch History</h2>
              <div className="space-y-3">
                {dispatches.map((dispatch) => (
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
                    <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${dispatch.statusTone}`}>
                      {dispatch.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
              <h2 className="text-xl font-bold text-gray-900">Supplier Analytics</h2>
              <p className="text-gray-600">Monitor dispatch volume, delivery performance, and low-stock alerts.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Dispatches (30 days)</p>
                  <p className="text-2xl font-bold text-gray-900">{dispatches.length}</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Low Stock Items</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {inventory.filter((item) => item.available <= item.threshold).length}
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Delivered Rate</p>
                  <p className="text-2xl font-bold text-gray-900">94%</p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700">Dispatch Volume (bags)</p>
                    <button className="text-sm font-medium text-green-700">Export Report</button>
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
      {isWarehouseModalOpen && (
        <WarehouseModal
          isOpen={isWarehouseModalOpen}
          onClose={() => { setIsWarehouseModalOpen(false); setSelectedWarehouse(null); }}
          warehouse={selectedWarehouse}
          inventory={inventory}
          supplierId={userProfile.supplierRecordId}
          onRefresh={refreshData}
        />
      )}
    </div>
  );
}
