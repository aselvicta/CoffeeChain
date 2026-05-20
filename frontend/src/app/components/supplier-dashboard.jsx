import { useEffect, useMemo, useState } from 'react';
import { Package, Send, History, BarChart3, LogOut, TrendingUp } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Logo } from './logo';
import { createBatch, createTransfer, fetchBatches, fetchBranches, fetchTransfers } from '../api/client';

export function SupplierDashboard({ userProfile, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [dispatchForm, setDispatchForm] = useState({
    batchId: '',
    product: 'NPK 20-10-10',
    bags: '',
    destination: '',
  });
  const [dispatches, setDispatches] = useState([]);
  const [batches, setBatches] = useState([]);
  const [branches, setBranches] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const refreshData = async () => {
    try {
      const [branchData, batchData, transferData] = await Promise.all([
        fetchBranches(),
        fetchBatches(),
        fetchTransfers(),
      ]);
      setBranches(branchData);
      setBatches(batchData);

      const supplierTransfers = transferData.filter(
        (transfer) =>
          transfer.transfer_type === 'SUPPLIER_TO_BRANCH' &&
          transfer.from_supplier?.id === userProfile.supplierRecordId
      );
      setDispatches(
        supplierTransfers.map((transfer) => ({
          id: transfer.id,
          product: transfer.batch?.fertilizer_type,
          bags: transfer.quantity_bags,
          destination: transfer.to_branch?.name || 'Unknown',
          status: transfer.status.toLowerCase(),
          date: transfer.created_at?.slice(0, 10),
        }))
      );

      const batchInventory = batchData.map((batch) => {
        const dispatched = supplierTransfers
          .filter((transfer) => transfer.batch?.id === batch.id)
          .reduce((sum, transfer) => sum + transfer.quantity_bags, 0);
        return {
          id: batch.id,
          name: batch.fertilizer_type,
          available: Math.max(batch.quantity_bags - dispatched, 0),
          unit: 'bags',
          threshold: 200,
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

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { label: 'Total Dispatched', value: `${dispatches.length} transfers`, change: 'Live from ledger', icon: Send },
                  { label: 'Active Batches', value: `${batches.length}`, change: 'Registered batches', icon: Package },
                  { label: 'Delivery Rate', value: `${dispatches.length ? Math.round((dispatches.filter((d) => d.status === 'verified').length / dispatches.length) * 100) : 0}%`, change: 'OTP verified', icon: TrendingUp },
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
                  <button className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                    <Send className="h-5 w-5 text-green-700" />
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">Create New Dispatch</p>
                      <p className="text-sm text-gray-600">Send fertilizer to retailers/AMCOS</p>
                    </div>
                  </button>
                  <button className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
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
                  <input
                    type="text"
                    placeholder="Batch Code (e.g. BATCH-2026-0001)"
                    value={dispatchForm.batchId}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, batchId: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    list="destination-options"
                    placeholder="Destination (type to search)"
                    value={dispatchForm.destination}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, destination: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <datalist id="destination-options">
                    {branches
                      .filter((branch) => ['RETAILER', 'COOPERATIVE'].includes(branch.branch_type))
                      .map((branch) => (
                        <option key={branch.id} value={`${branch.id} - ${branch.name}`} />
                      ))}
                  </datalist>
                  <select
                    value={dispatchForm.product}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, product: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option>NPK 20-10-10</option>
                    <option>Urea (46% N)</option>
                    <option>DAP</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Bags"
                    value={dispatchForm.bags}
                    onChange={(e) => setDispatchForm({ ...dispatchForm, bags: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!dispatchForm.batchId || !dispatchForm.bags || !dispatchForm.destination) return;
                    setIsSaving(true);
                    setStatusMessage('');
                    try {
                      const destinationId = Number.parseInt(
                        dispatchForm.destination.split(' - ')[0],
                        10
                      );
                      if (!destinationId) {
                        throw new Error('Select a valid destination from the list.');
                      }
                      const existingBatch = batches.find(
                        (batch) => batch.batch_code === dispatchForm.batchId
                      );
                      const batch = existingBatch
                        ? existingBatch
                        : await createBatch({
                            batch_code: dispatchForm.batchId,
                            fertilizer_type: dispatchForm.product,
                            quantity_bags: Number(dispatchForm.bags),
                            supplier_id: userProfile.supplierRecordId,
                          });
                      await createTransfer({
                        batch_id: batch.id,
                        transfer_type: 'SUPPLIER_TO_BRANCH',
                        from_supplier_id: userProfile.supplierRecordId,
                        to_branch_id: destinationId,
                        quantity_bags: Number(dispatchForm.bags),
                        status: 'DISPATCHED',
                      });
                      setDispatchForm({ batchId: '', product: 'NPK 20-10-10', bags: '', destination: '' });
                      await refreshData();
                    } catch (error) {
                      setStatusMessage(error.message);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="mt-4 bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  {isSaving ? 'Saving...' : 'Create Dispatch'}
                </button>
                {statusMessage && (
                  <p className="mt-3 text-sm text-red-600">{statusMessage}</p>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Dispatches</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-200 text-sm text-gray-600">
                        <th className="py-3 px-2">Batch</th>
                        <th className="py-3 px-2">Product</th>
                        <th className="py-3 px-2">Bags</th>
                        <th className="py-3 px-2">Destination</th>
                        <th className="py-3 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dispatches.map((dispatch) => (
                        <tr key={dispatch.id} className="border-b border-gray-100 text-sm">
                          <td className="py-3 px-2 font-semibold text-gray-900">{dispatch.id}</td>
                          <td className="py-3 px-2 text-gray-700">{dispatch.product}</td>
                          <td className="py-3 px-2 text-gray-700">{dispatch.bags}</td>
                          <td className="py-3 px-2 text-gray-700">{dispatch.destination}</td>
                          <td className="py-3 px-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              dispatch.status === 'delivered' ? 'bg-green-100 text-green-700' :
                              dispatch.status === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {dispatch.status}
                            </span>
                          </td>
                        </tr>
                      ))}
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
                  <div key={item.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-4">
                    <div>
                      <p className="font-semibold text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">{item.available} {item.unit} available</p>
                    </div>
                    <div className="flex items-center gap-3">
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
                ))}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Dispatch History</h2>
              <div className="space-y-3">
                {dispatches.map((dispatch) => (
                  <div key={dispatch.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-4">
                    <div>
                      <p className="font-semibold text-gray-900">{dispatch.id} - {dispatch.product}</p>
                      <p className="text-sm text-gray-600">{dispatch.destination} • {dispatch.bags} bags • {dispatch.date}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      dispatch.status === 'delivered' ? 'bg-green-100 text-green-700' :
                      dispatch.status === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
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
    </div>
  );
}
