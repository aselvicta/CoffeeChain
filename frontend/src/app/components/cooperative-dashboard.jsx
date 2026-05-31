import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Package, Users, Send, History, LogOut, TrendingUp, ShieldCheck } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Logo } from './logo';
import { NotificationPanel } from './notification-panel';
import { FarmerOTPModal } from './farmer-otp-modal';
import { FarmerRegistryPanel } from './farmer-registry-panel';
import { ReceiveFertilizerPanel } from './receive-fertilizer-panel';
import { CooperativeHistoryPanel } from './cooperative-history-panel';
import { VerificationTrustSeal } from './verification-trust-seal';
import {
  createTransfer,
  fetchFarmers,
  fetchNotifications,
  fetchTransfers,
  sendOtp,
  uploadProof,
  verifyOtp,
} from '../api/client';

export function CooperativeDashboard({ userProfile, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [inboundTransfers, setInboundTransfers] = useState([]);
  const [distributionForm, setDistributionForm] = useState({ batchId: '', farmer: '', bags: '', otp: '' });
  const [proofFile, setProofFile] = useState(null);
  const [distributions, setDistributions] = useState([]);
  const [verificationList, setVerificationList] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [pendingTransfer, setPendingTransfer] = useState(null);
  const [pendingFarmer, setPendingFarmer] = useState(null);
  const [selectedReceiveTransferId, setSelectedReceiveTransferId] = useState('');
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [smsInfo, setSmsInfo] = useState(null);
  const [latestVerification, setLatestVerification] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState([]);
  const autoOpenedNotifications = useRef(false);
  const verificationTrend = [
    { month: 'Jan', verified: 32, pending: 12 },
    { month: 'Feb', verified: 45, pending: 10 },
    { month: 'Mar', verified: 58, pending: 8 },
  ];
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

  const unreadNotificationCount = notifications.filter((notification) => !readNotificationIds.includes(notification.id)).length;

  const refreshData = async () => {
    try {
      const [farmerData, transferData] = await Promise.all([
        fetchFarmers(),
        fetchTransfers(),
      ]);
      const notificationData = await fetchNotifications();
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
      setNotifications(notificationData);
      if (notificationData.some((notification) => notification.type === 'dispatch') && !autoOpenedNotifications.current) {
        setIsNotificationsOpen(true);
        autoOpenedNotifications.current = true;
      }

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
    } catch (error) {
      setStatusMessage(error.message);
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
              <h1 className="text-2xl font-bold text-gray-900">AMCOS Dashboard</h1>
              <p className="text-sm text-gray-600">{userProfile.organization} - {userProfile.village}</p>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab('fertilizer-out')}
                    className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left"
                  >
                    <Send className="h-5 w-5 text-green-700" />
                    <div>
                      <p className="font-semibold text-gray-900">Distribute Fertilizer</p>
                      <p className="text-sm text-gray-600">Give to farmers with OTP</p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('fertilizer-in')}
                    className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors text-left"
                  >
                    <Package className="h-5 w-5 text-amber-700" />
                    <div>
                      <p className="font-semibold text-gray-900">Receive Fertilizer</p>
                      <p className="text-sm text-gray-600">
                        {pendingReceiptCount > 0
                          ? `${pendingReceiptCount} pending receipt${pendingReceiptCount === 1 ? '' : 's'}`
                          : 'Confirm incoming batches'}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('farmers')}
                    className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-left"
                  >
                    <Users className="h-5 w-5 text-blue-700" />
                    <div>
                      <p className="font-semibold text-gray-900">Farmer Registry</p>
                      <p className="text-sm text-gray-600">Register and view farmers</p>
                    </div>
                  </button>
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
                    Go to <button type="button" onClick={() => setActiveTab('fertilizer-in')} className="font-semibold underline">Receive Fertilizer</button> to confirm incoming batches before distributing.
                  </p>
                </div>
              )}
              {farmers.length === 0 && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm font-medium text-blue-800">
                    No farmers registered with this AMCOS.
                  </p>
                  <p className="text-xs text-blue-700">
                    Go to <button type="button" onClick={() => setActiveTab('farmers')} className="font-semibold underline">Farmer Registry</button> to register farmers from the Ministry registry.
                  </p>
                </div>
              )}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Distribute Fertilizer</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Select a confirmed batch, choose a registered farmer, then send an OTP to verify delivery.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select
                    value={distributionForm.batchId}
                    onChange={(e) =>
                      setDistributionForm({ ...distributionForm, batchId: e.target.value })
                    }
                    disabled={distributableStock.length === 0}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Batch</option>
                    {distributableStock.map((batch) => (
                      <option key={batch.batchId} value={batch.batchId}>
                        {batch.batchCode || `Batch ${batch.batchId}`} ({batch.bagsAvailable} bags available{batch.fertilizerType ? ` • ${batch.fertilizerType}` : ''})
                      </option>
                    ))}
                  </select>
                  <select
                    value={distributionForm.farmer}
                    onChange={(e) => setDistributionForm({ ...distributionForm, farmer: e.target.value })}
                    disabled={farmers.length === 0}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Farmer</option>
                    {farmers.map((farmer) => (
                      <option key={farmer.id} value={farmer.id}>
                        {farmer.name} ({farmer.ministryId})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    placeholder="Bags"
                    value={distributionForm.bags}
                    onChange={(e) => setDistributionForm({ ...distributionForm, bags: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                <button
                  onClick={async () => {
                    if (!distributionForm.farmer || !distributionForm.bags || !distributionForm.batchId) return;
                    setIsSaving(true);
                    setStatusMessage('');
                    try {
                      const selectedFarmer = farmers.find(
                        (farmer) => farmer.id === Number(distributionForm.farmer)
                      );
                      const transfer = await createTransfer({
                        batch_id: Number(distributionForm.batchId),
                        transfer_type: 'BRANCH_TO_FARMER',
                        from_branch_id: userProfile.branchId,
                        farmer_id: Number(distributionForm.farmer),
                        quantity_bags: Number(distributionForm.bags),
                        status: 'DISPATCHED',
                      });
                      const otpResponse = await sendOtp(transfer.id);
                      if (proofFile) {
                        await uploadProof(transfer.id, proofFile);
                        setProofFile(null);
                      }
                      setPendingTransfer(transfer);
                      setPendingFarmer(selectedFarmer || null);
                      setOtpMessage(otpResponse.sms?.message || '');
                      setSmsInfo(otpResponse.sms || null);
                      setIsOtpOpen(true);
                      setDistributionForm({ batchId: '', farmer: '', bags: '', otp: '' });
                      await refreshData();
                    } catch (error) {
                      setStatusMessage(error.message);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="mt-4 bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  {isSaving ? 'Processing...' : 'Send Verification SMS'}
                </button>
                {statusMessage && <p className="mt-3 text-sm text-red-600">{statusMessage}</p>}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Distributions</h3>
                <div className="space-y-3">
                  {distributions.map((dist) => (
                    <div key={dist.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-4">
                      <div>
                        <p className="font-semibold text-gray-900">{dist.farmer}</p>
                        <p className="text-sm text-gray-600">{dist.bags} bags • OTP {dist.otp}</p>
                      </div>
                      <span className="text-sm text-gray-500">{dist.date}</span>
                    </div>
                  ))}
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
                  <div className="space-y-3">
                    {verificationList.map((record) => {
                      const isVerified = record.status === 'verified';
                      return (
                        <div
                          key={record.id}
                          className="flex flex-col gap-4 rounded-lg border border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-gray-900">{record.farmer}</p>
                              {record.farmerMinistryId && (
                                <span className="text-xs text-gray-500">
                                  ({record.farmerMinistryId})
                                </span>
                              )}
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-medium ${
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
                          </div>
                          {!isVerified && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  setStatusMessage('');
                                  const otpResponse = await sendOtp(record.id);
                                  setPendingTransfer(record.rawTransfer);
                                  setPendingFarmer({
                                    name: record.farmer,
                                    ministryId: record.farmerMinistryId,
                                  });
                                  setOtpMessage(otpResponse.sms?.message || '');
                                  setSmsInfo(otpResponse.sms || null);
                                  setIsOtpOpen(true);
                                } catch (error) {
                                  setStatusMessage(error.message);
                                }
                              }}
                              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                            >
                              <ShieldCheck className="h-4 w-4" />
                              Resend &amp; Verify OTP
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
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
              <h2 className="text-xl font-bold text-gray-900">AMCOS Analytics</h2>
              <p className="text-gray-600">Analyze fertilizer receipts, distributions, and verification progress.</p>
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
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700">Verification Trend</p>
                    <button className="text-sm font-medium text-green-700">Export Report</button>
                  </div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={verificationTrend}>
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="verified" stroke="#16a34a" strokeWidth={2} name="Verified" />
                        <Line type="monotone" dataKey="pending" stroke="#f59e0b" strokeWidth={2} name="Pending" />
                      </LineChart>
                    </ResponsiveContainer>
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
          onResend={async () => {
            const response = await sendOtp(pendingTransfer.id);
            setOtpMessage(response.sms?.message || '');
            setSmsInfo(response.sms || null);
          }}
          farmerName={pendingFarmer?.name || 'Farmer'}
          farmerId={pendingFarmer?.ministryId || ''}
          smsMessage={otpMessage}
          smsInfo={smsInfo}
          distributionData={{
            bagsGiven: pendingTransfer.quantity_bags,
            fertilizerType: pendingTransfer.batch?.fertilizer_type || 'Fertilizer',
          }}
        />
      )}
      {isNotificationsOpen && (
        <NotificationPanel
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          notifications={notifications.map((notification) => ({
            ...notification,
            unread: !readNotificationIds.includes(notification.id),
            actionLabel: notification.type === 'dispatch' ? 'View & Confirm' : notification.actionLabel,
          }))}
          unreadCount={unreadNotificationCount}
          onMarkRead={(notificationId) => {
            setReadNotificationIds((currentIds) =>
              currentIds.includes(notificationId) ? currentIds : [...currentIds, notificationId]
            );
          }}
          onMarkAllRead={() => setReadNotificationIds(notifications.map((notification) => notification.id))}
          onOpenDispatch={(transferId) => {
            if (transferId) {
              setActiveTab('fertilizer-in');
              setSelectedReceiveTransferId(String(transferId));
              setIsNotificationsOpen(false);
            }
          }}
        />
      )}
    </div>
  );
}
