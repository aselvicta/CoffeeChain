import { useEffect, useMemo, useState } from 'react';
import { Package, Users, Send, History, LogOut, TrendingUp, ShieldCheck } from 'lucide-react';
import { NotificationBell } from './notification-bell';
import { useNotifications } from '../hooks/use-notifications';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Logo } from './logo';
import { FarmerOTPModal } from './farmer-otp-modal';
import { ReceiveFertilizerPanel } from './receive-fertilizer-panel';
import { RetailerSalePanel } from './retailer-sale-panel';
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

export function RetailerDashboard({ userProfile, onLogout }) {
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
  const [otpMessage, setOtpMessage] = useState('');
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
  } = useNotifications();

  const distributionTrends = [
    { week: 'W1', bags: 18, verified: 12 },
    { week: 'W2', bags: 24, verified: 19 },
    { week: 'W3', bags: 30, verified: 25 },
  ];

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

  const recentCustomers = useMemo(() => {
    const seen = new Map();
    distributions.forEach((dist) => {
      const key = dist.farmerMinistryId || dist.farmer;
      if (!key || seen.has(key)) return;
      seen.set(key, {
        name: dist.farmer,
        ministryId: dist.farmerMinistryId,
        phone: dist.farmerPhone,
        lastDiscount: dist.discountPercent,
      });
    });
    return Array.from(seen.values());
  }, [distributions]);

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
      setStatusMessage(error.message);
    }
  };

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
            { id: 'customers', label: 'Recent Customers', icon: Users },
            { id: 'verification', label: 'Verify Distribution', icon: ShieldCheck },
            { id: 'history', label: 'History', icon: History },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp },
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
                onNavigateTab={(tab) => {
                  const tabMap = {
                    receive: 'receive',
                    distribute: 'distribute',
                    verification: 'verification',
                  };
                  setActiveTab(tabMap[tab] || tab);
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
                    label: 'Recent Customers',
                    value: `${recentCustomers.length}`,
                    change: 'Buyers at this shop',
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
                    onClick={() => setActiveTab('receive')}
                  />
                  <QuickActionCard
                    icon={Send}
                    tone="green"
                    title="Point of Sale"
                    description="Ministry ID discount or walk-in"
                    onClick={() => setActiveTab('distribute')}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Recent Customers</h2>
              <p className="text-sm text-gray-600 mb-4">
                Customers appear here after a sale. Retailers do not register farmers — use
                Ministry ID or walk-in at point of sale.
              </p>
              {recentCustomers.length === 0 ? (
                <p className="text-sm text-gray-500">No sales recorded yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recentCustomers.map((customer) => (
                    <div key={customer.ministryId} className="border border-gray-200 rounded-lg p-4">
                      <p className="font-semibold text-gray-900">{customer.name}</p>
                      <p className="text-sm text-gray-600">{customer.ministryId}</p>
                      <p className="text-sm text-gray-500">{customer.phone}</p>
                      {customer.lastDiscount > 0 ? (
                        <p className="text-xs text-emerald-700 mt-2 font-medium">
                          Last sale: {customer.lastDiscount}% discount applied
                        </p>
                      ) : (
                        <p className="text-xs text-gray-500 mt-2">Walk-in / no subsidy</p>
                      )}
                    </div>
                  ))}
                </div>
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
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Complete sale</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Select stock and bag count, then send OTP to the customer&apos;s phone.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <select
                    value={distributionForm.batchId}
                    onChange={(e) =>
                      setDistributionForm({ ...distributionForm, batchId: e.target.value })
                    }
                    disabled={distributableStock.length === 0}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
                  >
                    <option value="">Select Batch</option>
                    {distributableStock.map((batch) => (
                      <option key={batch.batchId} value={batch.batchId}>
                        {batch.batchCode || `Batch ${batch.batchId}`} ({batch.bagsAvailable} bags
                        {batch.fertilizerType ? ` • ${batch.fertilizerType}` : ''})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    placeholder="Bags"
                    value={distributionForm.bags}
                    onChange={(e) => setDistributionForm({ ...distributionForm, bags: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
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
                          setOtpMessage(sms.message || '');
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
                            'Sale was saved but Briq OTP failed. Open Verify Distribution to resend.'
                        );
                      }
                      await refreshData();
                    } catch (error) {
                      setStatusMessage(error.message);
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
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Distributions</h3>
                <div className="space-y-3">
                  {distributions.length === 0 ? (
                    <p className="text-sm text-gray-500">No distributions yet.</p>
                  ) : (
                    distributions.map((dist) => (
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
                  <div className="space-y-3">
                    {verificationList.map((record) => {
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
                                        setOtpMessage(sms.message || '');
                                        setSmsInfo(sms);
                                        setIsOtpOpen(true);
                                      },
                                      onFailed: (message) => setStatusMessage(message),
                                    });
                                  } catch (error) {
                                    setStatusMessage(error.message);
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
              <h2 className="text-xl font-bold text-gray-900">Retailer Analytics</h2>
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
