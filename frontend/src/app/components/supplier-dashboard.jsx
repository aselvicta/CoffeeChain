import { useEffect, useMemo, useState } from 'react';
import { Package, Send, History, BarChart3, LogOut, TrendingUp, Bell, Search, X, Plus, Warehouse } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Logo } from './logo';
import { NotificationPanel } from './notification-panel';
import { RegisterWarehouseModal } from './register-warehouse-modal';
import { StockInModal } from './stock-in-modal';
import { TraceBatchModal } from './trace-batch-modal';
import { WarehouseModal } from './warehouse-modal';
import { createBatch, createTransfer, createWarehouse, deleteWarehouse, fetchBatches, fetchBranches, fetchTransfers, fetchWarehouseCatalog, fetchWarehouses, notifyDispatchReceiver, updateWarehouse } from '../api/client';

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
    batchId: '',
    product: '',
    bags: '',
    destination: '',
    warehouseId: '',
    deliveryAddress: '',
    receiverName: '',
    receiverEmail: '',
    receiverPhone: '',
    receiverOrganisation: '',
  });
  const [dispatches, setDispatches] = useState([]);
  const [batches, setBatches] = useState([]);
  const [branches, setBranches] = useState([]);
  const [warehouseCatalog, setWarehouseCatalog] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isTraceOpen, setIsTraceOpen] = useState(false);
  const [traceBatchId, setTraceBatchId] = useState('');
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState(null);
  const [isRegisterWarehouseOpen, setIsRegisterWarehouseOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null);
  const [isStockInOpen, setIsStockInOpen] = useState(false);
  const [stockInWarehouse, setStockInWarehouse] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [dispatchSearch, setDispatchSearch] = useState('');
  const [selectedDispatch, setSelectedDispatch] = useState(null);
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const [dispatchItems, setDispatchItems] = useState([createDispatchLineItem()]);

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
    address: warehouse.address || '',
    region: warehouse.region || '',
    contactName: warehouse.contact_name || warehouse.contactName || '',
    contactPhone: warehouse.contact_phone || warehouse.contactPhone || '',
    notes: warehouse.notes || '',
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
      const normalizedWarehouses = warehouseData.map((warehouse) => ({
        id: warehouse.id,
        name: warehouse.name,
        section: warehouse.section,
        address: warehouse.address || '',
        region: warehouse.region || '',
        contact_name: warehouse.contact_name || '',
        contact_phone: warehouse.contact_phone || '',
        notes: warehouse.notes || '',
        capacity_bags: warehouse.capacity_bags || 0,
        current_bags: warehouse.current_bags || 0,
        capacity: warehouse.capacity_bags || 0,
        current: warehouse.current_bags || 0,
      }));
      setWarehouses(normalizedWarehouses);

      if (selectedWarehouse) {
        const refreshedWarehouse = normalizedWarehouses.find(
          (warehouse) => String(warehouse.id) === String(selectedWarehouse.id)
        );
        if (refreshedWarehouse) {
          setSelectedWarehouse(refreshedWarehouse);
        }
      }

      if (stockInWarehouse) {
        const refreshedStockWarehouse = normalizedWarehouses.find(
          (warehouse) => String(warehouse.id) === String(stockInWarehouse.id)
        );
        if (refreshedStockWarehouse) {
          setStockInWarehouse(refreshedStockWarehouse);
        }
      }

      if (editingWarehouse) {
        const refreshedEditingWarehouse = normalizedWarehouses.find(
          (warehouse) => String(warehouse.id) === String(editingWarehouse.id)
        );
        if (refreshedEditingWarehouse) {
          setEditingWarehouse(refreshedEditingWarehouse);
        }
      }

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
          receiverName: transfer.receiver_name || '—',
          receiverEmail: transfer.receiver_email || '—',
          receiverPhone: transfer.receiver_phone || '—',
          receiverOrganisation: transfer.receiver_organisation || '—',
          deliveryAddress: transfer.delivery_address || '—',
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
          batchCode: batch.batch_code,
          name: batch.fertilizer_type,
          fertilizerType: batch.fertilizer_type,
          available,
          availableBags: available,
          totalBags: batch.quantity_bags,
          unit: 'bags',
          threshold: storageCapacity ? Math.max(1, Math.round(storageCapacity * 0.2)) : 200,
          manufacturer: batch.manufacturer || '—',
          unitWeightKg: batch.unit_weight_kg || '',
          productionDate: batch.production_date || '',
          dateReceived: batch.date_received || '',
          expiryDate: batch.expiry_date || '',
          certificationStatus: batch.certification_status || 'Pending',
          storageLocation: batch.storage_location?.name || '',
          storageLocationId: batch.storage_location?.id || null,
          lifecycle,
          lifecycleState: batch.lifecycle_state || '',
          expiryRisk,
        };
      });
      setInventory(batchInventory);
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

  const dispatchCartTotal = useMemo(
    () =>
      dispatchItems.reduce((sum, item) => {
        const quantity = Number(item.bags) || 0;
        return sum + quantity;
      }, 0),
    [dispatchItems]
  );

  const filteredDispatches = useMemo(() => {
    const query = dispatchSearch.trim().toLowerCase();
    if (!query) return dispatches;
    return dispatches.filter((dispatch) => String(dispatch.id).toLowerCase().includes(query));
  }, [dispatches, dispatchSearch]);

  const normalizedWarehouses = useMemo(
    () => warehouses.map((warehouse) => normalizeWarehouse(warehouse)),
    [warehouses]
  );

  const warehouseCatalogById = useMemo(
    () =>
      warehouseCatalog.reduce((accumulator, warehouse) => {
        accumulator.set(String(warehouse.id), warehouse);
        return accumulator;
      }, new Map()),
    [warehouseCatalog]
  );

  const warehouseCards = useMemo(
    () =>
      normalizedWarehouses.map((warehouse) => {
        const catalogEntry = warehouseCatalogById.get(String(warehouse.id));
        const capacity = Number(warehouse.capacity_bags ?? warehouse.capacity ?? 0);
        const current = Number(warehouse.current_bags ?? warehouse.current ?? 0);
        const fillPercent = capacity > 0 ? Math.min(Math.round((current / capacity) * 100), 100) : 0;
        const availableSpace = Math.max(capacity - current, 0);
        let capacityTone = 'bg-emerald-500';
        let statusLabel = 'Healthy';

        if (current === 0) {
          capacityTone = 'bg-slate-300';
          statusLabel = 'Empty';
        } else if (fillPercent >= 85) {
          capacityTone = 'bg-rose-500';
          statusLabel = 'Near capacity';
        } else if (fillPercent >= 60) {
          capacityTone = 'bg-amber-500';
          statusLabel = 'Low stock';
        }

        return {
          ...warehouse,
          capacity,
          current,
          fillPercent,
          availableSpace,
          batchCount: catalogEntry?.items?.length || 0,
          capacityTone,
          statusLabel,
        };
      }),
    [normalizedWarehouses, warehouseCatalogById]
  );

  const selectedWarehouseCatalog = useMemo(
    () =>
      selectedWarehouse ? warehouseCatalogById.get(String(selectedWarehouse.id)) || null : null,
    [selectedWarehouse, warehouseCatalogById]
  );

  const warehouseProductOptions = useMemo(() => {
    const items = selectedWarehouseCatalog?.items || [];
    const productMap = new Map();
    items.forEach((item) => {
      const current = productMap.get(item.fertilizer_type) || { name: item.fertilizer_type, available: 0 };
      current.available += Number(item.available_bags) || 0;
      productMap.set(item.fertilizer_type, current);
    });
    return Array.from(productMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedWarehouseCatalog]);

  const dispatchBatchOptions = useMemo(() => {
    return [...(selectedWarehouseCatalog?.items || [])].sort((a, b) => {
      const left = `${a.fertilizer_type} ${a.batch_code}`.toLowerCase();
      const right = `${b.fertilizer_type} ${b.batch_code}`.toLowerCase();
      return left.localeCompare(right);
    });
  }, [selectedWarehouseCatalog]);

  const handleOpenRegisterWarehouse = () => {
    setEditingWarehouse(null);
    setIsRegisterWarehouseOpen(true);
  };

  const handleOpenEditWarehouse = (warehouse) => {
    setEditingWarehouse(warehouse);
    setIsRegisterWarehouseOpen(true);
  };

  const handleSaveWarehouse = async (payload) => {
    if (editingWarehouse) {
      await updateWarehouse(editingWarehouse.id, payload);
    } else {
      await createWarehouse({
        ...payload,
        current_bags: 0,
      });
    }
    await refreshData();
    setStatusMessage(editingWarehouse ? 'Warehouse updated successfully.' : 'Warehouse registered successfully.');
    setIsRegisterWarehouseOpen(false);
    setEditingWarehouse(null);
  };

  const handleCloseWarehouseModal = () => {
    setIsWarehouseModalOpen(false);
    setSelectedWarehouse(null);
  };

  const handleOpenStockIn = (warehouse) => {
    setStockInWarehouse(warehouse);
    setIsStockInOpen(true);
  };

  const handleCloseStockIn = () => {
    setIsStockInOpen(false);
    setStockInWarehouse(null);
  };

  const handleStockInSuccess = async () => {
    await refreshData();
  };

  const notifications = useMemo(() => {
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

    return [...inventoryNotifications, ...dispatchNotifications].sort((left, right) => {
      const leftScore = left.priority === 'high' ? 2 : left.priority === 'medium' ? 1 : 0;
      const rightScore = right.priority === 'high' ? 2 : right.priority === 'medium' ? 1 : 0;
      if (rightScore !== leftScore) return rightScore - leftScore;
      return String(right.timeLabel || '').localeCompare(String(left.timeLabel || ''));
    });
  }, [dispatches, inventory, readNotificationIds]);

  const unreadNotificationCount = notifications.filter((notification) => notification.unread).length;

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
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 rounded-full hover:bg-green-100"
                title="Notifications"
              >
                <Bell className="h-5 w-5 text-gray-700" />
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-xs font-semibold leading-none text-white">
                    {unreadNotificationCount}
                  </span>
                )}
              </button>
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
        {/* CONTENTS */}
        <main className="flex-1 overflow-y-auto p-8">
          <>
            {activeTab === 'overview' && (
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={() => setActiveTab('dispatch')} className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                      <Send className="h-5 w-5 text-green-700" />
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">Create New Dispatch</p>
                        <p className="text-sm text-gray-600">Send fertilizer to retailers/AMCOS</p>
                      </div>
                    </button>
                    <button onClick={() => setActiveTab('inventory')} className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                      <Package className="h-5 w-5 text-blue-700" />
                      <div className="text-left">
                        <p className="font-semibold text-gray-900">Check Inventory</p>
                        <p className="text-sm text-gray-600">View current stock levels</p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'dispatch' && (
              <div className="space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-4">Dispatch Batches</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" placeholder="Batch Code (e.g. BATCH-2026-0001)" value={dispatchForm.batchId} onChange={(e) => setDispatchForm({ ...dispatchForm, batchId: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                    <input type="text" list="destination-options" placeholder="Destination (type to search)" value={dispatchForm.destination} onChange={(e) => setDispatchForm({ ...dispatchForm, destination: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                    <datalist id="destination-options">
                      {branches.filter((branch) => ['RETAILER', 'COOPERATIVE'].includes(branch.branch_type)).map((branch) => (
                        <option key={branch.id} value={`${branch.id} - ${branch.name}`} />
                      ))}
                    </datalist>
                    <div className="md:col-span-2 space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900">Receiver Details</h3>
                        <p className="mt-1 text-xs text-gray-600">If the receiver already has an account in this system (retailer or cooperative), they will receive an in-app notification with full dispatch details and a confirmation button. An email will also be sent to the address you enter.</p>
                      </div>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <input type="text" placeholder="Receiver full name" value={dispatchForm.receiverName} onChange={(e) => setDispatchForm({ ...dispatchForm, receiverName: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-green-500" />
                        <input type="email" placeholder="Receiver email address" value={dispatchForm.receiverEmail} onChange={(e) => setDispatchForm({ ...dispatchForm, receiverEmail: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-green-500" />
                        <input type="tel" placeholder="Receiver phone number" value={dispatchForm.receiverPhone} onChange={(e) => setDispatchForm({ ...dispatchForm, receiverPhone: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-green-500" />
                        <input type="text" placeholder="Organisation / company (optional)" value={dispatchForm.receiverOrganisation} onChange={(e) => setDispatchForm({ ...dispatchForm, receiverOrganisation: e.target.value })} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-green-500" />
                      </div>
                    </div>
                    <input type="text" list="delivery-address-options" placeholder="Delivery Address / Location" value={dispatchForm.deliveryAddress} onChange={(e) => setDispatchForm({ ...dispatchForm, deliveryAddress: e.target.value })} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                    <datalist id="delivery-address-options">
                      {branches.filter((branch) => ['RETAILER', 'COOPERATIVE'].includes(branch.branch_type)).map((branch) => (
                        <option key={`delivery-${branch.id}`} value={`${branch.name}${branch.district ? ` - ${branch.district}` : ''}${branch.region ? `, ${branch.region}` : ''}`} />
                      ))}
                    </datalist>
                    <select value={dispatchForm.warehouseId} onChange={(e) => { const nextWarehouse = warehouseCatalog.find((warehouse) => String(warehouse.id) === e.target.value); setDispatchForm({ ...dispatchForm, warehouseId: e.target.value, product: nextWarehouse?.items?.[0]?.fertilizer_type || '' }); setDispatchItems([createDispatchLineItem()]); }} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent">
                      <option value="">Select warehouse</option>
                      {warehouseCatalog.map((warehouse) => (
                        <option key={warehouse.id} value={warehouse.id}>{warehouse.name}{warehouse.section ? ` - ${warehouse.section}` : ''}{` (${warehouse.available_bags || 0} bags available)`}</option>
                      ))}
                    </select>
                    <div className="md:col-span-2 space-y-3 rounded-xl border border-dashed border-green-200 bg-green-50/50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">Dispatch Items</h3>
                          <p className="text-xs text-gray-600">Select multiple products and bags, then dispatch them together as one batch.</p>
                        </div>
                        <button type="button" onClick={() => setDispatchItems((prev) => [...prev, createDispatchLineItem()])} disabled={!dispatchForm.warehouseId} className="rounded-lg border border-green-200 bg-white px-3 py-2 text-sm font-medium text-green-700 disabled:cursor-not-allowed disabled:opacity-50">+ Add Item</button>
                      </div>
                      {dispatchItems.map((item) => {
                        const selectedItem = dispatchBatchOptions.find((option) => option.batch_code === item.batchCode);
                        return (
                          <div key={item.id} className="grid grid-cols-1 gap-3 md:grid-cols-12">
                            <div className="md:col-span-7">
                              <select value={item.batchCode} onChange={(e) => setDispatchItems((prev) => prev.map((currentItem) => currentItem.id === item.id ? { ...currentItem, batchCode: e.target.value } : currentItem))} disabled={!dispatchForm.warehouseId} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-green-500 disabled:bg-gray-100">
                                <option value="">{dispatchForm.warehouseId ? 'Select product / batch' : 'Select a warehouse first'}</option>
                                {dispatchBatchOptions.map((option) => (
                                  <option key={option.batch_code} value={option.batch_code}>{option.batch_code} - {option.fertilizer_type} ({option.available_bags} bags available)</option>
                                ))}
                              </select>
                              {selectedItem && <p className="mt-1 text-xs text-gray-500">{selectedItem.fertilizer_type} | Manufacturer: {selectedItem.manufacturer || '—'}</p>}
                            </div>
                            <div className="md:col-span-4">
                              <input type="number" min="1" placeholder="Bags" value={item.bags} onChange={(e) => setDispatchItems((prev) => prev.map((currentItem) => currentItem.id === item.id ? { ...currentItem, bags: e.target.value } : currentItem))} className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-transparent focus:ring-2 focus:ring-green-500" />
                            </div>
                            <div className="md:col-span-1 flex items-center justify-end">
                              <button type="button" onClick={() => setDispatchItems((prev) => prev.length === 1 ? prev : prev.filter((currentItem) => currentItem.id !== item.id))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50">Remove</button>
                            </div>
                          </div>
                        );
                      })}
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-green-100 pt-3">
                        <p className="text-sm text-gray-700">{dispatchItems.length} item line{dispatchItems.length === 1 ? '' : 's'} selected • Total bags: {dispatchCartTotal}</p>
                        <button type="button" onClick={() => setTraceBatchId(dispatchItems[0]?.batchCode || dispatchForm.batchId || '')} className="rounded-lg border border-gray-200 px-4 py-2 text-sm">Trace First Item</button>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-3">
                    <button
                      onClick={async () => {
                        if (!dispatchForm.destination || !dispatchForm.warehouseId || dispatchItems.length === 0) return;
                        setIsSaving(true);
                        setStatusMessage('');
                        try {
                          if (!dispatchForm.receiverName || !dispatchForm.receiverEmail) throw new Error('Receiver name and email are required.');
                          const destinationId = Number.parseInt(dispatchForm.destination.split(' - ')[0], 10);
                          if (!destinationId) throw new Error('Select a valid destination from the list.');
                          const warehouseId = Number(dispatchForm.warehouseId);
                          const lineItems = dispatchItems.map((item) => {
                            const selected = dispatchBatchOptions.find((option) => option.batch_code === item.batchCode);
                            const bags = Number(item.bags);
                            if (!selected || !bags || bags < 1) return null;
                            if (bags > selected.available_bags) throw new Error(`Only ${selected.available_bags} bags available for ${selected.batch_code}.`);
                            return { batch_id: selected.batch_id, warehouse_id: warehouseId, transfer_type: 'SUPPLIER_TO_BRANCH', from_supplier_id: userProfile.supplierRecordId, to_branch_id: destinationId, quantity_bags: bags, status: 'DISPATCHED', delivery_address: dispatchForm.deliveryAddress || '', receiver_name: dispatchForm.receiverName, receiver_email: dispatchForm.receiverEmail, receiver_phone: dispatchForm.receiverPhone, receiver_organisation: dispatchForm.receiverOrganisation };
                          }).filter(Boolean);
                          if (lineItems.length === 0) throw new Error('Add at least one product with a valid bag quantity.');
                          const createdTransfers = await Promise.all(lineItems.map((payload) => createTransfer(payload)));
                          const createdTransferIds = createdTransfers.map((transfer) => transfer.id);
                          await notifyDispatchReceiver({ to_branch_id: destinationId, receiver_email: dispatchForm.receiverEmail, receiver_name: dispatchForm.receiverName, transfer_ids: createdTransferIds, supplier_name: userProfile.organization, line_items: lineItems });
                          setDispatchForm({ batchId: '', product: '', bags: '', destination: '', warehouseId: '', deliveryAddress: '', receiverName: '', receiverEmail: '', receiverPhone: '', receiverOrganisation: '' });
                          setDispatchItems([createDispatchLineItem()]);
                          setTraceBatchId('');
                          setSelectedDispatch(null);
                          setStatusMessage(`Dispatch created: ${lineItems.length} transfer(s), ${dispatchCartTotal} bags total. Notification sent to ${dispatchForm.receiverEmail}.`);
                          await refreshData();
                        } catch (error) {
                          setStatusMessage(error.message);
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors"
                    >
                      {isSaving ? 'Saving...' : 'Create Dispatch'}
                    </button>
                    <button onClick={() => { setTraceBatchId(dispatchItems[0]?.batchCode || dispatchForm.batchId || ''); setIsTraceOpen(true); }} className="ml-2 px-4 py-2 rounded-lg border border-gray-200">Trace Batch</button>
                  </div>
                  {statusMessage && <p className="mt-3 text-sm text-red-600">{statusMessage}</p>}
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Dispatches</h3>
                  <div className="mb-4 relative max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={dispatchSearch} onChange={(e) => setDispatchSearch(e.target.value.toUpperCase())} placeholder="Search by dispatch ID" className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg uppercase focus:ring-2 focus:ring-green-500 focus:border-transparent" />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-200 text-sm text-gray-600">
                          <th className="py-3 px-2">Batch</th>
                          <th className="py-3 px-2">Product</th>
                          <th className="py-3 px-2">Bags</th>
                          <th className="py-3 px-2">Destination</th>
                          <th className="py-3 px-2">Receiver</th>
                          <th className="py-3 px-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDispatches.map((dispatch) => (
                          <tr key={dispatch.id} className="border-b border-gray-100 text-sm hover:bg-green-50/60 cursor-pointer" onClick={() => setSelectedDispatch(dispatch)}>
                            <td className="py-3 px-2 font-semibold text-gray-900">{dispatch.id}</td>
                            <td className="py-3 px-2 text-gray-700">{dispatch.product}</td>
                            <td className="py-3 px-2 text-gray-700">{dispatch.bags}</td>
                            <td className="py-3 px-2 text-gray-700">{dispatch.destination}</td>
                            <td className="py-3 px-2 text-gray-700">{dispatch.receiverName}</td>
                            <td className="py-3 px-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${dispatch.statusTone}`}>{dispatch.status}</span>
                            </td>
                          </tr>
                        ))}
                        {filteredDispatches.length === 0 && (
                          <tr><td colSpan="6" className="py-6 text-center text-sm text-gray-500">No dispatches match that ID.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
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
                          {item.available <= item.threshold && <span className="text-xs font-medium text-red-600">Low stock</span>}
                          <button onClick={() => setInventory((prev) => prev.map((stock) => stock.id === item.id ? { ...stock, available: stock.available + 20 } : stock))} className="text-green-700 text-sm font-medium">+ Restock</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'warehouse' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Warehouse Locations</h2>
                    <p className="mt-1 text-sm text-gray-600">Register storage locations, manage capacity, and record stock receipts.</p>
                  </div>
                  <button type="button" onClick={handleOpenRegisterWarehouse} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-emerald-700">
                    <Plus className="h-4 w-4" />
                    Register Warehouse
                  </button>
                </div>
                {statusMessage && (
                  <p className={`mb-4 text-sm ${statusMessage.toLowerCase().includes('success') ? 'text-emerald-600' : 'text-red-600'}`}>{statusMessage}</p>
                )}
                {warehouseCards.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-10 text-center text-sm text-gray-600">No warehouse locations have been registered yet.</div>
                ) : (
                  <div className="grid gap-4 xl:grid-cols-2">
                    {warehouseCards.map((warehouse) => (
                      <div key={warehouse.id} className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 shadow-sm transition hover:shadow-md">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                              <Warehouse className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-lg font-semibold text-slate-900">{warehouse.name}</h3>
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{warehouse.section || 'No section'}</span>
                              </div>
                              <p className="mt-1 text-sm text-slate-600">{warehouse.region ? `${warehouse.region} Region` : 'Region not set'}{warehouse.address ? ` • ${warehouse.address}` : ''}</p>
                              <p className="mt-1 text-sm text-slate-600">Contact: {warehouse.contact_name || warehouse.contactName || '—'} • {warehouse.contact_phone || warehouse.contactPhone || '—'}</p>
                            </div>
                          </div>
                          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${warehouse.statusLabel === 'Empty' ? 'bg-slate-100 text-slate-600' : warehouse.statusLabel === 'Near capacity' ? 'bg-rose-100 text-rose-700' : warehouse.statusLabel === 'Low stock' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{warehouse.statusLabel}</span>
                        </div>
                        <div className="mt-4">
                          <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
                            <span>Capacity</span>
                            <span>{warehouse.current} / {warehouse.capacity} bags</span>
                          </div>
                          <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                            <div className={`h-full rounded-full ${warehouse.capacityTone}`} style={{ width: `${warehouse.fillPercent}%` }} />
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-700">
                          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">In Stock: {warehouse.current} bags</span>
                          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">Batches: {warehouse.batchCount}</span>
                          <span className="rounded-full bg-white px-3 py-1 ring-1 ring-slate-200">{warehouse.availableSpace} bags free</span>
                        </div>
                        <div className="mt-5 flex flex-wrap gap-3">
                          <button type="button" onClick={() => { setSelectedWarehouse(warehouse); setIsWarehouseModalOpen(true); }} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800">View Details</button>
                          <button type="button" onClick={() => handleOpenStockIn(warehouse)} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100">Add Stock</button>
                          <button type="button" onClick={() => handleOpenEditWarehouse(warehouse)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">Edit</button>
                          <button type="button" onClick={() => { if (!confirm(`Delete warehouse ${warehouse.name}? This cannot be undone.`)) return; deleteWarehouse(warehouse.id).then(() => refreshData()).catch((error) => setStatusMessage(error.message)); }} className="rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Dispatch History</h2>
                <div className="space-y-3">
                  {dispatches.map((dispatch) => (
                    <button key={dispatch.id} onClick={() => setSelectedDispatch(dispatch)} className="w-full flex items-center justify-between border border-gray-100 rounded-lg p-4 text-left hover:bg-green-50/60 transition-colors">
                      <div>
                        <p className="font-semibold text-gray-900">{dispatch.id} - {dispatch.product}</p>
                        <p className="text-sm text-gray-600">{dispatch.destination} • {dispatch.bags} bags • {dispatch.date}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${dispatch.statusTone}`}>{dispatch.status}</span>
                    </button>
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
                    <p className="text-2xl font-bold text-gray-900">{inventory.filter((item) => item.available <= item.threshold).length}</p>
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
          </>
        </main>
      </div>

      {selectedDispatch && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">Dispatch Details</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900">{selectedDispatch.batchCode}</h3>
                <p className="mt-1 text-sm text-slate-500">Transfer ID {selectedDispatch.id}</p>
              </div>
              <button type="button" onClick={() => setSelectedDispatch(null)} className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-5 px-6 py-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dispatch Summary</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p><span className="font-medium text-slate-900">Product:</span> {selectedDispatch.product}</p>
                    <p><span className="font-medium text-slate-900">Bags:</span> {selectedDispatch.bags}</p>
                    <p><span className="font-medium text-slate-900">Destination:</span> {selectedDispatch.destination}</p>
                    <p><span className="font-medium text-slate-900">Delivery Address:</span> {selectedDispatch.deliveryAddress}</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Receiver</p>
                  <div className="mt-3 space-y-2 text-sm text-slate-700">
                    <p><span className="font-medium text-slate-900">Name:</span> {selectedDispatch.receiverName}</p>
                    <p><span className="font-medium text-slate-900">Email:</span> {selectedDispatch.receiverEmail}</p>
                    <p><span className="font-medium text-slate-900">Phone:</span> {selectedDispatch.receiverPhone}</p>
                    <p><span className="font-medium text-slate-900">Organisation:</span> {selectedDispatch.receiverOrganisation}</p>
                  </div>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
                <p><span className="font-medium text-slate-900">Status:</span> {selectedDispatch.status}</p>
                <p className="mt-1"><span className="font-medium text-slate-900">Warehouse:</span> {selectedDispatch.warehouse}</p>
                <p className="mt-1"><span className="font-medium text-slate-900">Created:</span> {selectedDispatch.date || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {isNotificationsOpen && (
        <NotificationPanel
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          notifications={notifications}
          unreadCount={unreadNotificationCount}
          onMarkRead={(notificationId) => setReadNotificationIds((currentIds) => currentIds.includes(notificationId) ? currentIds : [...currentIds, notificationId])}
          onMarkAllRead={() => setReadNotificationIds(notifications.map((notification) => notification.id))}
          onOpenInventory={() => { setActiveTab('inventory'); setIsNotificationsOpen(false); }}
          onOpenDispatch={(dispatchId) => { const dispatch = dispatches.find((item) => String(item.id) === String(dispatchId)); if (dispatch) { setSelectedDispatch(dispatch); setActiveTab('history'); } setIsNotificationsOpen(false); }}
        />
      )}
      {isTraceOpen && <TraceBatchModal isOpen={isTraceOpen} onClose={() => setIsTraceOpen(false)} batchId={traceBatchId || ''} />}
      {isRegisterWarehouseOpen && (
        <RegisterWarehouseModal
          isOpen={isRegisterWarehouseOpen}
          warehouse={editingWarehouse}
          onClose={() => { setIsRegisterWarehouseOpen(false); setEditingWarehouse(null); }}
          onSubmit={handleSaveWarehouse}
        />
      )}
      {isStockInOpen && (
        <StockInModal
          isOpen={isStockInOpen}
          warehouse={stockInWarehouse}
          supplierId={userProfile.supplierRecordId}
          existingBatches={stockInWarehouse ? warehouseCatalogById.get(String(stockInWarehouse.id))?.items || [] : []}
          onClose={handleCloseStockIn}
          onSuccess={handleStockInSuccess}
        />
      )}
      {isWarehouseModalOpen && (
        <WarehouseModal
          isOpen={isWarehouseModalOpen}
          onClose={handleCloseWarehouseModal}
          warehouse={selectedWarehouse}
          inventory={inventory}
          onAddStock={handleOpenStockIn}
        />
      )}
    </div>
  );
}