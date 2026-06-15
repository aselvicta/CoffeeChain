import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { 
  TrendingUp, Users, Package, ShoppingCart, 
  BarChart3, LogOut, ChevronRight, AlertCircle,
  CheckCircle, Clock, Plus, Pencil, Shield
} from 'lucide-react';
import { Logo } from './logo';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { createUser, fetchAuditReport, fetchBatches, fetchBranches, fetchSuppliers, fetchTransfers, fetchUser, fetchUsers, updateUser } from '../api/client';
import { NotificationBell } from './notification-bell';
import { useNotifications } from '../hooks/use-notifications';
import { REGION_LIST, TANZANIA_REGIONS } from '../data/tanzania-locations';
import { buildDashboardPath, resolveDashboardTab } from '../utils/dashboard-routing';
import { getUserMessage } from '../utils/user-messages';
import { HISTORY_PAGE_SIZE } from '../utils/list-limits';
import { usePaginatedList } from '../hooks/use-paginated-list';
import { PaginationBar } from './ui/pagination-bar';
import { IntegrityPanel } from './integrity-panel';

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

function shortenChartLabel(name, maxLength = 18) {
  if (!name) return 'Unknown';
  return name.length > maxLength ? `${name.slice(0, maxLength - 1)}…` : name;
}

function buildTopBranchPerformance(transfers, branchType, limit = 5) {
  const scores = new Map();

  transfers.forEach((transfer) => {
    if (transfer.transfer_type !== 'BRANCH_TO_FARMER') return;
    const branch = transfer.from_branch;
    if (!branch || branch.branch_type !== branchType) return;

    const branchId = branch.id;
    const current = scores.get(branchId) || {
      name: branch.name || 'Unknown',
      bags: 0,
      verified: 0,
      distributions: 0,
    };
    const quantity = Number(transfer.quantity_bags) || 0;
    current.bags += quantity;
    current.distributions += 1;
    if (transfer.status === 'VERIFIED') current.verified += quantity;
    scores.set(branchId, current);
  });

  return Array.from(scores.values())
    .sort((a, b) => b.bags - a.bags || b.verified - a.verified)
    .slice(0, limit)
    .map((entry) => ({
      ...entry,
      label: shortenChartLabel(entry.name),
    }));
}

const EMPTY_USER_FORM = {
  username: '',
  password: '',
  role: 'supplier',
  first_name: '',
  last_name: '',
  email: '',
  supplier_name: '',
  supplier_region: '',
  supplier_id: '',
  contact_phone: '',
  branch_name: '',
  branch_type: 'RETAILER',
  district: '',
  region: '',
};

const ROLE_BRANCH_TYPE = {
  retailer: 'RETAILER',
  cooperative: 'COOPERATIVE',
  regulator: 'REGULATOR',
};

function resolveRegionName(region, district) {
  if (region?.trim()) return region.trim();
  if (!district?.trim()) return 'Unassigned';
  const normalizedDistrict = district.trim().toLowerCase();
  for (const [regionName, districts] of Object.entries(TANZANIA_REGIONS)) {
    if (
      districts.some((entry) => {
        const normalizedEntry = entry.toLowerCase();
        return (
          normalizedEntry === normalizedDistrict ||
          normalizedEntry.startsWith(`${normalizedDistrict} `) ||
          normalizedDistrict.startsWith(`${normalizedEntry.split(' ')[0]} `) ||
          normalizedEntry.split(' ')[0] === normalizedDistrict
        );
      })
    ) {
      return regionName;
    }
  }
  return 'Unassigned';
}

function userFormFromRecord(record) {
  const user = record?.user || {};
  const role = record?.role || 'supplier';
  const supplier = record?.supplier || null;
  const branch = record?.branch || null;
  const warehouseManager = record?.warehouse_manager || null;

  return {
    username: user.username || '',
    password: '',
    role,
    first_name: user.first_name || '',
    last_name: user.last_name || '',
    email: user.email || '',
    supplier_name: supplier?.name || '',
    supplier_region: supplier?.region || '',
    supplier_id: warehouseManager?.supplier?.id ? String(warehouseManager.supplier.id) : '',
    contact_phone: supplier?.contact_phone || '',
    branch_name: branch?.name || '',
    branch_type: branch?.branch_type || ROLE_BRANCH_TYPE[role] || 'RETAILER',
    district: branch?.district || '',
    region: branch?.region || supplier?.region || '',
  };
}

