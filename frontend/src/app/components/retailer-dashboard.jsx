import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Package, Users, Send, History, LogOut, TrendingUp, ShieldCheck, Search } from 'lucide-react';
import { NotificationBell } from './notification-bell';
import { useNotifications } from '../hooks/use-notifications';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Logo } from './logo';
import { FarmerOTPModal } from './farmer-otp-modal';
import { ReceiveFertilizerPanel } from './receive-fertilizer-panel';
import { RetailerSalePanel } from './retailer-sale-panel';
import { StockBatchPicker } from './stock-batch-picker';
import { CooperativeHistoryPanel } from './cooperative-history-panel';
import { VerificationTrustSeal } from './verification-trust-seal';
import {
  createTransfer,
  fetchTransfers,
  sendOtp,
  uploadProof,
  verifyOtp,
} from '../api/client';
import { handleOtpSmsResponse } from '../utils/otp-sms';
import {
  farmerHasValidPhone,
  otpLoadingLabel,
  requestDistributionOtp,
} from '../utils/distribution-otp';
import {
  QuickActionCard,
  ContentListRow,
  PanelPrimaryButton,
  PanelOutlineButton,
} from './ui/dashboard-ui';
import { buildDashboardPath, resolveDashboardTab } from '../utils/dashboard-routing';
import { buildWeeklyTrend } from '../utils/chart-trends';
import { getUserMessage } from '../utils/user-messages';
import { takeRecent, sortByDateDesc, RECENT_LIST_LIMIT, HISTORY_PAGE_SIZE } from '../utils/list-limits';
import { exportAnalyticsPdf, exportAnalyticsCsv } from '../utils/analytics-export';
import { AnalyticsExportBar, filterByDateRange } from './ui/analytics-export-bar';
import { usePaginatedList } from '../hooks/use-paginated-list';
import { PaginationBar, RecentListNote } from './ui/pagination-bar';

