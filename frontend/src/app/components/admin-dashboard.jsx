import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { 
  TrendingUp, Users, Package, ShoppingCart, 
  BarChart3, LogOut, Menu, X, ChevronRight, AlertCircle,
  CheckCircle, Clock, MapPin, Plus
} from 'lucide-react';
import { Logo } from './logo';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { createUser, fetchAuditReport, fetchBatches, fetchBranches, fetchSuppliers, fetchTransfers, fetchUsers } from '../api/client';
import { NotificationBell } from './notification-bell';
import { useNotifications } from '../hooks/use-notifications';
import { REGION_LIST, TANZANIA_REGIONS } from '../data/tanzania-locations';
import { buildDashboardPath, resolveDashboardTab } from '../utils/dashboard-routing';

const ANALYTICS_COLORS = ['#16a34a', '#84cc16', '#0f766e', '#22c55e', '#65a30d', '#15803d'];

function buildMonthlyAnalytics(records) {
  const buckets = new Map();
  const today = new Date();

  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(today.getFullYear(), today.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, {
      month: date.toLocaleString('en-US', { month: 'short' }),
      fertilizer: 0,
      records: 0,
    });
  }

  records.forEach((record) => {
    const createdAt = record?.created_at;
    if (!createdAt) return;

    const createdDate = new Date(createdAt);
    if (Number.isNaN(createdDate.getTime())) return;

    const key = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
    const bucket = buckets.get(key);
    if (!bucket) return;

    bucket.fertilizer += Number(record.quantity_bags) || 0;
    bucket.records += 1;
  });

  return Array.from(buckets.values());
}

