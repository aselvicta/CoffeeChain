import { ChevronDown, ChevronRight, MapPin, Shield } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useState } from 'react';
import { ProductionBalance } from './production-balance';
import { TrustSeal } from './trust-seal';
import { SyncPulse } from './sync-pulse';
import { useLanguage } from './language-context';

const regionalData = [
  { region: 'Kagera', production: 52100, fertilizer: 1880, cooperatives: 5, compliance: 97 },
  { region: 'Kilimanjaro', production: 48500, fertilizer: 1750, cooperatives: 7, compliance: 95 },
  { region: 'Mbeya', production: 42800, fertilizer: 1500, cooperatives: 6, compliance: 93 },
  { region: 'Mwanza', production: 35200, fertilizer: 1200, cooperatives: 4, compliance: 91 },
  { region: 'Arusha', production: 38900, fertilizer: 1350, cooperatives: 5, compliance: 94 },
  { region: 'Ruvuma', production: 29600, fertilizer: 1000, cooperatives: 4, compliance: 89 }
];

const monthlyTrend = [
  { month: 'Aug 2025', total: 195000 },
  { month: 'Sep 2025', total: 208500 },
  { month: 'Oct 2025', total: 225200 },
  { month: 'Nov 2025', total: 232800 },
  { month: 'Dec 2025', total: 228900 },
  { month: 'Jan 2026', total: 247100 }
];