export function RetailerDashboard({ userProfile, onLogout }) {
  const dashboardRole = 'retailer';
  const dashboardTabs = ['overview', 'receive', 'distribute', 'customers', 'verification', 'history', 'analytics'];
  const [activeTab, setActiveTab] = useState('overview');
  const [inboundTransfers, setInboundTransfers] = useState([]);
  const [distributionForm, setDistributionForm] = useState({ batchId: '', bags: '' });
  const [saleBuyer, setSaleBuyer] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [distributions, setDistributions] = useState([]);
  const [verificationList, setVerificationList] = useState([]);
  const [pendingTransfer, setPendingTransfer] = useState(null);
  const [pendingFarmer, setPendingFarmer] = useState(null);
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [smsInfo, setSmsInfo] = useState(null);
  const [otpCodeLength, setOtpCodeLength] = useState(6);
  const [latestVerification, setLatestVerification] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savePhase, setSavePhase] = useState('');
  const [otpSendingTransferId, setOtpSendingTransferId] = useState(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [customerSort, setCustomerSort] = useState('date');
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

  const receivedBatches = useMemo(
    () =>
      inboundTransfers.filter(
        (transfer) => transfer.status === 'RECEIVED' || transfer.status === 'VERIFIED'
      ),
    [inboundTransfers]
  );

  const distributableStock = useMemo(() => {
    const stock = new Map();
    receivedBatches.forEach((transfer) => {
      if (!transfer.batchId) return;
      const current = stock.get(transfer.batchId) || {
        batchId: transfer.batchId,
        batchCode: transfer.batchCode,
        fertilizerType: transfer.fertilizerType,
        bagsAvailable: 0,
      };
      current.bagsAvailable += Number(transfer.bags) || 0;
      stock.set(transfer.batchId, current);
    });
    distributions.forEach((dist) => {
      const batchId = dist.rawTransfer?.batch?.id;
      if (batchId && stock.has(batchId)) {
        stock.get(batchId).bagsAvailable -= Number(dist.bags) || 0;
      }
    });
    return Array.from(stock.values()).filter((item) => item.bagsAvailable > 0);
  }, [receivedBatches, distributions]);

  const pendingReceiptCount = useMemo(
    () => inboundTransfers.filter((transfer) => transfer.status === 'DISPATCHED').length,
    [inboundTransfers]
  );

  const otpStatusMix = useMemo(() => {
    const verified = distributions.filter((dist) => dist.otp.toLowerCase() === 'verified').length;
    const pending = Math.max(distributions.length - verified, 0);
    return [
      { name: 'Verified', value: verified, color: '#16a34a' },
      { name: 'Pending', value: pending, color: '#f59e0b' },
    ];
  }, [distributions]);

  const allCustomers = useMemo(() => {
    const seen = new Map();
    sortByDateDesc(distributions).forEach((dist) => {
      const key =
        dist.farmerMinistryId ||
        (dist.farmerPhone ? `phone:${dist.farmerPhone}` : null) ||
        dist.farmer;
      if (!key || seen.has(key)) return;
      seen.set(key, {
        id: key,
        name: dist.farmer,
        ministryId: dist.farmerMinistryId || '—',
        phone: dist.farmerPhone || '—',
        lastDiscount: dist.discountPercent,
        lastDate: dist.date,
        hasMinistryId: Boolean(dist.farmerMinistryId),
        isSubsidized: Number(dist.discountPercent) > 0,
      });
    });
    return sortByDateDesc(Array.from(seen.values()), 'lastDate');
  }, [distributions]);

  const filteredCustomers = useMemo(() => {
    const needle = customerSearch.trim().toLowerCase();
    let items = allCustomers.filter((customer) => {
      if (customerFilter === 'subsidy' && !customer.isSubsidized) return false;
      if (customerFilter === 'walkin' && customer.isSubsidized) return false;
      if (!needle) return true;
      return [customer.name, customer.ministryId, customer.phone, customer.lastDate]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });

    if (customerSort === 'name') {
      items = [...items].sort((a, b) => a.name.localeCompare(b.name));
    } else {
      items = sortByDateDesc(items, 'lastDate');
    }

    return items;
  }, [allCustomers, customerSearch, customerFilter, customerSort]);

  const customerPagination = usePaginatedList(filteredCustomers, HISTORY_PAGE_SIZE);

  const recentDistributions = useMemo(
    () => takeRecent(distributions, RECENT_LIST_LIMIT),
    [distributions]
  );

  const verificationPagination = usePaginatedList(verificationList, HISTORY_PAGE_SIZE);

  const refreshData = async () => {
    try {
      const transferData = await fetchTransfers();

      const inbound = transferData.filter(
        (transfer) =>
          transfer.transfer_type === 'SUPPLIER_TO_BRANCH' &&
          transfer.to_branch?.id === userProfile.branchId
      );
      setInboundTransfers(
        inbound.map((transfer) => ({
          id: transfer.id,
          batchId: transfer.batch?.id,
          batchCode: transfer.batch?.batch_code,
          fertilizerType: transfer.batch?.fertilizer_type,
          source: transfer.from_supplier?.name || 'Supplier',
          bags: transfer.quantity_bags,
          date: transfer.created_at?.slice(0, 10),
          status: transfer.status,
        }))
      );

      const outbound = transferData.filter(
        (transfer) =>
          transfer.transfer_type === 'BRANCH_TO_FARMER' &&
          transfer.from_branch?.id === userProfile.branchId
      );
      setDistributions(
        outbound.map((transfer) => ({
          id: transfer.id,
          farmer: transfer.farmer?.name || 'Farmer',
          farmerMinistryId: transfer.farmer?.ministry_id,
          farmerPhone: transfer.farmer?.phone_number,
          bags: transfer.quantity_bags,
          otp: transfer.status === 'VERIFIED' ? 'Verified' : 'Pending',
          date: transfer.created_at?.slice(0, 10),
          batchCode: transfer.batch?.batch_code,
          fertilizerType: transfer.batch?.fertilizer_type,
          discountPercent: transfer.discount_percent ?? 0,
          ministryVerified: transfer.ministry_verified,
          buyerType: transfer.buyer_type,
          rawTransfer: transfer,
        }))
      );
      setVerificationList(
        outbound.map((transfer) => ({
          id: transfer.id,
          farmer: transfer.farmer?.name || 'Farmer',
          farmerMinistryId: transfer.farmer?.ministry_id || '',
          bags: transfer.quantity_bags,
          status: transfer.status === 'VERIFIED' ? 'verified' : 'pending',
          batchCode: transfer.batch?.batch_code,
          fertilizerType: transfer.batch?.fertilizer_type,
          date: transfer.created_at?.slice(0, 10),
          rawTransfer: transfer,
        }))
      );
      await refreshNotifications();
    } catch (error) {
      setStatusMessage(getUserMessage(error));
    }
  };

  const distributionTrends = useMemo(
    () =>
      buildWeeklyTrend(distributions, {
        dateKey: 'date',
        countKeys: {
          bags: 'bags',
          verified: (item) => (item.otp?.toLowerCase() === 'verified' ? Number(item.bags) || 0 : 0),
        },
      }),
    [distributions]
  );

  useEffect(() => {
    refreshData();
  }, []);

  const stockAvailable = distributableStock.reduce((sum, batch) => sum + batch.bagsAvailable, 0);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="w-72 bg-gradient-to-b from-green-700 to-green-900 text-white flex flex-col">
        <div className="p-4 border-b border-green-600">
          <div className="w-fit mx-auto bg-white rounded-xl px-4 py-2 shadow-lg">
            <Logo size="md" variant="full" showText={false} />
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {[
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'receive', label: 'Receive Batches', icon: Package },
            { id: 'distribute', label: 'Point of Sale', icon: Send },
            { id: 'customers', label: 'Customers', icon: Users },
            { id: 'verification', label: 'Verify Distribution', icon: ShieldCheck },
            { id: 'history', label: 'History', icon: History },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
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

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Retailer Dashboard</h1>
              <p className="text-sm text-gray-600">
                {userProfile.organization} — {userProfile.location}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkRead={markRead}
                onMarkAllRead={markAllRead}
                onDismiss={dismiss}
                onNavigateTab={(tab) => {
                  const tabMap = {
                    receive: 'receive',
                    distribute: 'distribute',
                    verification: 'verification',
                  };
                  goToTab(tabMap[tab] || tab);
                }}
              />
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{userProfile.name}</p>
                <p className="text-xs text-gray-500">Retailer ID: {userProfile.retailerId}</p>
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

        <main className="flex-1 overflow-y-auto p-8 space-y-6">
          {latestVerification && (
            <VerificationTrustSeal
              verification={latestVerification}
              onDismiss={() => setLatestVerification(null)}
            />
          )}

          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  {
                    label: 'Customers',
                    value: `${allCustomers.length}`,
                    change: 'Unique buyers at this shop',
                    icon: Users,
                  },
                  {
                    label: 'Stock Available',
                    value: `${stockAvailable} bags`,
                    change: 'Ready to distribute',
                    icon: Package,
                  },
                  {
                    label: 'Pending Receipts',
                    value: `${pendingReceiptCount}`,
                    change: 'Confirm supplier deliveries',
                    icon: Package,
                  },
                  {
                    label: 'Verified Sales',
                    value: `${verificationList.filter((item) => item.status === 'verified').length}`,
                    change: 'OTP confirmed',
                    icon: ShieldCheck,
                  },
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
                    icon={Package}
                    tone="amber"
                    title="Receive Batches"
                    description={
                      pendingReceiptCount > 0
                        ? `${pendingReceiptCount} awaiting confirmation`
                        : 'Confirm incoming stock'
                    }
                    onClick={() => goToTab('receive')}
                  />
                  <QuickActionCard
                    icon={Send}
                    tone="green"
                    title="Point of Sale"
                    description="Ministry ID discount or walk-in"
                    onClick={() => goToTab('distribute')}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-xl font-bold text-gray-900">Customers</h2>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: 'all', label: 'All' },
                    { id: 'subsidy', label: 'Subsidy' },
                    { id: 'walkin', label: 'Walk-in' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setCustomerFilter(option.id)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        customerFilter === option.id
                          ? 'border-green-600 bg-green-50 text-green-800'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {allCustomers.length === 0 ? (
                <p className="text-sm text-gray-500">No sales recorded yet.</p>
              ) : (
                <>
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="search"
                        value={customerSearch}
                        onChange={(event) => setCustomerSearch(event.target.value)}
                        placeholder="Search by name, Ministry ID, or phone"
                        className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500"
                      />
                    </div>
                    <select
                      value={customerSort}
                      onChange={(event) => setCustomerSort(event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-transparent focus:ring-2 focus:ring-green-500 sm:w-44"
                    >
                      <option value="date">Sort by date</option>
                      <option value="name">Sort by name</option>
                    </select>
                  </div>

                  {filteredCustomers.length === 0 ? (
                    <p className="text-sm text-gray-500">No customers match your search or filters.</p>
                  ) : (
                    <>
                      <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                            Name
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                            Ministry ID
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                            Phone
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                            Last sale
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-600">
                            Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {customerPagination.pageItems.map((customer) => (
                          <tr key={customer.id} className="hover:bg-gray-50">
                            <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-900">
                              {customer.name}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                              {customer.ministryId}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                              {customer.phone}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm">
                              {customer.lastDiscount > 0 ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                  {customer.lastDiscount}% discount
                                </span>
                              ) : (
                                <span className="text-gray-500">Walk-in / full price</span>
                              )}
                            </td>
                            <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                              {customer.lastDate || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                      </div>
                      <PaginationBar
                        page={customerPagination.page}
                        totalPages={customerPagination.totalPages}
                        total={customerPagination.total}
                        rangeStart={customerPagination.rangeStart}
                        rangeEnd={customerPagination.rangeEnd}
                        onPrev={customerPagination.goPrev}
                        onNext={customerPagination.goNext}
                        canPrev={customerPagination.canPrev}
                        canNext={customerPagination.canNext}
                        className="mt-4"
                      />
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {activeTab === 'receive' && (
            <ReceiveFertilizerPanel inboundTransfers={inboundTransfers} onRefresh={refreshData} />
          )}

          {activeTab === 'distribute' && (
            <div className="space-y-6">
              {distributableStock.length === 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-800">No stock available to distribute.</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Receive fertilizer from a supplier under <strong>Receive Batches</strong>, then return here.
                  </p>
                </div>
              )}
              <RetailerSalePanel
                onBuyerResolved={(buyer) => setSaleBuyer(buyer)}
                onClear={() => setSaleBuyer(null)}
              />
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Complete sale</h2>
                  <p className="text-sm text-gray-600">
                    Choose a batch, set bags and discount, then send OTP to the customer&apos;s phone.
                  </p>
                </div>

                <StockBatchPicker
                  batches={distributableStock}
                  selectedBatchId={distributionForm.batchId}
                  onSelect={(batchId) =>
                    setDistributionForm({ ...distributionForm, batchId: String(batchId) })
                  }
                  disabled={distributableStock.length === 0}
                  emptyMessage="Receive fertilizer first — no batches in stock."
                />

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Bags to sell
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Bags"
                      value={distributionForm.bags}
                      onChange={(e) =>
                        setDistributionForm({ ...distributionForm, bags: e.target.value })
                      }
                      disabled={!distributionForm.batchId}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Subsidy discount
                    </label>
                    <div className="flex items-center rounded-lg border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-green-500">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={saleBuyer?.discountEligible ? saleBuyer.discountPercent : 0}
                        onChange={(e) => {
                          if (!saleBuyer?.discountEligible) return;
                          const value = Math.min(
                            100,
                            Math.max(0, Number(e.target.value) || 0)
                          );
                          setSaleBuyer({ ...saleBuyer, discountPercent: value });
                        }}
                        disabled={!saleBuyer?.discountEligible}
                        className="min-w-0 flex-1 rounded-lg border-0 bg-transparent px-4 py-3 text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
                      />
                      <span className="pr-4 text-sm font-medium text-gray-600">% off</span>
                    </div>
                    {!saleBuyer?.discountEligible && (
                      <p className="mt-1 text-xs text-gray-500">Walk-in customers — no discount</p>
                    )}
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Delivery Proof (optional)
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-gray-600"
                  />
                </div>
                <PanelPrimaryButton
                  icon={Send}
                  onClick={async () => {
                    if (!saleBuyer?.farmerId || !distributionForm.bags || !distributionForm.batchId) {
                      setStatusMessage('Select a customer above, then batch and bags.');
                      return;
                    }
                    if (!farmerHasValidPhone(saleBuyer)) {
                      setStatusMessage(
                        'Customer has no valid phone number. Ministry lookup must include a phone.'
                      );
                      return;
                    }
                    setIsSaving(true);
                    setStatusMessage('');
                    setSavePhase(otpLoadingLabel('create', 'en'));
                    try {
                      const transfer = await createTransfer({
                        batch_id: Number(distributionForm.batchId),
                        transfer_type: 'BRANCH_TO_FARMER',
                        from_branch_id: userProfile.branchId,
                        farmer_id: saleBuyer.farmerId,
                        quantity_bags: Number(distributionForm.bags),
                        status: 'DISPATCHED',
                        buyer_type: saleBuyer.buyerType || 'MINISTRY',
                        ministry_verified: saleBuyer.ministryVerified,
                        discount_percent: saleBuyer.discountPercent,
                      });
                      setSavePhase(otpLoadingLabel('api', 'en', 'sms'));
                      const otpResponse = await requestDistributionOtp(transfer, sendOtp);
                      if (!otpResponse?.sms) {
                        throw new Error('OTP could not be sent to the farmer phone.');
                      }
                      if (proofFile) {
                        setSavePhase('Uploading proof…');
                        await uploadProof(transfer.id, proofFile);
                        setProofFile(null);
                      }
                      const smsOk = handleOtpSmsResponse(otpResponse.sms, {
                        onDelivered: (sms) => {
                          setOtpCodeLength(otpResponse.otp_code_length ?? 6);
                          setPendingTransfer(transfer);
                          setPendingFarmer({
                            name: saleBuyer.name,
                            ministryId: saleBuyer.ministryId,
                          });
                          setSmsInfo(sms);
                          setIsOtpOpen(true);
                          setDistributionForm({ batchId: '', bags: '' });
                          setSaleBuyer(null);
                        },
                        onFailed: (message) => setStatusMessage(message),
                      });
                      if (!smsOk) {
                        setStatusMessage(
                          (current) =>
                            current ||
                            'Sale was saved but the verification code could not be sent. Open Verify Distribution to resend.'
                        );
                      }
                      await refreshData();
                    } catch (error) {
                      setStatusMessage(getUserMessage(error));
                    } finally {
                      setIsSaving(false);
                      setSavePhase('');
                    }
                  }}
                  className="mt-4"
                  disabled={isSaving || distributableStock.length === 0 || !saleBuyer?.farmerId}
                >
                  {isSaving ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {savePhase || 'Processing…'}
                    </span>
                  ) : (
                    'Send Verification SMS'
                  )}
                </PanelPrimaryButton>
                {isSaving && savePhase && (
                  <p className="mt-2 text-xs text-gray-600">{savePhase}</p>
                )}
                {statusMessage && <p className="mt-3 text-sm text-red-600">{statusMessage}</p>}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h3 className="text-lg font-bold text-gray-900">Recent Distributions</h3>
                  <RecentListNote
                    shown={recentDistributions.length}
                    total={distributions.length}
                    label="distributions"
                  />
                </div>
                <div className="space-y-3">
                  {distributions.length === 0 ? (
                    <p className="text-sm text-gray-500">No distributions yet.</p>
                  ) : (
                    recentDistributions.map((dist) => (
                      <div
                        key={dist.id}
                        className="flex items-center justify-between border border-gray-100 rounded-lg p-4"
                      >
                        <div>
                          <p className="font-semibold text-gray-900">{dist.farmer}</p>
                          <p className="text-sm text-gray-600">
                            {dist.bags} bags • OTP {dist.otp}
                            {dist.batchCode ? ` • ${dist.batchCode}` : ''}
                            {dist.discountPercent > 0
                              ? ` • ${dist.discountPercent}% discount`
                              : ' • full price'}
                          </p>
                        </div>
                        <span className="text-sm text-gray-500">{dist.date}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'verification' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <p className="text-sm text-gray-600">Total Distributions</p>
                  <p className="text-2xl font-bold text-gray-900">{verificationList.length}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <p className="text-sm text-gray-600">Verified</p>
                  <p className="text-2xl font-bold text-green-700">
                    {verificationList.filter((item) => item.status === 'verified').length}
                  </p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                  <p className="text-sm text-gray-600">Awaiting OTP</p>
                  <p className="text-2xl font-bold text-amber-700">
                    {verificationList.filter((item) => item.status === 'pending').length}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Verify Distribution</h2>
                {verificationList.length === 0 ? (
                  <p className="text-sm text-gray-500">No distributions to verify yet.</p>
                ) : (
                  <>
                    <div className="space-y-3">
                      {verificationPagination.pageItems.map((record) => {
                      const isVerified = record.status === 'verified';
                      return (
                        <ContentListRow
                          key={record.id}
                          icon={ShieldCheck}
                          tone={isVerified ? 'emerald' : 'amber'}
                          action={
                            !isVerified ? (
                              <PanelOutlineButton
                                icon={ShieldCheck}
                                onClick={async () => {
                                  try {
                                    setStatusMessage('');
                                    setOtpSendingTransferId(record.id);
                                    const otpResponse = await sendOtp(record.id, { resend: true });
                                    handleOtpSmsResponse(otpResponse.sms, {
                                      onDelivered: (sms) => {
                                        setOtpCodeLength(otpResponse.otp_code_length ?? 6);
                                        setPendingTransfer(record.rawTransfer);
                                        setPendingFarmer({
                                          name: record.farmer,
                                          ministryId: record.farmerMinistryId,
                                        });
                                        setSmsInfo(sms);
                                        setIsOtpOpen(true);
                                      },
                                      onFailed: (message) => setStatusMessage(message),
                                    });
                                  } catch (error) {
                                    setStatusMessage(getUserMessage(error));
                                  } finally {
                                    setOtpSendingTransferId(null);
                                  }
                                }}
                                disabled={otpSendingTransferId === record.id}
                              >
                                {otpSendingTransferId === record.id
                                  ? 'Sending OTP…'
                                  : 'Resend & Verify OTP'}
                              </PanelOutlineButton>
                            ) : null
                          }
                        >
                          <p className="font-semibold text-gray-900">
                            {record.farmer}{' '}
                            {record.farmerMinistryId && (
                              <span className="text-xs font-normal text-gray-500">
                                ({record.farmerMinistryId})
                              </span>
                            )}
                          </p>
                          <p className="text-sm text-gray-600">
                            {record.bags} bags
                            {record.batchCode ? ` • ${record.batchCode}` : ''}
                          </p>
                          <span
                            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                              isVerified
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {isVerified ? 'Verified' : 'Pending'}
                          </span>
                        </ContentListRow>
                      );
                    })}
                    </div>
                    <PaginationBar
                      page={verificationPagination.page}
                      totalPages={verificationPagination.totalPages}
                      total={verificationPagination.total}
                      rangeStart={verificationPagination.rangeStart}
                      rangeEnd={verificationPagination.rangeEnd}
                      onPrev={verificationPagination.goPrev}
                      onNext={verificationPagination.goNext}
                      canPrev={verificationPagination.canPrev}
                      canNext={verificationPagination.canNext}
                      className="mt-4"
                    />
                  </>
                )}
                {statusMessage && <p className="mt-3 text-sm text-red-600">{statusMessage}</p>}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <CooperativeHistoryPanel
              receivedBatches={inboundTransfers}
              distributions={distributions}
            />
          )}

          {activeTab === 'analytics' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
              <AnalyticsExportBar
                title="Retailer Analytics"
                subtitle="Batch receipts, distribution activity, and verification stats."
                onExcel={(from, to) => {
                  const filtered = filterByDateRange(distributions, from, to);
                  exportAnalyticsCsv({
                    role: 'Retailer',
                    orgName: userProfile?.organization || userProfile?.name || '',
                    filename: 'retailer_analytics',
                    summaryRows: [
                      { label: 'Batches Received', value: receivedBatches.length },
                      { label: 'Distributions', value: filtered.length },
                      { label: 'OTP Verified', value: filtered.filter((d) => d.otp?.toLowerCase() === 'verified').length },
                      { label: 'Customers Served', value: verificationList.length },
                    ],
                    tableHeaders: ['Date', 'Farmer / Customer', 'Product', 'Bags', 'Destination', 'OTP Status'],
                    tableData: filtered.map((d) => [d.date, d.farmer || '—', d.product || '—', d.bags ?? '—', d.destination || '—', d.otp || '—']),
                  });
                }}
                onPdf={(from, to) => {
                  const filtered = filterByDateRange(distributions, from, to);
                  exportAnalyticsPdf({
                    role: 'Retailer',
                    orgName: userProfile?.organization || userProfile?.name || '',
                    title: 'Retailer Analytics Report',
                    subtitle: from || to ? `Period: ${from || '…'} to ${to || 'today'}` : 'Distribution activity, OTP verification & batch receipts',
                    summaryRows: [
                      { label: 'Batches Received', value: receivedBatches.length },
                      { label: 'Distributions Made', value: filtered.length },
                      { label: 'OTP Verified', value: filtered.filter((d) => d.otp?.toLowerCase() === 'verified').length },
                      { label: 'Pending Verification', value: filtered.filter((d) => d.otp?.toLowerCase() !== 'verified').length },
                      { label: 'Customers Served', value: verificationList.length },
                    ],
                    tableHeaders: ['Date', 'Farmer / Customer', 'Product', 'Bags', 'Destination', 'OTP Status'],
                    tableData: filtered.map((d) => [d.date, d.farmer || '—', d.product || '—', d.bags ?? '—', d.destination || '—', d.otp || '—']),
                  });
                }}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Batches Received</p>
                  <p className="text-2xl font-bold text-gray-900">{receivedBatches.length}</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Distributions</p>
                  <p className="text-2xl font-bold text-gray-900">{distributions.length}</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">OTP Verified</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {distributions.filter((dist) => dist.otp.toLowerCase() === 'verified').length}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4 h-56">
                  <p className="text-sm font-medium text-gray-700 mb-3">Distribution Trend</p>
                  <ResponsiveContainer width="100%" height="90%">
                    <LineChart data={distributionTrends}>
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="bags" stroke="#16a34a" strokeWidth={2} name="Bags" />
                      <Line type="monotone" dataKey="verified" stroke="#15803d" strokeWidth={2} name="Verified" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 h-56">
                  <p className="text-sm font-medium text-gray-700 mb-3">OTP Status</p>
                  <ResponsiveContainer width="100%" height="90%">
                    <PieChart>
                      <Pie data={otpStatusMix} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80}>
                        {otpStatusMix.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {pendingTransfer && (
        <FarmerOTPModal
          isOpen={isOtpOpen}
          onClose={() => setIsOtpOpen(false)}
          onVerified={async () => {
            setIsOtpOpen(false);
            await refreshData();
          }}
          onVerify={async (code) => {
            const result = await verifyOtp(pendingTransfer.id, code);
            if (result?.verification) {
              setLatestVerification({
                ...result.verification,
                transfer_id: pendingTransfer.id,
              });
            }
          }}
          onResend={async (options) => {
            const response = await requestDistributionOtp(pendingTransfer, sendOtp, {
              resend: true,
              ...options,
            });
            if (!handleOtpSmsResponse(response.sms, {
              onDelivered: (sms) => {
                setOtpCodeLength(response.otp_code_length ?? 6);
                setSmsInfo(sms);
              },
              onFailed: (message) => {
                throw new Error(message);
              },
            })) {
              throw new Error('OTP was not delivered');
            }
          }}
          farmerName={pendingFarmer?.name || 'Farmer'}
          farmerId={pendingFarmer?.ministryId || ''}
          transferId={pendingTransfer?.id}
          smsInfo={smsInfo}
          distributionData={{
            bagsGiven: pendingTransfer.quantity_bags,
            fertilizerType: pendingTransfer.batch?.fertilizer_type || 'Fertilizer',
          }}
          otpLength={otpCodeLength}
        />
      )}
    </div>
  );
}