export function AdminDashboard({ userProfile, onLogout }) {
  const dashboardRole = 'admin';
  const dashboardTabs = ['overview', 'suppliers', 'retailers', 'cooperatives', 'users', 'integrity'];
  const [activeTab, setActiveTab] = useState('overview');
  const [integrityHighlightId, setIntegrityHighlightId] = useState('');
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
  const [editingUserId, setEditingUserId] = useState(null);
  const [userFormLoading, setUserFormLoading] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userSort, setUserSort] = useState('username');
  const [userForm, setUserForm] = useState({ ...EMPTY_USER_FORM });
  const [userStatus, setUserStatus] = useState('');
  const [audit, setAudit] = useState({ dispatched: 0, received: 0, verified: 0, gap: 0 });
  const [statusMessage, setStatusMessage] = useState('');
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

  const openCreateUserForm = () => {
    setEditingUserId(null);
    setUserFormLoading(false);
    setUserForm({ ...EMPTY_USER_FORM });
    setUserStatus('');
    setShowUserForm(true);
  };

  const openEditUserForm = async (record) => {
    const userId = record?.user?.id;
    if (!userId) return;

    const listRecord = users.find((entry) => String(entry.user.id) === String(userId)) || record;
    setEditingUserId(userId);
    setUserForm(userFormFromRecord(listRecord));
    setUserStatus('');
    setUserFormLoading(true);
    setShowUserForm(true);

    try {
      const freshRecord = await fetchUser(userId);
      setUserForm(userFormFromRecord(freshRecord));
    } catch (error) {
      setUserStatus(getUserMessage(error));
    } finally {
      setUserFormLoading(false);
    }
  };

  const closeUserForm = () => {
    setShowUserForm(false);
    setEditingUserId(null);
    setUserFormLoading(false);
    setUserForm({ ...EMPTY_USER_FORM });
    setUserStatus('');
  };

  const handleSaveUser = async () => {
    if (editingUserId) {
      setUserStatus('');
      try {
        const payload = { ...userForm };
        delete payload.username;
        delete payload.role;
        if (!payload.password) delete payload.password;
        const updated = await updateUser(editingUserId, payload);
        setUsers((prev) => prev.map((record) => (record.user.id === editingUserId ? updated : record)));
        closeUserForm();
      } catch (error) {
        setUserStatus(getUserMessage(error));
      }
      return;
    }

    if (!userForm.username || !userForm.password) return;
    setUserStatus('');
    try {
      const payload = { ...userForm };
      if (payload.supplier_id) {
        payload.supplier_id = Number(payload.supplier_id);
      }
      const newUser = await createUser(payload);
      setUsers((prev) => [...prev, newUser]);
      closeUserForm();
    } catch (error) {
      setUserStatus(getUserMessage(error));
    }
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
            recordId: supplier.id,
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
              region: branch.region || '',
              district: branch.district || '',
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
              region: branch.region || '',
              district: branch.district || '',
              members: branch.farmers_count || 0,
              verification: 'registered',
            }))
        );
        setAudit(auditData);
        setUsers(userData);
        await refreshNotifications();
      } catch (error) {
        setStatusMessage(getUserMessage(error));
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

  const topRetailerData = useMemo(
    () => buildTopBranchPerformance(transferData, 'RETAILER'),
    [transferData]
  );

  const topAmcosData = useMemo(
    () => buildTopBranchPerformance(transferData, 'COOPERATIVE'),
    [transferData]
  );

  const regionData = useMemo(() => {
    const grouped = [...retailers, ...cooperatives].reduce((acc, branch) => {
      const district = branch.district?.trim() || 'Unassigned';
      const region = resolveRegionName(branch.region, district);
      const key = `${region}::${district}`;
      acc[key] = acc[key] || { region, district, cooperatives: 0, retailers: 0, farmers: 0 };
      if (branch.id.startsWith('RET')) acc[key].retailers += 1;
      if (branch.id.startsWith('AMCOS')) {
        acc[key].cooperatives += 1;
        acc[key].farmers += branch.members || 0;
      }
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => {
      const regionCompare = a.region.localeCompare(b.region);
      if (regionCompare !== 0) return regionCompare;
      return a.district.localeCompare(b.district);
    });
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
      const org = (
        record.supplier?.name ||
        record.warehouse_manager?.supplier?.name ||
        record.branch?.name ||
        ''
      ).toLowerCase();
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
        const orgA = a.supplier?.name || a.warehouse_manager?.supplier?.name || a.branch?.name || '';
        const orgB = b.supplier?.name || b.warehouse_manager?.supplier?.name || b.branch?.name || '';
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

  const supplierPagination = usePaginatedList(filteredSuppliers, HISTORY_PAGE_SIZE);
  const retailerPagination = usePaginatedList(filteredRetailers, HISTORY_PAGE_SIZE);
  const cooperativePagination = usePaginatedList(filteredCooperatives, HISTORY_PAGE_SIZE);
  const userPagination = usePaginatedList(filteredUsers, HISTORY_PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-72 bg-gradient-to-b from-green-800 to-green-950 text-white flex flex-col fixed left-0 top-0 h-screen z-30">
        <div className="p-4 border-b border-green-700">
          <div className="w-fit mx-auto bg-white rounded-xl px-4 py-2 shadow-lg">
            <Logo size="md" variant="full" showText={false} />
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'suppliers', label: 'Suppliers', icon: Package },
            { id: 'retailers', label: 'Retailers', icon: ShoppingCart },
            { id: 'cooperatives', label: 'Cooperatives', icon: Users },
            { id: 'users', label: 'User Accounts', icon: Users },
            { id: 'integrity', label: 'Chain Integrity', icon: Shield },
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
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div
        className="flex-1 flex flex-col overflow-hidden ml-72"
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
                onDismiss={dismiss}
                onNavigateTab={(tab, notification) => {
                  if (tab === 'integrity') {
                    const transferId =
                      notification?.transferId ||
                      notification?.metadata?.transfer_id ||
                      '';
                    setIntegrityHighlightId(String(transferId || ''));
                    goToTab('integrity');
                    return;
                  }
                  goToTab(tab || 'overview');
                }}
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Top Performing Retailers</h3>
                  <p className="text-sm text-gray-600 mb-4">Ranked by bags sold to customers.</p>
                  {topRetailerData.length === 0 ? (
                    <p className="py-16 text-center text-sm text-gray-500">No retailer sales recorded yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart
                        data={topRetailerData}
                        layout="vertical"
                        margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                        <XAxis type="number" stroke="#6b7280" allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="label"
                          stroke="#6b7280"
                          width={112}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          formatter={(value, key) => [`${value} bags`, key === 'verified' ? 'Verified' : 'Sold']}
                          labelFormatter={(_, items) => items?.[0]?.payload?.name || ''}
                        />
                        <Legend />
                        <Bar dataKey="bags" fill="#16a34a" name="Bags sold" radius={[0, 6, 6, 0]} />
                        <Bar dataKey="verified" fill="#84cc16" name="Verified" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">Top Performing AMCOS</h3>
                  <p className="text-sm text-gray-600 mb-4">Ranked by bags distributed to farmers.</p>
                  {topAmcosData.length === 0 ? (
                    <p className="py-16 text-center text-sm text-gray-500">No AMCOS distributions recorded yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart
                        data={topAmcosData}
                        layout="vertical"
                        margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                        <XAxis type="number" stroke="#6b7280" allowDecimals={false} />
                        <YAxis
                          type="category"
                          dataKey="label"
                          stroke="#6b7280"
                          width={112}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          formatter={(value, key) => [`${value} bags`, key === 'verified' ? 'Verified' : 'Distributed']}
                          labelFormatter={(_, items) => items?.[0]?.payload?.name || ''}
                        />
                        <Legend />
                        <Bar dataKey="bags" fill="#7c3aed" name="Bags distributed" radius={[0, 6, 6, 0]} />
                        <Bar dataKey="verified" fill="#a78bfa" name="Verified" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Regional Overview */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Regional Overview — Tanzania</h3>
                <p className="text-sm text-gray-600 mb-4">Cooperatives and retailers grouped by region and district.</p>
                {statusMessage && <p className="mb-3 text-sm text-red-600">{statusMessage}</p>}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Region</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">District</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Cooperatives</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Retailers</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Farmers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {regionData.length === 0 && (
                        <tr>
                          <td colSpan="5" className="py-6 text-center text-sm text-gray-500">
                            No cooperative or retailer coverage recorded yet.
                          </td>
                        </tr>
                      )}
                      {regionData.map((row) => (
                        <tr key={`${row.region}-${row.district}`} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-900">{row.region}</td>
                          <td className="py-3 px-4 font-medium text-gray-900">{row.district}</td>
                          <td className="py-3 px-4 text-gray-700">{row.cooperatives}</td>
                          <td className="py-3 px-4 text-gray-700">{row.retailers}</td>
                          <td className="py-3 px-4 text-gray-700">{row.farmers}</td>
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
                      {supplierPagination.pageItems.map((supplier) => (
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
                <PaginationBar
                  page={supplierPagination.page}
                  totalPages={supplierPagination.totalPages}
                  total={supplierPagination.total}
                  rangeStart={supplierPagination.rangeStart}
                  rangeEnd={supplierPagination.rangeEnd}
                  onPrev={supplierPagination.goPrev}
                  onNext={supplierPagination.goNext}
                  canPrev={supplierPagination.canPrev}
                  canNext={supplierPagination.canNext}
                />
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
                      {retailerPagination.pageItems.map((retailer) => (
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
                <PaginationBar
                  page={retailerPagination.page}
                  totalPages={retailerPagination.totalPages}
                  total={retailerPagination.total}
                  rangeStart={retailerPagination.rangeStart}
                  rangeEnd={retailerPagination.rangeEnd}
                  onPrev={retailerPagination.goPrev}
                  onNext={retailerPagination.goNext}
                  canPrev={retailerPagination.canPrev}
                  canNext={retailerPagination.canNext}
                />
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
                      {cooperativePagination.pageItems.map((coop) => (
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
                <PaginationBar
                  page={cooperativePagination.page}
                  totalPages={cooperativePagination.totalPages}
                  total={cooperativePagination.total}
                  rangeStart={cooperativePagination.rangeStart}
                  rangeEnd={cooperativePagination.rangeEnd}
                  onPrev={cooperativePagination.goPrev}
                  onNext={cooperativePagination.goNext}
                  canPrev={cooperativePagination.canPrev}
                  canNext={cooperativePagination.canNext}
                />
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <button
                  onClick={openCreateUserForm}
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
                    <option value="warehouse_manager">Warehouse Manager</option>
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
                        <th className="py-3 px-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan="5" className="py-6 text-center text-sm text-gray-500">
                            No user accounts match your filters.
                          </td>
                        </tr>
                      )}
                      {userPagination.pageItems.map((record) => (
                        <tr key={record.user.id} className="border-b border-gray-100 text-sm">
                          <td className="py-3 px-2 font-semibold text-gray-900">{record.user.username}</td>
                          <td className="py-3 px-2 text-gray-700">{record.role}</td>
                          <td className="py-3 px-2 text-gray-700">
                            {record.supplier?.name ||
                              record.warehouse_manager?.supplier?.name ||
                              record.branch?.name ||
                              'Admin'}
                          </td>
                          <td className="py-3 px-2 text-gray-700">{record.user.email || '-'}</td>
                          <td className="py-3 px-2 text-right">
                            <button
                              type="button"
                              onClick={() => openEditUserForm(record)}
                              className="inline-flex items-center gap-1.5 text-green-600 hover:text-green-800 font-medium text-sm"
                            >
                              <Pencil className="h-4 w-4" />
                              Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <PaginationBar
                  page={userPagination.page}
                  totalPages={userPagination.totalPages}
                  total={userPagination.total}
                  rangeStart={userPagination.rangeStart}
                  rangeEnd={userPagination.rangeEnd}
                  onPrev={userPagination.goPrev}
                  onNext={userPagination.goNext}
                  canPrev={userPagination.canPrev}
                  canNext={userPagination.canNext}
                />
              </div>

              {showUserForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
                  <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-5 md:ml-72">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-bold text-gray-900">
                        {editingUserId ? 'Edit User' : 'Add User'}
                      </h2>
                      <button
                        onClick={closeUserForm}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        Close
                      </button>
                    </div>
                    {userFormLoading && (
                      <p className="mb-3 text-sm text-gray-500">Loading user details…</p>
                    )}
                    <div
                      key={editingUserId ?? 'new-user'}
                      className="grid grid-cols-1 md:grid-cols-2 gap-3"
                    >
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                        <input
                          type="text"
                          value={userForm.username}
                          onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                          readOnly={Boolean(editingUserId)}
                          className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                            editingUserId ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {editingUserId ? 'New password (optional)' : 'Password'}
                        </label>
                        <input
                          type="password"
                          value={userForm.password}
                          onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select
                          value={userForm.role}
                          onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                          disabled={Boolean(editingUserId)}
                          className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                            editingUserId ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                          }`}
                        >
                        <option value="admin">Admin</option>
                        <option value="supplier">Supplier</option>
                        <option value="warehouse_manager">Warehouse Manager</option>
                        <option value="retailer">Retailer</option>
                        <option value="cooperative">Cooperative</option>
                        <option value="regulator">Regulator</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                        <input
                          type="text"
                          value={userForm.first_name}
                          onChange={(e) => setUserForm({ ...userForm, first_name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                        <input
                          type="text"
                          value={userForm.last_name}
                          onChange={(e) => setUserForm({ ...userForm, last_name: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={userForm.email}
                          onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                      </div>
                      {userForm.role === 'warehouse_manager' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Linked supplier
                          </label>
                          <select
                            value={userForm.supplier_id}
                            onChange={(e) =>
                              setUserForm({ ...userForm, supplier_id: e.target.value })
                            }
                            disabled={Boolean(editingUserId)}
                            className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                              editingUserId ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                            }`}
                          >
                            <option value="">Select supplier</option>
                            {suppliers.map((supplier) => (
                              <option key={supplier.id} value={supplier.recordId}>
                                {supplier.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      {userForm.role !== 'admin' && userForm.role !== 'warehouse_manager' && (
                        <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {userForm.role === 'supplier' ? 'Supplier name' : 'Branch name'}
                        </label>
                        <input
                          type="text"
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
                      </div>
                      {userForm.role === 'supplier' ? (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier region</label>
                            <input
                              type="text"
                              value={userForm.supplier_region}
                              onChange={(e) => setUserForm({ ...userForm, supplier_region: e.target.value })}
                              list="supplier-region-options"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                          </div>
                          <datalist id="supplier-region-options">
                            {getRegionOptions(userForm.supplier_region).map((region) => (
                              <option key={region} value={region} />
                            ))}
                          </datalist>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contact phone</label>
                            <input
                              type="text"
                              value={userForm.contact_phone}
                              onChange={(e) => setUserForm({ ...userForm, contact_phone: e.target.value })}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Branch type</label>
                            <select
                              value={userForm.branch_type}
                              onChange={(e) => setUserForm({ ...userForm, branch_type: e.target.value })}
                              disabled={Boolean(editingUserId)}
                              className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                                editingUserId ? 'bg-gray-100 text-gray-600 cursor-not-allowed' : ''
                              }`}
                            >
                              <option value="RETAILER">Retailer</option>
                              <option value="COOPERATIVE">Cooperative</option>
                              <option value="REGULATOR">Regulator</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Region</label>
                            <input
                              type="text"
                              value={userForm.region}
                              onChange={(e) =>
                                setUserForm({ ...userForm, region: e.target.value, district: '' })
                              }
                              list="region-options"
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            />
                          </div>
                          <datalist id="region-options">
                            {getRegionOptions(userForm.region).map((region) => (
                              <option key={region} value={region} />
                            ))}
                          </datalist>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
                            <input
                              type="text"
                              value={userForm.district}
                              onChange={(e) => setUserForm({ ...userForm, district: e.target.value })}
                              list="district-options"
                              disabled={!userForm.region}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                            />
                          </div>
                          <datalist id="district-options">
                            {filteredDistrictOptions.map((district) => (
                              <option key={district} value={district} />
                            ))}
                          </datalist>
                        </>
                      )}
                        </>
                      )}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      {userStatus && <p className="text-sm text-red-600">{userStatus}</p>}
                      <button
                        onClick={handleSaveUser}
                        disabled={userFormLoading}
                        className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors ml-auto disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {editingUserId ? 'Save Changes' : 'Create User'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'integrity' && (
            <IntegrityPanel
              highlightTransferId={integrityHighlightId}
              onScanComplete={() => refreshNotifications()}
            />
          )}

        </main>
      </div>
    </div>
  );
}