export function NationalDashboard({ userProfile }) {
  const { t, language } = useLanguage();
  const [expandedBatch, setExpandedBatch] = useState(null);
  const [showPrivacyMode, setShowPrivacyMode] = useState(true);
  
  const isAdmin = userProfile?.isAdmin || userProfile?.username === 'national_admin';

  const [masterLedger, setMasterLedger] = useState([
    {
      id: 'TCB-KGR-2026-001',
      fertilizerType: 'NPK 20-10-10',
      totalBags: 500,
      status: 'distributed',
      injectedDate: '2026-02-18',
      verificationId: 'VRF-20260218',
      regions: [
        {
          name: 'Kagera',
          bags: 500,
          amcos: [
            { name: 'Bukoba AMCOS', bags: 200, status: 'distributed' },
            { name: 'Ngara AMCOS', bags: 300, status: 'distributed' }
          ]
        }
      ]
    },
    {
      id: 'TCB-KGR-2026-002',
      fertilizerType: 'DAP',
      totalBags: 300,
      status: 'distributed',
      injectedDate: '2026-02-15',
      verificationId: 'VRF-20260215',
      regions: [
        {
          name: 'Kagera',
          bags: 300,
          amcos: [
            { name: 'Karagwe AMCOS', bags: 150, status: 'distributed' },
            { name: 'Muleba AMCOS', bags: 150, status: 'distributed' }
          ]
        }
      ]
    },
    {
      id: 'TCB-KIL-2026-001',
      fertilizerType: 'Urea',
      totalBags: 450,
      status: 'in-transit',
      injectedDate: '2026-02-20',
      verificationId: 'VRF-20260220',
      regions: [
        {
          name: 'Kilimanjaro',
          bags: 450,
          amcos: [
            { name: 'Moshi AMCOS', bags: 250, status: 'in-transit' },
            { name: 'Hai AMCOS', bags: 200, status: 'in-transit' }
          ]
        }
      ]
    }
  ]);

  const totalProduction = regionalData.reduce((sum, r) => sum + r.production, 0);
  const totalFertilizer = regionalData.reduce((sum, r) => sum + r.fertilizer, 0);
  const totalCooperatives = regionalData.reduce((sum, r) => sum + r.cooperatives, 0);
  const averageCompliance = Math.round(regionalData.reduce((sum, r) => sum + r.compliance, 0) / regionalData.length);

  const toggleBatchExpansion = (batchId) => {
    setExpandedBatch(expandedBatch === batchId ? null : batchId);
  };

  const maskSensitiveData = (text) => {
    if (!showPrivacyMode || !isAdmin) return text;
    // Mask parts of the text for privacy
    return text.replace(/(\d{3})/g, '***');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {t('dashboard')} - {t('nationalLevel')}
          </h2>
          <p className="text-gray-600 mt-1">
            {language === 'en' 
              ? 'Tanzania Coffee Board - National Overview' 
              : 'Bodi ya Kahawa Tanzania - Muhtasari wa Taifa'}
          </p>
        </div>
        
        {/* Privacy Mode Toggle (Admin Only) */}
        {isAdmin && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              {language === 'en' ? 'Privacy Mode' : 'Hali ya Faragha'}:
            </span>
            <button
              onClick={() => setShowPrivacyMode(!showPrivacyMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showPrivacyMode ? 'bg-purple-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showPrivacyMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm font-medium text-gray-900">
              {showPrivacyMode ? (language === 'en' ? 'ON' : 'IME') : (language === 'en' ? 'OFF' : 'IME')}
            </span>
          </div>
        )}
      </div>

      {/* Production Balance Widget */}
      <ProductionBalance fertilizerBags={totalFertilizer} coffeeKg={totalProduction} />

      {/* National Statistics */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">{t('totalRegions')}</p>
          <p className="text-3xl font-bold text-gray-900">{regionalData.length}</p>
          <p className="text-xs text-gray-600 mt-1">
            {language === 'en' ? 'Active regions' : 'Mikoa hai'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">{t('totalCooperatives')}</p>
          <p className="text-3xl font-bold text-gray-900">{totalCooperatives}</p>
          <p className="text-xs text-gray-600 mt-1">
            {language === 'en' ? 'AMCOS nationwide' : 'AMCOS nchi nzima'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">{t('totalProduction')}</p>
          <p className="text-3xl font-bold text-gray-900">{(totalProduction / 1000).toFixed(1)}t</p>
          <p className="text-xs text-gray-600 mt-1">
            {language === 'en' ? 'Coffee collected' : 'Kahawa iliyokusanywa'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'en' ? 'Fertilizer Distributed' : 'Mbolea Iliyogawanywa'}
          </p>
          <p className="text-3xl font-bold text-gray-900">{totalFertilizer.toLocaleString()}</p>
          <p className="text-xs text-gray-600 mt-1">
            {language === 'en' ? 'Total bags' : 'Jumla mifuko'}
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Master Ledger */}
        <div className="col-span-2 bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">{t('masterLedger')}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {language === 'en' 
                    ? 'All fertilizer batches with regional breakdown' 
                    : 'Makundi yote ya mbolea na mgawanyiko wa mikoa'}
                </p>
              </div>
              <Shield className="w-6 h-6 text-purple-600" />
            </div>
          </div>

          <div className="p-6 space-y-4">
            {masterLedger.map((batch) => (
              <div key={batch.id} className="border border-gray-200 rounded-lg">
                {/* Batch Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleBatchExpansion(batch.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-semibold text-gray-900 text-lg">{batch.id}</h4>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          batch.status === 'distributed' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {batch.status === 'distributed' 
                            ? (language === 'en' ? 'Distributed' : 'Imegawanywa')
                            : (language === 'en' ? 'In Transit' : 'Inaenda')
                          }
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs text-gray-500">{t('fertilizerType')}</p>
                          <p className="text-sm font-medium text-gray-900">{batch.fertilizerType}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">{t('totalBags')}</p>
                          <p className="text-sm font-medium text-gray-900">{batch.totalBags}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">
                            {language === 'en' ? 'Injected Date' : 'Tarehe ya Kuingiza'}
                          </p>
                          <p className="text-sm font-medium text-gray-900">{batch.injectedDate}</p>
                        </div>
                      </div>
                    </div>
                    
                    <button className="ml-4 p-1">
                      {expandedBatch === batch.id ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedBatch === batch.id && (
                  <div className="px-4 pb-4 border-t border-gray-200 bg-gray-50">
                    <div className="pt-4 space-y-3">
                      {batch.regions.map((region, regionIndex) => (
                        <div key={regionIndex} className="pl-4 border-l-2 border-purple-200">
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-4 h-4 text-purple-600" />
                            <span className="font-semibold text-purple-900">{region.name}</span>
                            <span className="text-sm text-gray-600">
                              ({region.bags} {language === 'en' ? 'bags' : 'mifuko'})
                            </span>
                          </div>
                          
                          <div className="space-y-2 ml-6">
                            {region.amcos.map((amcos, amcosIndex) => (
                              <div key={amcosIndex} className="flex items-center justify-between text-sm">
                                <span className="text-gray-700">└─ {amcos.name}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900">
                                    {amcos.bags} {language === 'en' ? 'bags' : 'mifuko'}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded text-xs ${
                                    amcos.status === 'distributed'
                                      ? 'bg-green-100 text-green-700'
                                      : 'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {amcos.status === 'distributed'
                                      ? (language === 'en' ? 'Distributed' : 'Imegawanywa')
                                      : (language === 'en' ? 'In Transit' : 'Inaenda')
                                    }
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-4">
                      <TrustSeal 
                        recordId={batch.id}
                        timestamp={batch.injectedDate}
                        verifiedBy="Tanzania Coffee Board"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sync Pulse */}
        <div>
          <SyncPulse />
        </div>
      </div>

      {/* Regional Performance Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            {language === 'en' ? 'Regional Performance' : 'Utendaji wa Mikoa'}
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('region')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'AMCOS Count' : 'Idadi ya AMCOS'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Production (kg)' : 'Uzalishaji (kg)'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Fertilizer (bags)' : 'Mbolea (mifuko)'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Compliance Rate' : 'Kiwango cha Kufuata'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Status' : 'Hali'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {regionalData.map((region, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{region.region}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{region.cooperatives}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{region.production.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{region.fertilizer.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                        <div 
                          className={`h-2 rounded-full ${
                            region.compliance >= 95 ? 'bg-green-500' :
                            region.compliance >= 90 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${region.compliance}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-900">{region.compliance}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      region.compliance >= 90 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {region.compliance >= 90 
                        ? (language === 'en' ? 'Good' : 'Nzuri')
                        : (language === 'en' ? 'Review' : 'Kagua')
                      }
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* National Production Chart */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {language === 'en' ? 'Regional Production Overview' : 'Muhtasari wa Uzalishaji wa Mikoa'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={regionalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="region" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="production" fill="#16a34a" name={language === 'en' ? 'Coffee (kg)' : 'Kahawa (kg)'} />
              <Bar dataKey="fertilizer" fill="#7c3aed" name={language === 'en' ? 'Fertilizer (bags)' : 'Mbolea (mifuko)'} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {language === 'en' ? 'National Production Trend' : 'Mwelekeo wa Uzalishaji wa Taifa'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#7c3aed" 
                strokeWidth={3}
                name={language === 'en' ? 'Total Production (kg)' : 'Jumla Uzalishaji (kg)'}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}