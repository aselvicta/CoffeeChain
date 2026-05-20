import { useEffect, useMemo, useState } from 'react';
import { Package, Users, Send, History, LogOut, TrendingUp, ShieldCheck } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Logo } from './logo';
import { FarmerOTPModal } from './farmer-otp-modal';
import {
  createTransfer,
  fetchFarmers,
  fetchTransfers,
  receiveTransfer,
  sendOtp,
  uploadProof,
  verifyOtp,
} from '../api/client';

export function CooperativeDashboard({ userProfile, onLogout }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [receiveForm, setReceiveForm] = useState({ batchId: '' });
  const [receivedBatches, setReceivedBatches] = useState([]);
  const [distributionForm, setDistributionForm] = useState({ batchId: '', farmer: '', bags: '', otp: '' });
  const [proofFile, setProofFile] = useState(null);
  const [distributions, setDistributions] = useState([]);
  const [verificationList, setVerificationList] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [pendingTransfer, setPendingTransfer] = useState(null);
  const [pendingFarmer, setPendingFarmer] = useState(null);
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [otpMessage, setOtpMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
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
      setReceivedBatches(
        inbound.map((transfer) => ({
          id: transfer.id,
          batchId: transfer.batch?.id,
          batchCode: transfer.batch?.batch_code,
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
          bags: transfer.quantity_bags,
          otp: transfer.status === 'VERIFIED' ? 'Verified' : 'Pending',
          date: transfer.created_at?.slice(0, 10),
        }))
      );
      setVerificationList(
        outbound.map((transfer) => ({
          id: transfer.id,
          farmer: transfer.farmer?.name || 'Farmer',
          bags: transfer.quantity_bags,
          status: transfer.status === 'VERIFIED' ? 'verified' : 'pending',
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
        <main className="flex-1 overflow-y-auto p-8">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                  { label: 'Member Farmers', value: `${farmers.length}`, change: 'Active members', icon: Users },
                  { label: 'Fertilizer Stock', value: `${receivedBatches.reduce((sum, batch) => sum + batch.bags, 0)} bags`, change: 'Available', icon: Package },
                  { label: 'Distributed Today', value: `${distributions.length}`, change: 'Farmer deliveries', icon: Send },
                  { label: 'Distributions Verified', value: `${verificationList.filter((item) => item.status === 'verified').length}`, change: 'This week', icon: ShieldCheck },
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
                  <button className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                    <Send className="h-5 w-5 text-green-700" />
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">Distribute Fertilizer</p>
                      <p className="text-sm text-gray-600">Give to farmers with OTP</p>
                    </div>
                  </button>
                  <button className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors">
                    <ShieldCheck className="h-5 w-5 text-amber-700" />
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">Verify Distribution</p>
                      <p className="text-sm text-gray-600">Confirm issued fertilizer batches</p>
                    </div>
                  </button>
                  <button className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                    <Users className="h-5 w-5 text-blue-700" />
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">Farmer Registry</p>
                      <p className="text-sm text-gray-600">View member farmers</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'farmers' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Farmer Registry</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {farmers.map((farmer) => (
                  <div key={farmer.id} className="border border-gray-200 rounded-lg p-4">
                    <p className="font-semibold text-gray-900">{farmer.name}</p>
                    <p className="text-sm text-gray-600">{farmer.village}</p>
                    <p className="text-sm text-gray-500">{farmer.phone}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'fertilizer-in' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Receive Fertilizer</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Transfer ID"
                    value={receiveForm.batchId}
                    onChange={(e) => setReceiveForm({ ...receiveForm, batchId: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={async () => {
                    if (!receiveForm.batchId) return;
                    setIsSaving(true);
                    setStatusMessage('');
                    try {
                      await receiveTransfer(receiveForm.batchId);
                      await refreshData();
                      setReceiveForm({ batchId: '' });
                    } catch (error) {
                      setStatusMessage(error.message);
                    } finally {
                      setIsSaving(false);
                    }
                  }}
                  className="mt-4 bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  {isSaving ? 'Recording...' : 'Record Receipt'}
                </button>
                {statusMessage && <p className="mt-3 text-sm text-red-600">{statusMessage}</p>}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Receipts</h3>
                <div className="space-y-3">
                  {receivedBatches.map((batch) => (
                    <div key={batch.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-4">
                      <div>
                        <p className="font-semibold text-gray-900">{batch.id}</p>
                        <p className="text-sm text-gray-600">{batch.source} • {batch.bags} bags</p>
                      </div>
                      <span className="text-sm text-gray-500">{batch.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fertilizer-out' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Distribute Fertilizer</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <select
                    value={distributionForm.batchId}
                    onChange={(e) =>
                      setDistributionForm({ ...distributionForm, batchId: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select Batch</option>
                    {receivedBatches.map((batch) => (
                      <option key={batch.id} value={batch.batchId}>
                        {batch.batchCode || `Batch ${batch.id}`} ({batch.bags} bags)
                      </option>
                    ))}
                  </select>
                  <select
                    value={distributionForm.farmer}
                    onChange={(e) => setDistributionForm({ ...distributionForm, farmer: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Verify Distribution</h2>
              <div className="space-y-3">
                {verificationList.map((record) => (
                  <div key={record.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-4">
                    <div>
                      <p className="font-semibold text-gray-900">{record.farmer}</p>
                      <p className="text-sm text-gray-600">{record.bags} bags • {record.id}</p>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        record.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {record.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Transaction History</h2>
              <div className="space-y-3">
                {[
                  ...receivedBatches.map((batch) => ({
                    id: batch.id,
                    type: 'Receipt',
                    detail: `${batch.source} • ${batch.bags} bags`,
                    date: batch.date,
                  })),
                  ...distributions.map((dist) => ({
                    id: dist.id,
                    type: 'Distribution',
                    detail: `${dist.farmer} • ${dist.bags} bags • OTP ${dist.otp}`,
                    date: dist.date,
                  })),
                ].map((record) => (
                  <div key={record.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-4">
                    <div>
                      <p className="font-semibold text-gray-900">{record.type}: {record.id}</p>
                      <p className="text-sm text-gray-600">{record.detail}</p>
                    </div>
                    <span className="text-sm text-gray-500">{record.date}</span>
                  </div>
                ))}
              </div>
            </div>
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
            await verifyOtp(pendingTransfer.id, code);
          }}
          onResend={async () => {
            const response = await sendOtp(pendingTransfer.id);
            setOtpMessage(response.sms?.message || '');
          }}
          farmerName={pendingFarmer?.name || 'Farmer'}
          farmerId={pendingFarmer?.ministryId || ''}
          smsMessage={otpMessage}
          distributionData={{
            bagsGiven: pendingTransfer.quantity_bags,
            fertilizerType: pendingTransfer.batch?.fertilizer_type || 'Fertilizer',
          }}
        />
      )}
    </div>
  );
}
