import { Package, Leaf, Scale, CheckCircle, AlertCircle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useState } from 'react';
import { ProductionBalance } from './production-balance';
import { TrustSeal } from './trust-seal';
import { SyncPulse } from './sync-pulse';
import { useLanguage } from './language-context';

const productionData = [
  { month: 'Jul', production: 4200, quality: 92, id: 'jul' },
  { month: 'Aug', production: 5800, quality: 94, id: 'aug' },
  { month: 'Sep', production: 7200, quality: 91, id: 'sep' },
  { month: 'Oct', production: 8900, quality: 95, id: 'oct' },
  { month: 'Nov', production: 10500, quality: 93, id: 'nov' },
  { month: 'Dec', production: 9800, quality: 94, id: 'dec' },
  { month: 'Jan', production: 8200, quality: 92, id: 'jan' },
];

export function Dashboard() {
  const { t, language } = useLanguage();
  const [kilograms, setKilograms] = useState('');
  const [bags, setBags] = useState('');
  const [submittedRecords, setSubmittedRecords] = useState([]);

  const handleCommitToLedger = () => {
    if (!kilograms || !bags) {
      alert(language === 'en' ? 'Please fill in all fields' : 'Tafadhali jaza sehemu zote');
      return;
    }

    const newRecord = {
      id: `REC-${Date.now()}`,
      kilograms,
      bags,
      timestamp: new Date().toLocaleString(),
      verificationId: `VRF-${Date.now().toString().slice(-8)}`,
      status: 'committed',
    };

    setSubmittedRecords([newRecord, ...submittedRecords]);
    alert(`${language === 'en' ? 'Record committed to ledger!' : 'Kumbukumbu imewasilishwa kwa daftari!'}\n${language === 'en' ? 'Verification ID' : 'Nambari ya Uthibitisho'}: ${newRecord.verificationId}`);
    setKilograms('');
    setBags('');
  };

  const stats = [
    {
      title: t('activeFarmers'),
      value: '342',
      change: language === 'en' ? '+12 this month' : '+12 mwezi huu',
    },
    {
      title: t('totalProduction'),
      value: '54,700 kg',
      change: language === 'en' ? '+18% from last season' : '+18% kutoka msimu uliopita',
    },
    {
      title: language === 'en' ? 'Fertilizer Distributed' : 'Mbolea Iliyogawanywa',
      value: '1,247 bags',
      change: language === 'en' ? '89% utilization' : '89% matumizi',
    },
    {
      title: language === 'en' ? 'Coffee Collected' : 'Kahawa Iliyokusanywa',
      value: '54,700 kg',
      change: language === 'en' ? 'Average 98% compliance' : 'wastani 98% kufuata',
    },
  ];

  const recentTransactions = [
    { id: 'TX-2401', type: language === 'en' ? 'Coffee Collection' : 'Ukusanyaji wa Kahawa', farmer: 'John Kamau', amount: '120 kg', status: 'verified', verificationId: 'VRF-24012401' },
    { id: 'TX-2402', type: language === 'en' ? 'Fertilizer Dist.' : 'Usambazaji wa Mbolea', farmer: 'Mary Wanjiku', amount: '5 bags', status: 'verified', verificationId: 'VRF-24022402' },
    { id: 'TX-2403', type: language === 'en' ? 'Coffee Collection' : 'Ukusanyaji wa Kahawa', farmer: 'Peter Ochieng', amount: '95 kg', status: 'verified', verificationId: 'VRF-24032403' },
    { id: 'TX-2404', type: language === 'en' ? 'Fertilizer Dist.' : 'Usambazaji wa Mbolea', farmer: 'Grace Akinyi', amount: '3 bags', status: 'pending', verificationId: 'VRF-24042404' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {t('dashboard')} {language === 'en' ? 'Overview' : '- Muhtasari'}
        </h2>
        <p className="text-gray-600 mt-1">
          {language === 'en' 
            ? 'Monitor cooperative performance and data integrity' 
            : 'Fuatilia utendaji wa ushirika na uadilifu wa data'
          }
        </p>
      </div>

      {/* Production Balance Widget */}
      <ProductionBalance fertilizerBags={500} coffeeKg={22500} />

      {/* Collection & Distribution Portal */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold">Collection & Distribution Portal</h3>
          <p className="text-sm text-gray-600 mt-1">Record coffee collection and input distribution data</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Kilograms Collected */}
          <div>
            <label className="block mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Leaf className="h-5 w-5 text-green-600" />
                <span className="font-medium text-gray-900">Kilograms Collected</span>
              </div>
              <input
                type="number"
                value={kilograms}
                onChange={(e) => setKilograms(e.target.value)}
                placeholder="Enter total kg collected"
                className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </label>
            <p className="text-sm text-gray-500 mt-2">Total coffee collected from farmers (kg)</p>
          </div>

          {/* Bags Distributed */}
          <div>
            <label className="block mb-3">
              <div className="flex items-center gap-2 mb-2">
                <Package className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-gray-900">Bags Distributed</span>
              </div>
              <input
                type="number"
                value={bags}
                onChange={(e) => setBags(e.target.value)}
                placeholder="Enter number of bags"
                className="w-full px-4 py-4 text-lg border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </label>
            <p className="text-sm text-gray-500 mt-2">Fertilizer/input bags distributed to farmers</p>
          </div>
        </div>

        <button
          onClick={handleCommitToLedger}
          className="w-full px-6 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-lg flex items-center justify-center gap-2"
        >
          <Scale className="h-5 w-5" />
          Commit to Ledger
        </button>
      </div>

      {/* Submitted Records */}
      {submittedRecords.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">Recently Committed Records</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {submittedRecords.map((record) => (
              <div key={record.id} className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">{record.id}</span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3" />
                      {record.status}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">{record.timestamp}</span>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs text-gray-600">Coffee Collected</p>
                    <p className="text-sm font-medium text-gray-900">{record.kilograms} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Bags Distributed</p>
                    <p className="text-sm font-medium text-gray-900">{record.bags} bags</p>
                  </div>
                </div>
                <TrustSeal
                  recordId={record.id}
                  timestamp={record.timestamp}
                  verifiedBy="Kagera Office & TCB"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-lg shadow p-6 border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">{stat.title}</p>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-xs text-gray-600 mt-2">{stat.change}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Production Trend - spans 3 columns */}
        <div className="lg:col-span-3 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Production Trend (kg)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={productionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="production" stroke="#16a34a" strokeWidth={2} name="Production" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Synchronization Pulse */}
        <SyncPulse />
      </div>

      {/* Recent Ledger Records */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            {language === 'en' ? 'Recent Ledger Records' : 'Kumbukumbu za Hivi Karibuni'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Record ID' : 'Nambari'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Type' : 'Aina'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Farmer' : 'Mkulima'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Amount' : 'Kiasi'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Status' : 'Hali'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Verification' : 'Uthibitisho'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{tx.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{tx.type}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{tx.farmer}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{tx.amount}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        tx.status === 'verified'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {tx.status === 'verified' ? (
                        <CheckCircle className="h-3 w-3" />
                      ) : (
                        <AlertCircle className="h-3 w-3" />
                      )}
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-600">{tx.verificationId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}