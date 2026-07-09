import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Package, Users, Send, History, LogOut, TrendingUp, ShieldCheck } from 'lucide-react';
import { NotificationBell } from './notification-bell';
import { useNotifications } from '../hooks/use-notifications';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Logo } from './logo';
import { FarmerOTPModal } from './farmer-otp-modal';
import { FarmerRegistryPanel } from './farmer-registry-panel';
import { ReceiveFertilizerPanel } from './receive-fertilizer-panel';
import { CooperativeHistoryPanel } from './cooperative-history-panel';
import { StockBatchPicker } from './stock-batch-picker';
import { VerificationTrustSeal } from './verification-trust-seal';
import {
  createTransfer,
  fetchFarmers,
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
import { buildDashboardPath, resolveDashboardTab } from '../utils/dashboard-routing';
import { buildMonthlyTrend } from '../utils/chart-trends';
import { getUserMessage } from '../utils/user-messages';
import { takeRecent, RECENT_LIST_LIMIT, HISTORY_PAGE_SIZE } from '../utils/list-limits';
import { exportAnalyticsPdf, exportAnalyticsCsv } from '../utils/analytics-export';
import { AnalyticsExportBar, filterByDateRange } from './ui/analytics-export-bar';
import { usePaginatedList } from '../hooks/use-paginated-list';
import { PaginationBar, RecentListNote } from './ui/pagination-bar';
import {
  QuickActionCard,
  ContentListRow,
  PanelPrimaryButton,
  PanelOutlineButton,
} from './ui/dashboard-ui';

export function CooperativeDashboard({ userProfile, onLogout }) {
  const dashboardRole = 'cooperative';
  const dashboardTabs = ['overview', 'farmers', 'fertilizer-in', 'fertilizer-out', 'verification', 'history', 'analytics'];
  const [activeTab, setActiveTab] = useState('overview');
  const [inboundTransfers, setInboundTransfers] = useState([]);
  const [distributionForm, setDistributionForm] = useState({
    batchId: '',
    farmer: '',
    bags: '',
    discountPercent: 10,
  });
  const [proofFile, setProofFile] = useState(null);
  const [distributions, setDistributions] = useState([]);
  const [verificationList, setVerificationList] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [pendingTransfer, setPendingTransfer] = useState(null);
  const [pendingFarmer, setPendingFarmer] = useState(null);
  const [selectedReceiveTransferId, setSelectedReceiveTransferId] = useState('');
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [smsInfo, setSmsInfo] = useState(null);
  const [otpCodeLength, setOtpCodeLength] = useState(6);
  const [latestVerification, setLatestVerification] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savePhase, setSavePhase] = useState('');
  const [otpSendingTransferId, setOtpSendingTransferId] = useState(null);
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
  const verificationTrend = useMemo(
    () =>
      buildMonthlyTrend(verificationList, {
        dateKey: 'date',
        countKeys: {
          verified: (item) => (item.status === 'verified' ? Number(item.bags) || 1 : 0),
          pending: (item) => (item.status === 'verified' ? 0 : Number(item.bags) || 1),
        },
      }),
    [verificationList]
  );
  const hasVerificationTrend = useMemo(
    () => verificationTrend.some((entry) => entry.verified > 0 || entry.pending > 0),
    [verificationTrend]
  );
  const distributionMix = useMemo(() => {
    const verified = distributions.filter((dist) => dist.otp.toLowerCase() === 'verified').length;
    const pending = Math.max(distributions.length - verified, 0);
    return [
      { name: 'Verified', value: verified, color: '#16a34a' },
      { name: 'Pending', value: pending, color: '#f59e0b' },
    ];
  }, [distributions]);

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

  const recentDistributions = useMemo(
    () => takeRecent(distributions, RECENT_LIST_LIMIT),
    [distributions]
  );

  const verificationPagination = usePaginatedList(verificationList, HISTORY_PAGE_SIZE);

  const refreshData = async () => {
    try {
      const [farmerData, transferData] = await Promise.all([
        fetchFarmers(),
        fetchTransfers(),
      ]);
      const mappedFarmers = farmerData.map((farmer) => ({
        id: farmer.id,
        name: farmer.name,
        village: farmer.district || '',
        phone: farmer.phone_number,
        ministryId: farmer.ministry_id,
        cooperativeId: farmer.cooperative?.id,
      }));
      setFarmers(
        mappedFarmers.filter((farmer) =>
          userProfile.branchId ? farmer.cooperativeId === userProfile.branchId : true
        )
      );

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
          source: transfer.from_supplier?.name || transfer.from_branch?.name || 'Source',
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

  useEffect(() => {
    refreshData();
  }, []);

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
            { id: 'overview', label: 'Overview', icon: TrendingUp },
            { id: 'farmers', label: 'Farmer Registry', icon: Users },
            { id: 'fertilizer-in', label: 'Receive Fertilizer', icon: Package },
            { id: 'fertilizer-out', label: 'Distribute Fertilizer', icon: Send },
            { id: 'verification', label: 'Verify Distribution', icon: ShieldCheck },
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
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AMCOS Dashboard</h1>
              <p className="text-sm text-gray-600">{userProfile.organization} - {userProfile.village}</p>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkRead={markRead}
                onMarkAllRead={markAllRead}
                onDismiss={dismiss}
                onNavigateTab={(tab, notification) => {
                  const tabMap = {
                    receive: 'fertilizer-in',
                    distribute: 'fertilizer-out',
                    verification: 'verification',
                    farmers: 'farmers',
                  };
                  goToTab(tabMap[tab] || tab);
                  const transferId =
                    notification?.transferId ||
                    notification?.metadata?.transfer_id ||
                    notification?.transfer_ids?.[0];
                  if ((tab === 'receive' || tabMap[tab] === 'fertilizer-in') && transferId) {
                    setSelectedReceiveTransferId(String(transferId));
                  }
                }}
              />
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{userProfile.name}</p>
                <p className="text-xs text-gray-500">AMCOS ID: {userProfile.cooperativeId}</p>
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
                  { label: 'Member Farmers', value: `${farmers.length}`, change: 'Registered with this AMCOS', icon: Users },
                  { label: 'Fertilizer Stock', value: `${receivedBatches.reduce((sum, batch) => sum + batch.bags, 0)} bags`, change: 'Confirmed receipts', icon: Package },
                  { label: 'Pending Receipts', value: `${pendingReceiptCount}`, change: 'Awaiting confirmation', icon: Package },
                  { label: 'Distributions Verified', value: `${verificationList.filter((item) => item.status === 'verified').length}`, change: 'OTP confirmed', icon: ShieldCheck },
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
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <QuickActionCard
                    icon={Send}
                    tone="green"
                    title="Distribute Fertilizer"
                    description="Give to farmers with OTP"
                    onClick={() => goToTab('fertilizer-out')}
                  />
                  <QuickActionCard
                    icon={Package}
                    tone="amber"
                    title="Receive Fertilizer"
                    description={
                      pendingReceiptCount > 0
                        ? `${pendingReceiptCount} pending receipt${pendingReceiptCount === 1 ? '' : 's'}`
                        : 'Confirm incoming batches'
                    }
                    onClick={() => goToTab('fertilizer-in')}
                  />
                  <QuickActionCard
                    icon={Users}
                    tone="blue"
                    title="Farmer Registry"
                    description="Register and view farmers"
                    onClick={() => goToTab('farmers')}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'farmers' && (
            <FarmerRegistryPanel
              farmers={farmers}
              userProfile={userProfile}
              onRegistered={refreshData}
            />
          )}

          {activeTab === 'fertilizer-in' && (
            <ReceiveFertilizerPanel
              inboundTransfers={inboundTransfers}
              onRefresh={refreshData}
              highlightTransferId={selectedReceiveTransferId}
            />
          )}

          {activeTab === 'fertilizer-out' && (
            <div className="space-y-6">
              {receivedBatches.length === 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-800">
                    No confirmed fertilizer batches available.
                  </p>
                  <p className="text-xs text-amber-700">
                    Go to <button type="button" onClick={() => goToTab('fertilizer-in')} className="font-semibold underline">Receive Fertilizer</button> to confirm incoming batches before distributing.
                  </p>
                </div>
              )}
              {farmers.length === 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm font-medium text-blue-800">
                    No farmers registered with this AMCOS.
                  </p>
                  <p className="text-xs text-blue-700">
                    Go to <button type="button" onClick={() => goToTab('farmers')} className="font-semibold underline">Farmer Registry</button> to register farmers from the Ministry registry.
                  </p>
                </div>
              )}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">Distribute Fertilizer</h2>
                  <p className="text-sm text-gray-600">
                    Choose a batch, farmer, bags, and subsidy discount, then verify with OTP.
                  </p>
                </div>

                <StockBatchPicker
                  batches={distributableStock}
                  selectedBatchId={distributionForm.batchId}
                  onSelect={(batchId) =>
                    setDistributionForm({ ...distributionForm, batchId: String(batchId) })
                  }
                  disabled={distributableStock.length === 0}
                  emptyMessage="Confirm incoming batches under Receive Fertilizer first."
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Farmer</label>
                    <select
                      value={distributionForm.farmer}
                      onChange={(e) =>
                        setDistributionForm({ ...distributionForm, farmer: e.target.value })
                      }
                      disabled={farmers.length === 0}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select farmer</option>
                      {farmers.map((farmer) => (
                        <option key={farmer.id} value={farmer.id}>
                          {farmer.name} ({farmer.ministryId})
                          {farmer.phone ? ` — ${farmer.phone}` : ' — no phone'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Bags</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="Bags"
                      value={distributionForm.bags}
                      onChange={(e) =>
                        setDistributionForm({ ...distributionForm, bags: e.target.value })
                      }
                      disabled={!distributionForm.batchId}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
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
                        value={distributionForm.discountPercent}
                        onChange={(e) =>
                          setDistributionForm({
                            ...distributionForm,
                            discountPercent: Math.min(
                              100,
                              Math.max(0, Number(e.target.value) || 0)
                            ),
                          })
                        }
                        className="min-w-0 flex-1 rounded-lg border-0 bg-transparent px-4 py-3 text-gray-900"
                      />
                      <span className="pr-4 text-sm font-medium text-gray-600">% off</span>
                    </div>
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
                    if (!distributionForm.farmer || !distributionForm.bags || !distributionForm.batchId) return;
                    const selectedFarmer = farmers.find(
                      (farmer) => farmer.id === Number(distributionForm.farmer)
                    );
                    if (!farmerHasValidPhone(selectedFarmer)) {
                      setStatusMessage(
                        'This farmer has no valid phone number. Update their number in Farmer Registry first.'
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
                        farmer_id: Number(distributionForm.farmer),
                        quantity_bags: Number(distributionForm.bags),
                        status: 'DISPATCHED',
                        ministry_verified: true,
                        discount_percent: Number(distributionForm.discountPercent) || 0,
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
                          setPendingFarmer(selectedFarmer || null);
                          setSmsInfo(sms);
                          setIsOtpOpen(true);
                          setDistributionForm({
                            batchId: '',
                            farmer: '',
                            bags: '',
                            discountPercent: 10,
                          });
                        },
                        onFailed: (message) => setStatusMessage(message),
                      });
                      if (!smsOk) {
                        setStatusMessage(
                          (current) =>
                            current ||
                            'Distribution saved but the verification code could not be sent. Use Verify Distribution to resend.'
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
                  disabled={isSaving}
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
                      <div key={dist.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-4">
                        <div>
                          <p className="font-semibold text-gray-900">{dist.farmer}</p>
                          <p className="text-sm text-gray-600">{dist.bags} bags • OTP {dist.otp}</p>
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
                <h2 className="text-xl font-bold text-gray-900 mb-1">Verify Distribution</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Resume the OTP flow for any distribution that hasn't been verified yet.
                </p>
                {verificationList.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
                    <ShieldCheck className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                    <p className="text-sm font-medium text-gray-700">
                      No distributions to verify yet
                    </p>
                  </div>
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
                                    const otpResponse = await sendOtp(record.id, {
                                      resend: true,
                                    });
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
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-gray-900">{record.farmer}</p>
                            {record.farmerMinistryId && (
                              <span className="text-xs text-gray-500">
                                ({record.farmerMinistryId})
                              </span>
                            )}
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                isVerified
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {isVerified ? 'Verified' : 'Pending'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {record.bags} bags
                            {record.batchCode ? ` • ${record.batchCode}` : ''}
                          </p>
                          <p className="text-xs text-gray-500">
                            Distribution #{record.id} • {record.date}
                          </p>
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
                {statusMessage && (
                  <p className="mt-3 text-sm text-red-600">{statusMessage}</p>
                )}
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
                title="AMCOS Analytics"
                subtitle="Fertilizer receipts, distributions, and verification progress."
                onExcel={(from, to) => {
                  const filtered = filterByDateRange(distributions, from, to);
                  exportAnalyticsCsv({
                    role: 'Cooperative (AMCOS)',
                    orgName: userProfile?.organization || userProfile?.name || '',
                    filename: 'amcos_analytics',
                    summaryRows: [
                      { label: 'Batches Received', value: receivedBatches.length },
                      { label: 'Distributions Made', value: filtered.length },
                      { label: 'Verified Records', value: verificationList.filter((i) => i.status === 'verified').length },
                      { label: 'Registered Farmers', value: farmers?.length || 0 },
                    ],
                    tableHeaders: ['Date', 'Farmer', 'Phone', 'Product', 'Bags', 'OTP Status'],
                    tableData: filtered.map((d) => [d.date, d.farmer || '—', d.farmerPhone || '—', d.product || '—', d.bags ?? '—', d.status || '—']),
                  });
                }}
                onPdf={(from, to) => {
                  const filtered = filterByDateRange(distributions, from, to);
                  exportAnalyticsPdf({
                    role: 'Cooperative (AMCOS)',
                    orgName: userProfile?.organization || userProfile?.name || '',
                    title: 'AMCOS Analytics Report',
                    subtitle: from || to ? `Period: ${from || '…'} to ${to || 'today'}` : 'Fertilizer receipts, farmer distributions & verification',
                    summaryRows: [
                      { label: 'Batches Received', value: receivedBatches.length },
                      { label: 'Distributions Made', value: filtered.length },
                      { label: 'Verified Records', value: verificationList.filter((i) => i.status === 'verified').length },
                      { label: 'Pending Verification', value: verificationList.filter((i) => i.status !== 'verified').length },
                      { label: 'Registered Farmers', value: farmers?.length || 0 },
                    ],
                    tableHeaders: ['Date', 'Farmer', 'Phone', 'Product', 'Bags', 'OTP Status'],
                    tableData: filtered.map((d) => [d.date, d.farmer || '—', d.farmerPhone || '—', d.product || '—', d.bags ?? '—', d.status || '—']),
                  });
                }}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Receipts</p>
                  <p className="text-2xl font-bold text-gray-900">{receivedBatches.length}</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Distributions</p>
                  <p className="text-2xl font-bold text-gray-900">{distributions.length}</p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Verified Records</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {verificationList.filter((item) => item.status === 'verified').length}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-700">Verification Trend</p>
                    <p className="text-xs text-gray-500">Verified vs pending bags by month</p>
                  </div>
                  <div className="h-56">
                    {!hasVerificationTrend ? (
                      <div className="flex h-full items-center justify-center text-sm text-gray-500">
                        No verification activity yet.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={verificationTrend} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                          <XAxis dataKey="month" stroke="#6b7280" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} stroke="#6b7280" tick={{ fontSize: 12 }} />
                          <Tooltip
                            formatter={(value, name) => [`${value} bags`, name === 'verified' ? 'Verified' : 'Pending']}
                            labelFormatter={(label) => `Month: ${label}`}
                          />
                          <Legend formatter={(value) => (value === 'verified' ? 'Verified' : 'Pending')} />
                          <Bar dataKey="verified" stackId="bags" fill="#16a34a" name="verified" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="pending" stackId="bags" fill="#f59e0b" name="pending" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Verification Mix</p>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={distributionMix} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={4}>
                          {distributionMix.map((entry) => (
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
              setLatestVerification(result.verification);
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
