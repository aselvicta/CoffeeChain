import { useState } from 'react';
import { MapPin, TrendingUp, Users, Package, Leaf, Eye, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useLanguage } from './language-context';

export function RegionalMonitoring() {
  const { t, language } = useLanguage();
  const [selectedRegion, setSelectedRegion] = useState('all');

  const regions = [
    {
      id: 'kagera',
      name: 'Kagera',
      amcosCount: 5,
      production: 52100,
      fertilizer: 1880,
      compliance: 97,
      status: 'healthy',
      pendingValidations: 3,
      flaggedIssues: 1,
      activeUsers: 8
    },
    {
      id: 'kilimanjaro',
      name: 'Kilimanjaro',
      amcosCount: 7,
      production: 48500,
      fertilizer: 1750,
      compliance: 95,
      status: 'healthy',
      pendingValidations: 5,
      flaggedIssues: 2,
      activeUsers: 12
    },
    {
      id: 'mbeya',
      name: 'Mbeya',
      amcosCount: 6,
      production: 42800,
      fertilizer: 1500,
      compliance: 93,
      status: 'healthy',
      pendingValidations: 2,
      flaggedIssues: 0,
      activeUsers: 10
    },
    {
      id: 'mwanza',
      name: 'Mwanza',
      amcosCount: 4,
      production: 35200,
      fertilizer: 1200,
      compliance: 91,
      status: 'warning',
      pendingValidations: 8,
      flaggedIssues: 3,
      activeUsers: 7
    },
    {
      id: 'arusha',
      name: 'Arusha',
      amcosCount: 5,
      production: 38900,
      fertilizer: 1350,
      compliance: 94,
      status: 'healthy',
      pendingValidations: 4,
      flaggedIssues: 1,
      activeUsers: 9
    },
    {
      id: 'ruvuma',
      name: 'Ruvuma',
      amcosCount: 4,
      production: 29600,
      fertilizer: 1000,
      compliance: 89,
      status: 'warning',
      pendingValidations: 6,
      flaggedIssues: 4,
      activeUsers: 6
    }
  ];

  const weeklyActivity = [
    { day: 'Mon', batches: 12, validations: 45, issues: 2 },
    { day: 'Tue', batches: 15, validations: 52, issues: 3 },
    { day: 'Wed', batches: 18, validations: 61, issues: 1 },
    { day: 'Thu', batches: 14, validations: 48, issues: 4 },
    { day: 'Fri', batches: 20, validations: 55, issues: 2 },
    { day: 'Sat', batches: 8, validations: 28, issues: 1 },
    { day: 'Sun', batches: 5, validations: 15, issues: 0 }
  ];

  const recentActivities = [
    {
      id: 'ACT-001',
      region: 'Kagera',
      activity: language === 'en' ? 'Batch Verified' : 'Kundi Limethibitishwa',
      details: 'TCB-KGR-2026-005 verified by Emmanuel Mbwana',
      timestamp: '2026-02-23 11:20',
      type: 'verify',
      status: 'success'
    },
    {
      id: 'ACT-002',
      region: 'Kilimanjaro',
      activity: language === 'en' ? 'Data Validated' : 'Data Imethibitishwa',
      details: 'Coffee collection approved: 1,200 kg',
      timestamp: '2026-02-23 10:45',
      type: 'validate',
      status: 'success'
    },
    {
      id: 'ACT-003',
      region: 'Mwanza',
      activity: language === 'en' ? 'Issue Flagged' : 'Tatizo Limewekwa Alama',
      details: 'Low yield reported: 60% compliance',
      timestamp: '2026-02-23 09:30',
      type: 'flag',
      status: 'warning'
    },
    {
      id: 'ACT-004',
      region: 'Arusha',
      activity: language === 'en' ? 'Batch Dispatched' : 'Kundi Limetumwa',
      details: 'TCB-ARU-2026-008 sent to Arusha office',
      timestamp: '2026-02-23 08:15',
      type: 'dispatch',
      status: 'success'
    }
  ];

  const filteredRegions = selectedRegion === 'all' 
    ? regions 
    : regions.filter(r => r.id === selectedRegion);

  const totalAMCOS = regions.reduce((sum, r) => sum + r.amcosCount, 0);
  const totalProduction = regions.reduce((sum, r) => sum + r.production, 0);
  const totalPendingValidations = regions.reduce((sum, r) => sum + r.pendingValidations, 0);
  const totalFlaggedIssues = regions.reduce((sum, r) => sum + r.flaggedIssues, 0);

  const getActivityIcon = (type) => {
    switch(type) {
      case 'verify': return <Eye className="w-4 h-4 text-blue-600" />;
      case 'validate': return <Users className="w-4 h-4 text-green-600" />;
      case 'flag': return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'dispatch': return <Package className="w-4 h-4 text-purple-600" />;
      default: return <MapPin className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {language === 'en' ? 'Regional Monitoring' : 'Ufuatiliaji wa Mikoa'}
          </h2>
          <p className="text-gray-600 mt-1">
            {language === 'en' 
              ? 'Real-time monitoring of all regional activities' 
              : 'Ufuatiliaji wa moja kwa moja wa shughuli zote za mikoa'}
          </p>
        </div>

        <select
          value={selectedRegion}
          onChange={(e) => setSelectedRegion(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          <option value="all">{language === 'en' ? 'All Regions' : 'Mikoa Yote'}</option>
          {regions.map(region => (
            <option key={region.id} value={region.id}>{region.name}</option>
          ))}
        </select>
      </div>

      {/* National Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">
              {language === 'en' ? 'Total AMCOS' : 'Jumla AMCOS'}
            </p>
            <Users className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalAMCOS}</p>
          <p className="text-xs text-gray-500 mt-1">
            {language === 'en' ? 'across all regions' : 'katika mikoa yote'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">
              {language === 'en' ? 'Total Production' : 'Jumla Uzalishaji'}
            </p>
            <Leaf className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-600">{(totalProduction / 1000).toFixed(1)}t</p>
          <p className="text-xs text-gray-500 mt-1">
            {language === 'en' ? 'coffee collected' : 'kahawa iliyokusanywa'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">
              {language === 'en' ? 'Pending Validations' : 'Uthibitisho Unasubiri'}
            </p>
            <Eye className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-blue-600">{totalPendingValidations}</p>
          <p className="text-xs text-gray-500 mt-1">
            {language === 'en' ? 'awaiting review' : 'inasubiri ukaguzi'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">
              {language === 'en' ? 'Flagged Issues' : 'Matatizo Yaliyowekwa Alama'}
            </p>
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-3xl font-bold text-yellow-600">{totalFlaggedIssues}</p>
          <p className="text-xs text-gray-500 mt-1">
            {language === 'en' ? 'need attention' : 'wanahitaji uangalizi'}
          </p>
        </div>
      </div>

      {/* Regional Status Grid */}
      <div className="grid grid-cols-3 gap-6">
        {filteredRegions.map((region) => (
          <div key={region.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MapPin className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{region.name}</h3>
                  <p className="text-sm text-gray-500">
                    {region.amcosCount} {language === 'en' ? 'AMCOS' : 'AMCOS'}
                  </p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                region.status === 'healthy' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {region.status === 'healthy' 
                  ? (language === 'en' ? 'Healthy' : 'Nzuri')
                  : (language === 'en' ? 'Warning' : 'Onyo')
                }
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{language === 'en' ? 'Production' : 'Uzalishaji'}:</span>
                <span className="font-semibold text-gray-900">{region.production.toLocaleString()} kg</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{language === 'en' ? 'Fertilizer' : 'Mbolea'}:</span>
                <span className="font-semibold text-gray-900">{region.fertilizer.toLocaleString()} {language === 'en' ? 'bags' : 'mifuko'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{language === 'en' ? 'Compliance' : 'Kufuata'}:</span>
                <span className={`font-semibold ${
                  region.compliance >= 95 ? 'text-green-600' :
                  region.compliance >= 90 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {region.compliance}%
                </span>
              </div>

              <div className="pt-3 border-t border-gray-200 grid grid-cols-2 gap-2">
                <div className="text-center">
                  <p className="text-xs text-gray-500">{language === 'en' ? 'Pending' : 'Inasubiri'}</p>
                  <p className="text-lg font-bold text-blue-600">{region.pendingValidations}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">{language === 'en' ? 'Flagged' : 'Alama'}</p>
                  <p className="text-lg font-bold text-yellow-600">{region.flaggedIssues}</p>
                </div>
              </div>

              <button className="w-full mt-3 px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors">
                {language === 'en' ? 'View Details' : 'Tazama Maelezo'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Weekly Activity Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">
          {language === 'en' ? 'Weekly Activity Overview' : 'Muhtasari wa Shughuli za Wiki'}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={weeklyActivity}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="batches" 
              stroke="#7c3aed" 
              strokeWidth={2}
              name={language === 'en' ? 'Batches' : 'Makundi'}
            />
            <Line 
              type="monotone" 
              dataKey="validations" 
              stroke="#2563eb" 
              strokeWidth={2}
              name={language === 'en' ? 'Validations' : 'Uthibitisho'}
            />
            <Line 
              type="monotone" 
              dataKey="issues" 
              stroke="#eab308" 
              strokeWidth={2}
              name={language === 'en' ? 'Issues' : 'Matatizo'}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Regional Activities */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            {language === 'en' ? 'Recent Regional Activities' : 'Shughuli za Mikoa za Hivi Karibuni'}
          </h3>
        </div>

        <div className="p-6 space-y-3">
          {recentActivities.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-purple-300 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  activity.status === 'success' ? 'bg-green-100' :
                  activity.status === 'warning' ? 'bg-yellow-100' : 'bg-gray-100'
                }`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-900">{activity.region}</span>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm text-gray-600">{activity.activity}</span>
                  </div>
                  <p className="text-sm text-gray-600">{activity.details}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">{activity.timestamp}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Regional Production Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">
          {language === 'en' ? 'Regional Production Comparison' : 'Ulinganisho wa Uzalishaji wa Mikoa'}
        </h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={regions}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="production" fill="#16a34a" name={language === 'en' ? 'Coffee (kg)' : 'Kahawa (kg)'} />
            <Bar dataKey="fertilizer" fill="#7c3aed" name={language === 'en' ? 'Fertilizer (bags)' : 'Mbolea (mifuko)'} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