function buildFertilizerDistribution(records) {
  const grouped = records.reduce((acc, record) => {
    const name = record?.batch?.fertilizer_type || record?.fertilizer_type || 'Unknown';
    const value = Number(record?.quantity_bags) || 0;
    acc[name] = (acc[name] || 0) + value;
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([, valueA], [, valueB]) => valueB - valueA)
    .map(([name, value], index) => ({
      name,
      value,
      color: ANALYTICS_COLORS[index % ANALYTICS_COLORS.length],
    }));
}

export function AdminDashboard({ userProfile, onLogout }) {
  const dashboardRole = 'admin';
  const dashboardTabs = ['overview', 'suppliers', 'retailers', 'cooperatives', 'users'];
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [supplierQuery, setSupplierQuery] = useState('');
  const [supplierSort, setSupplierSort] = useState('name');
  const [supplierStatusFilter, setSupplierStatusFilter] = useState('all');
  const [retailerQuery, setRetailerQuery] = useState('');
  const [retailerSort, setRetailerSort] = useState('name');
  const [retailerStatusFilter, setRetailerStatusFilter] = useState('all');
  const [cooperativeQuery, setCooperativeQuery] = useState('');
  const [cooperativeSort, setCooperativeSort] = useState('name');
  const [cooperativeStatusFilter, setCooperativeStatusFilter] = useState('all');
  const [suppliers, setSuppliers] = useState([]);
  const [retailers, setRetailers] = useState([]);
  const [cooperatives, setCooperatives] = useState([]);
  const [users, setUsers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [transferData, setTransferData] = useState([]);
  const [showUserForm, setShowUserForm] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSort, setUserSort] = useState('username');
  const [userForm, setUserForm] = useState({
    username: '',
    password: '',
    role: 'supplier',
    first_name: '',
    last_name: '',
    email: '',
    supplier_name: '',
    supplier_region: '',
    contact_phone: '',
    branch_name: '',
    branch_type: 'RETAILER',
    district: '',
    region: '',
  });
  const [userStatus, setUserStatus] = useState('');
  const [audit, setAudit] = useState({ dispatched: 0, received: 0, verified: 0, gap: 0 });
  const [statusMessage, setStatusMessage] = useState('');
  const {
    notifications,
    unreadCount,
    refresh: refreshNotifications,
    markRead,
    markAllRead,
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

  useEffect(() => {
    const loadData = async () => {
      try {
        const [supplierData, branchData, auditData, transferRecords, userData, batchRecords] = await Promise.all([
          fetchSuppliers(),
          fetchBranches(),
          fetchAuditReport(),
          fetchTransfers(),
          fetchUsers(),
          fetchBatches(),
        ]);
        setTransferData(transferRecords);
        setBatches(batchRecords);
        setSuppliers(
          supplierData.map((supplier) => ({
            id: `SUP-${supplier.id.toString().padStart(3, '0')}`,
            name: supplier.name,
            region: supplier.region || 'Region',
            phone: supplier.contact_phone || 'N/A',
            status: 'registered',
            lastDispatch: transferRecords.find((transfer) => transfer.from_supplier?.id === supplier.id)?.created_at?.slice(0, 10) || 'N/A',
          }))
        );
        setRetailers(
          branchData
            .filter((branch) => branch.branch_type === 'RETAILER')
            .map((branch) => ({
              id: `RET-${branch.id.toString().padStart(3, '0')}`,
              name: branch.name,
              district: branch.district || 'District',
              bagsAvailable: transferRecords
                .filter((transfer) => transfer.to_branch?.id === branch.id)
                .reduce((sum, transfer) => sum + transfer.quantity_bags, 0),
              status: 'registered',
            }))
        );
        setCooperatives(
          branchData
            .filter((branch) => branch.branch_type === 'COOPERATIVE')
            .map((branch) => ({
              id: `AMCOS-${branch.id.toString().padStart(3, '0')}`,
              name: branch.name,
              district: branch.district || 'District',
              members: branch.farmers_count || 0,
              verification: 'registered',
            }))
        );
        setAudit(auditData);
        setUsers(userData);
        await refreshNotifications();
      } catch (error) {
        setStatusMessage(error.message);
      }
    };
    loadData();
  }, []);

  const monthlyData = useMemo(() => {
    const analyticsSource = transferData.length > 0 ? transferData : batches;
    return buildMonthlyAnalytics(analyticsSource);
  }, [batches, transferData]);

  const distributionData = useMemo(
    () => {
      const analyticsSource = transferData.length > 0 ? transferData : batches;
      return buildFertilizerDistribution(analyticsSource);
    },
    [batches, transferData]
  );

  const regionData = useMemo(() => {
    const grouped = [...retailers, ...cooperatives].reduce((acc, branch) => {
      const region = branch.district || 'Region';
      acc[region] = acc[region] || { region, cooperatives: 0, retailers: 0, farmers: 0 };
      if (branch.id.startsWith('RET')) acc[region].retailers += 1;
      if (branch.id.startsWith('AMCOS')) acc[region].cooperatives += 1;
      return acc;
    }, {});
    return Object.values(grouped);
  }, [retailers, cooperatives]);

  const recentActivity = useMemo(
    () => [
      { id: 1, type: 'dispatch', entity: 'Ledger Update', action: `${audit.dispatched} transfers dispatched`, time: 'Now', status: 'completed' },
      { id: 2, type: 'verify', entity: 'OTP Verification', action: `${audit.verified} transfers verified`, time: 'Now', status: 'completed' },
      { id: 3, type: 'pending', entity: 'Audit Gap', action: `${audit.gap} pending confirmations`, time: 'Now', status: audit.gap ? 'pending' : 'completed' },
    ],
    [audit]
  );

  useEffect(() => {
    if (!showUserForm) return;
    setUserForm({
      username: '',
      password: '',
      role: 'supplier',
      first_name: '',
      last_name: '',
      email: '',
      supplier_name: '',
      supplier_region: '',
      contact_phone: '',
      branch_name: '',
      branch_type: 'RETAILER',
      district: '',
      region: '',
    });
    setUserStatus('');
  }, [showUserForm]);

  const filteredUsers = useMemo(() => {
    const normalizedQuery = userQuery.trim().toLowerCase();
    const filtered = users.filter((record) => {
      if (userProfile?.username && record.user.username === userProfile.username) {
        return false;
      }
      const name = record.user.username.toLowerCase();
      const role = record.role?.toLowerCase() || '';
      const org = (record.supplier?.name || record.branch?.name || '').toLowerCase();
      const matchesQuery =
        !normalizedQuery ||
        name.includes(normalizedQuery) ||
        role.includes(normalizedQuery) ||
        org.includes(normalizedQuery);
      const matchesRole = userRoleFilter === 'all' || role === userRoleFilter;
      return matchesQuery && matchesRole;
    });

    return filtered.sort((a, b) => {
      if (userSort === 'role') {
        return (a.role || '').localeCompare(b.role || '');
      }
      if (userSort === 'organization') {
        const orgA = a.supplier?.name || a.branch?.name || '';
        const orgB = b.supplier?.name || b.branch?.name || '';
        return orgA.localeCompare(orgB);
      }
      return a.user.username.localeCompare(b.user.username);
    });
  }, [users, userQuery, userRoleFilter, userSort]);

  const districtOptions = useMemo(() => {
    if (!userForm.region) return [];
    return TANZANIA_REGIONS[userForm.region] || [];
  }, [userForm.region]);

  const getRegionOptions = (value) => {
    const query = value.trim().toLowerCase();
    const filtered = REGION_LIST.filter((region) =>
      region.toLowerCase().includes(query)
    );
    return filtered.slice(0, 10);
  };

  const filteredDistrictOptions = useMemo(() => {
    const query = userForm.district.trim().toLowerCase();
    const filtered = districtOptions.filter((district) =>
      district.toLowerCase().includes(query)
    );
    return filtered.slice(0, 10);
  }, [districtOptions, userForm.district]);

  const filteredSuppliers = useMemo(() => {
    const query = supplierQuery.trim().toLowerCase();
    return suppliers
      .filter((supplier) => {
        const matchesQuery =
          !query ||
          supplier.name.toLowerCase().includes(query) ||
          supplier.id.toLowerCase().includes(query) ||
          supplier.region.toLowerCase().includes(query);
        const matchesStatus =
          supplierStatusFilter === 'all' || supplier.status === supplierStatusFilter;
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        if (supplierSort === 'region') return a.region.localeCompare(b.region);
        if (supplierSort === 'status') return a.status.localeCompare(b.status);
        return a.name.localeCompare(b.name);
      });
  }, [suppliers, supplierQuery, supplierSort, supplierStatusFilter]);

  const filteredRetailers = useMemo(() => {
    const query = retailerQuery.trim().toLowerCase();
    return retailers
      .filter((retailer) => {
        const matchesQuery =
          !query ||
          retailer.name.toLowerCase().includes(query) ||
          retailer.id.toLowerCase().includes(query) ||
          retailer.district.toLowerCase().includes(query);
        const matchesStatus =
          retailerStatusFilter === 'all' || retailer.status === retailerStatusFilter;
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        if (retailerSort === 'district') return a.district.localeCompare(b.district);
        if (retailerSort === 'status') return a.status.localeCompare(b.status);
        return a.name.localeCompare(b.name);
      });
  }, [retailers, retailerQuery, retailerSort, retailerStatusFilter]);

  const filteredCooperatives = useMemo(() => {
    const query = cooperativeQuery.trim().toLowerCase();
    return cooperatives
      .filter((coop) => {
        const matchesQuery =
          !query ||
          coop.name.toLowerCase().includes(query) ||
          coop.id.toLowerCase().includes(query) ||
          coop.district.toLowerCase().includes(query);
        const matchesStatus =
          cooperativeStatusFilter === 'all' || coop.verification === cooperativeStatusFilter;
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        if (cooperativeSort === 'district') return a.district.localeCompare(b.district);
        if (cooperativeSort === 'status') return a.verification.localeCompare(b.verification);
        return a.name.localeCompare(b.name);
      });
  }, [cooperatives, cooperativeQuery, cooperativeSort, cooperativeStatusFilter]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-72' : 'w-20'} bg-gradient-to-b from-green-800 to-green-950 text-white transition-all duration-300 flex flex-col fixed left-0 top-0 h-screen z-30`}>
        <div className="p-4 border-b border-green-700">
          {sidebarOpen ? (
            <div className="w-fit mx-auto bg-white rounded-xl px-4 py-2 shadow-lg">
              <Logo size="md" variant="full" showText={false} />
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-fit bg-white rounded-xl p-2 shadow-lg">
                <Logo size="sm" showText={false} />
              </div>
            </div>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'suppliers', label: 'Suppliers', icon: Package },
            { id: 'retailers', label: 'Retailers', icon: ShoppingCart },
            { id: 'cooperatives', label: 'Cooperatives', icon: Users },
            { id: 'users', label: 'User Accounts', icon: Users },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => goToTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === item.id
                  ? 'bg-green-700 text-white'
                  : 'text-green-100 hover:bg-green-700/50'
              }`}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && <span className="font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-green-700">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-3 rounded-lg hover:bg-green-700/50 transition-colors"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div
        className={`flex-1 flex flex-col overflow-hidden ${
          sidebarOpen ? 'ml-72' : 'ml-20'
        }`}
      >
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, {userProfile.name}</p>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkRead={markRead}
                onMarkAllRead={markAllRead}
                onNavigateTab={() => goToTab('overview')}
              />
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{userProfile.name}</p>
                <p className="text-xs text-gray-500">{userProfile.level}</p>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
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
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { 
                    label: 'Total Suppliers', 
                    value: `${suppliers.length}`, 
                    change: 'Registered suppliers', 
                    icon: Package,
                    color: 'bg-blue-500',
                    trend: 'up'
                  },
                  { 
                    label: 'Active Retailers', 
                    value: `${retailers.length}`, 
                    change: 'Registered retailers', 
                    icon: ShoppingCart,
                    color: 'bg-green-500',
                    trend: 'up'
                  },
                  { 
                    label: 'Cooperatives', 
                    value: `${cooperatives.length}`, 
                    change: 'Registered AMCOS', 
                    icon: Users,
                    color: 'bg-purple-500',
                    trend: 'up'
                  },
                  { 
                    label: 'Distributions Verified', 
                    value: `${audit.verified}`, 
                    change: `${audit.gap} pending`, 
                    icon: CheckCircle,
                    color: 'bg-amber-500',
                    trend: 'up'
                  },
                ].map((metric, index) => (
                  <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`${metric.color} p-3 rounded-lg`}>
                        <metric.icon className="h-6 w-6 text-white" />
                      </div>
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</h3>
                    <p className="text-sm font-medium text-gray-600 mb-2">{metric.label}</p>
                    <p className="text-xs text-green-600">{metric.change}</p>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Trends */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Monthly Trends</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#6b7280" />
                      <YAxis stroke="#6b7280" />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="fertilizer" 
                        stroke="#16a34a" 
                        strokeWidth={2}
                        name="Fertilizer bags"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="records" 
                        stroke="#ea580c" 
                        strokeWidth={2}
                        name="Records"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Distribution Breakdown */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Fertilizer Distribution</h3>
                  <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={distributionData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value} bags`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {distributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                          <Tooltip formatter={(value) => [`${value} bags`, 'Quantity']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Regional Overview */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Regional Overview - Tanzania</h3>
                {statusMessage && <p className="mb-3 text-sm text-red-600">{statusMessage}</p>}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Region</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Cooperatives</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Retailers</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Farmers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regionData.map((region, index) => (
                        <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-green-600" />
                              <span className="font-medium text-gray-900">{region.region}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-700">{region.cooperatives}</td>
                          <td className="py-3 px-4 text-gray-700">{region.retailers}</td>
                          <td className="py-3 px-4 text-gray-700">{region.farmers}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                      <div className={`p-2 rounded-lg ${
                        activity.status === 'completed' ? 'bg-green-100' : 'bg-yellow-100'
                      }`}>
                        {activity.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <Clock className="h-5 w-5 text-yellow-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{activity.entity}</p>
                        <p className="text-sm text-gray-600">{activity.action}</p>
                        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'suppliers' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="mb-4 text-center">
                  <h2 className="text-2xl font-bold text-gray-900">Suppliers Management</h2>
                  <p className="text-base text-gray-600">Monitor fertilizer suppliers and their dispatch activity.</p>
                </div>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <input
                    type="text"
                    value={supplierQuery}
                    onChange={(e) => setSupplierQuery(e.target.value)}
                    placeholder="Search suppliers..."
                    className="w-full md:w-72 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <select
                    value={supplierStatusFilter}
                    onChange={(e) => setSupplierStatusFilter(e.target.value)}
                    className="w-full md:w-44 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="registered">Registered</option>
                  </select>
                  <select
                    value={supplierSort}
                    onChange={(e) => setSupplierSort(e.target.value)}
                    className="w-full md:w-44 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="name">Sort by Name</option>
                    <option value="region">Sort by Region</option>
                    <option value="status">Sort by Status</option>
                  </select>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-200 text-sm text-gray-600">
                        <th className="py-3 px-2">Supplier</th>
                        <th className="py-3 px-2">Region</th>
                        <th className="py-3 px-2">Phone</th>
                        <th className="py-3 px-2">Last Dispatch</th>
                        <th className="py-3 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSuppliers.length === 0 && (
                        <tr>
                          <td colSpan="5" className="py-6 text-center text-sm text-gray-500">
                            No suppliers yet. Add a supplier to see them here.
                          </td>
                        </tr>
                      )}
                      {filteredSuppliers.map((supplier) => (
                          <tr key={supplier.id} className="border-b border-gray-100 text-sm">
                            <td className="py-3 px-2">
                              <p className="font-semibold text-gray-900">{supplier.name}</p>
                              <p className="text-xs text-gray-500">{supplier.id}</p>
                            </td>
                            <td className="py-3 px-2 text-gray-700">{supplier.region}</td>
                            <td className="py-3 px-2 text-gray-700">{supplier.phone}</td>
                            <td className="py-3 px-2 text-gray-700">{supplier.lastDispatch}</td>
                            <td className="py-3 px-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                supplier.status === 'registered' ? 'bg-green-100 text-green-700' :
                                'bg-gray-100 text-gray-600'
                              }`}>
                                {supplier.status}
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

          {activeTab === 'retailers' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="mb-4 text-center">
                  <h2 className="text-2xl font-bold text-gray-900">Retailers Management</h2>
                  <p className="text-base text-gray-600">Track retail shops and fertilizer stock levels.</p>
                </div>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <input
                    type="text"
                    value={retailerQuery}
                    onChange={(e) => setRetailerQuery(e.target.value)}
                    placeholder="Search retailers..."
                    className="w-full md:w-72 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <select
                    value={retailerStatusFilter}
                    onChange={(e) => setRetailerStatusFilter(e.target.value)}
                    className="w-full md:w-44 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="registered">Registered</option>
                  </select>
                  <select
                    value={retailerSort}
                    onChange={(e) => setRetailerSort(e.target.value)}
                    className="w-full md:w-44 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="name">Sort by Name</option>
                    <option value="district">Sort by District</option>
                    <option value="status">Sort by Status</option>
                  </select>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-200 text-sm text-gray-600">
                        <th className="py-3 px-2">Retailer</th>
                        <th className="py-3 px-2">District</th>
                        <th className="py-3 px-2">Bags Available</th>
                        <th className="py-3 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRetailers.length === 0 && (
                        <tr>
                          <td colSpan="4" className="py-6 text-center text-sm text-gray-500">
                            No retailers yet. Add a retailer to see them here.
                          </td>
                        </tr>
                      )}
                      {filteredRetailers.map((retailer) => (
                          <tr key={retailer.id} className="border-b border-gray-100 text-sm">
                            <td className="py-3 px-2">
                              <p className="font-semibold text-gray-900">{retailer.name}</p>
                              <p className="text-xs text-gray-500">{retailer.id}</p>
                            </td>
                            <td className="py-3 px-2 text-gray-700">{retailer.district}</td>
                            <td className="py-3 px-2 text-gray-700">{retailer.bagsAvailable}</td>
                            <td className="py-3 px-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                retailer.status === 'registered' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                              }`}>
                                {retailer.status}
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

          {activeTab === 'cooperatives' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="mb-4 text-center">
                  <h2 className="text-2xl font-bold text-gray-900">Cooperatives Management</h2>
                  <p className="text-base text-gray-600">Coordinate AMCOS distribution and verification workflows.</p>
                </div>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <input
                    type="text"
                    value={cooperativeQuery}
                    onChange={(e) => setCooperativeQuery(e.target.value)}
                    placeholder="Search cooperatives..."
                    className="w-full md:w-72 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <select
                    value={cooperativeStatusFilter}
                    onChange={(e) => setCooperativeStatusFilter(e.target.value)}
                    className="w-full md:w-44 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="registered">Registered</option>
                  </select>
                  <select
                    value={cooperativeSort}
                    onChange={(e) => setCooperativeSort(e.target.value)}
                    className="w-full md:w-44 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="name">Sort by Name</option>
                    <option value="district">Sort by District</option>
                    <option value="status">Sort by Status</option>
                  </select>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-200 text-sm text-gray-600">
                        <th className="py-3 px-2">Cooperative</th>
                        <th className="py-3 px-2">District</th>
                        <th className="py-3 px-2">Members</th>
                        <th className="py-3 px-2">Verification</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCooperatives.length === 0 && (
                        <tr>
                          <td colSpan="4" className="py-6 text-center text-sm text-gray-500">
                            No cooperatives yet. Add a cooperative to see them here.
                          </td>
                        </tr>
                      )}
                      {filteredCooperatives.map((coop) => (
                          <tr key={coop.id} className="border-b border-gray-100 text-sm">
                            <td className="py-3 px-2">
                              <p className="font-semibold text-gray-900">{coop.name}</p>
                              <p className="text-xs text-gray-500">{coop.id}</p>
                            </td>
                            <td className="py-3 px-2 text-gray-700">{coop.district}</td>
                            <td className="py-3 px-2 text-gray-700">{coop.members}</td>
                            <td className="py-3 px-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                coop.verification === 'registered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                              }`}>
                                {coop.verification}
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

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button
                  onClick={() => setShowUserForm(true)}
                  className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add User
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="mb-4 text-center">
                  <h3 className="text-2xl font-bold text-gray-900">User Accounts</h3>
                  <p className="text-base text-gray-600">Create and manage platform access by role.</p>
                </div>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={userQuery}
                    onChange={(e) => setUserQuery(e.target.value)}
                    className="w-full md:w-52 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="w-full md:w-44 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="all">All Roles</option>
                    <option value="admin">Admin</option>
                    <option value="supplier">Supplier</option>
                    <option value="retailer">Retailer</option>
                    <option value="cooperative">Cooperative</option>
                    <option value="regulator">Regulator</option>
                  </select>
                  <select
                    value={userSort}
                    onChange={(e) => setUserSort(e.target.value)}
                    className="w-full md:w-44 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="username">Sort by Username</option>
                    <option value="role">Sort by Role</option>
                    <option value="organization">Sort by Organization</option>
                  </select>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-200 text-sm text-gray-600">
                        <th className="py-3 px-2">Username</th>
                        <th className="py-3 px-2">Role</th>
                        <th className="py-3 px-2">Organization</th>
                        <th className="py-3 px-2">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((record) => (
                        <tr key={record.user.id} className="border-b border-gray-100 text-sm">
                          <td className="py-3 px-2 font-semibold text-gray-900">{record.user.username}</td>
                          <td className="py-3 px-2 text-gray-700">{record.role}</td>
                          <td className="py-3 px-2 text-gray-700">
                            {record.supplier?.name || record.branch?.name || 'Admin'}
                          </td>
                          <td className="py-3 px-2 text-gray-700">{record.user.email || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {showUserForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
                  <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-5 md:ml-72">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-gray-900">Add User</h2>
                      <button
                        onClick={() => setShowUserForm(false)}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        Close
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        type="text"
                        placeholder="Username"
                        value={userForm.username}
                        onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        value={userForm.password}
                        onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <select
                        value={userForm.role}
                        onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="admin">Admin</option>
                        <option value="supplier">Supplier</option>
                        <option value="retailer">Retailer</option>
                        <option value="cooperative">Cooperative</option>
                        <option value="regulator">Regulator</option>
                      </select>
                      <input
                        type="text"
                        placeholder="First name"
                        value={userForm.first_name}
                        onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Last name"
                        value={userForm.last_name}
                        onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <input
                        type="email"
                        placeholder="Email"
                        value={userForm.email}
                        onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Supplier/Branch Name"
                        value={userForm.role === 'supplier' ? userForm.supplier_name : userForm.branch_name}
                        onChange={(e) =>
                          setUserForm(
                            userForm.role === 'supplier'
                              ? { ...userForm, supplier_name: e.target.value }
                              : { ...userForm, branch_name: e.target.value }
                          )
                        }
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                      {userForm.role === 'supplier' ? (
                        <>
                          <input
                            type="text"
                            placeholder="Supplier Region"
                            value={userForm.supplier_region}
                            onChange={(e) => setUserForm({ ...userForm, supplier_region: e.target.value })}
                            list="supplier-region-options"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                          <datalist id="supplier-region-options">
                            {getRegionOptions(userForm.supplier_region).map((region) => (
                              <option key={region} value={region} />
                            ))}
                          </datalist>
                          <input
                            type="text"
                            placeholder="Contact Phone"
                            value={userForm.contact_phone}
                            onChange={(e) => setUserForm({ ...userForm, contact_phone: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                        </>
                      ) : (
                        <>
                          <select
                            value={userForm.branch_type}
                            onChange={(e) => setUserForm({ ...userForm, branch_type: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          >
                            <option value="RETAILER">Retailer</option>
                            <option value="COOPERATIVE">Cooperative</option>
                            <option value="REGULATOR">Regulator</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Region"
                            value={userForm.region}
                            onChange={(e) =>
                              setUserForm({ ...userForm, region: e.target.value, district: '' })
                            }
                            list="region-options"
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          />
                          <datalist id="region-options">
                            {getRegionOptions(userForm.region).map((region) => (
                              <option key={region} value={region} />
                            ))}
                          </datalist>
                          <input
                            type="text"
                            placeholder={userForm.region ? 'District' : 'Select Region First'}
                            value={userForm.district}
                            onChange={(e) => setUserForm({ ...userForm, district: e.target.value })}
                            list="district-options"
                            disabled={!userForm.region}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                          />
                          <datalist id="district-options">
                            {filteredDistrictOptions.map((district) => (
                              <option key={district} value={district} />
                            ))}
                          </datalist>
                        </>
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      {userStatus && <p className="text-sm text-red-600">{userStatus}</p>}
                      <button
                        onClick={async () => {
                          if (!userForm.username || !userForm.password) return;
                          setUserStatus('');
                          try {
                            const newUser = await createUser(userForm);
                            setUsers((prev) => [...prev, newUser]);
                            setShowUserForm(false);
                          } catch (error) {
                            setUserStatus(error.message);
                          }
                        }}
                        className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors"
                      >
                        Create User
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
