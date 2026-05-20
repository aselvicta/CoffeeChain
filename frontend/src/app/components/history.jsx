import { useState } from 'react';
import { History as HistoryIcon, Filter, Calendar, Package, Leaf, Search } from 'lucide-react';
import { useLanguage } from './language-context';
import { TrustSeal } from './trust-seal';

export function History() {
  const { t, language } = useLanguage();
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');

  const [records, setRecords] = useState([
    {
      id: 'DIST-2405',
      type: 'fertilizer_out',
      farmerId: 'F-2401',
      farmerName: 'John Kamau',
      amount: 5,
      unit: 'bags',
      product: 'NPK 20-10-10',
      date: '2026-02-23',
      timestamp: '2026-02-23 08:30:00',
      verificationId: 'VRF-23083000',
      status: 'committed'
    },
    {
      id: 'COLL-2405',
      type: 'coffee_in',
      farmerId: 'F-2401',
      farmerName: 'John Kamau',
      amount: 245,
      unit: 'kg',
      product: 'Coffee AA',
      date: '2026-02-23',
      timestamp: '2026-02-23 09:15:00',
      verificationId: 'VRF-23091500',
      status: 'committed',
      compliance: 98
    },
    {
      id: 'DIST-2404',
      type: 'fertilizer_out',
      farmerId: 'F-2402',
      farmerName: 'Mary Wanjiku',
      amount: 3,
      unit: 'bags',
      product: 'DAP',
      date: '2026-02-22',
      timestamp: '2026-02-22 14:20:00',
      verificationId: 'VRF-22142000',
      status: 'committed'
    },
    {
      id: 'COLL-2404',
      type: 'coffee_in',
      farmerId: 'F-2402',
      farmerName: 'Mary Wanjiku',
      amount: 142,
      unit: 'kg',
      product: 'Coffee A',
      date: '2026-02-22',
      timestamp: '2026-02-22 15:45:00',
      verificationId: 'VRF-22154500',
      status: 'committed',
      compliance: 95
    },
    {
      id: 'F-2406',
      type: 'farmer_registration',
      farmerName: 'Daniel Mwangi',
      village: 'Bukoba Central',
      farmSize: 4.5,
      coffeeVariety: 'Arabica',
      date: '2026-02-22',
      timestamp: '2026-02-22 10:00:00',
      verificationId: 'VRF-22100000',
      status: 'committed'
    },
    {
      id: 'DIST-2403',
      type: 'fertilizer_out',
      farmerId: 'F-2403',
      farmerName: 'Peter Ochieng',
      amount: 4,
      unit: 'bags',
      product: 'Urea (46% N)',
      date: '2026-02-21',
      timestamp: '2026-02-21 11:30:00',
      verificationId: 'VRF-21113000',
      status: 'committed'
    },
    {
      id: 'COLL-2403',
      type: 'coffee_in',
      farmerId: 'F-2403',
      farmerName: 'Peter Ochieng',
      amount: 180,
      unit: 'kg',
      product: 'Coffee AB',
      date: '2026-02-21',
      timestamp: '2026-02-21 13:00:00',
      verificationId: 'VRF-21130000',
      status: 'committed',
      compliance: 90
    }
  ]);

  const recordTypes = [
    { value: 'all', label: language === 'en' ? 'All Records' : 'Rekodi Zote' },
    { value: 'fertilizer_out', label: language === 'en' ? 'Fertilizer Distribution' : 'Usambazaji wa Mbolea' },
    { value: 'coffee_in', label: language === 'en' ? 'Coffee Collection' : 'Ukusanyaji wa Kahawa' },
    { value: 'farmer_registration', label: language === 'en' ? 'Farmer Registration' : 'Usajili wa Wakulima' }
  ];

  const dateFilters = [
    { value: 'all', label: language === 'en' ? 'All Time' : 'Muda Wote' },
    { value: 'today', label: language === 'en' ? 'Today' : 'Leo' },
    { value: 'week', label: language === 'en' ? 'This Week' : 'Wiki Hii' },
    { value: 'month', label: language === 'en' ? 'This Month' : 'Mwezi Huu' }
  ];

  const filteredRecords = records.filter(record => {
    const matchesType = filterType === 'all' || record.type === filterType;
    const matchesSearch = record.farmerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         record.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         record.product?.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate = record.date === '2026-02-23';
    } else if (dateFilter === 'week') {
      matchesDate = record.date >= '2026-02-17';
    } else if (dateFilter === 'month') {
      matchesDate = record.date >= '2026-02-01';
    }
    
    return matchesType && matchesSearch && matchesDate;
  });

  const getRecordIcon = (type) => {
    switch(type) {
      case 'fertilizer_out': return <Package className="w-5 h-5 text-purple-600" />;
      case 'coffee_in': return <Leaf className="w-5 h-5 text-green-600" />;
      case 'farmer_registration': return <HistoryIcon className="w-5 h-5 text-blue-600" />;
      default: return <HistoryIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRecordColor = (type) => {
    switch(type) {
      case 'fertilizer_out': return 'bg-purple-50 border-purple-200';
      case 'coffee_in': return 'bg-green-50 border-green-200';
      case 'farmer_registration': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getRecordTypeName = (type) => {
    switch(type) {
      case 'fertilizer_out': return language === 'en' ? 'Fertilizer Distribution' : 'Usambazaji wa Mbolea';
      case 'coffee_in': return language === 'en' ? 'Coffee Collection' : 'Ukusanyaji wa Kahawa';
      case 'farmer_registration': return language === 'en' ? 'Farmer Registration' : 'Usajili wa Mkulima';
      default: return type;
    }
  };

  const totalRecords = records.length;
  const todayRecords = records.filter(r => r.date === '2026-02-23').length;
  const fertilizerRecords = records.filter(r => r.type === 'fertilizer_out').length;
  const coffeeRecords = records.filter(r => r.type === 'coffee_in').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {language === 'en' ? 'History' : 'Kumbukumbu'}
        </h2>
        <p className="text-gray-600 mt-1">
          {language === 'en' 
            ? 'View all your submitted records and transactions' 
            : 'Tazama rekodi na miamala yako yote uliyowasilisha'}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">
            {language === 'en' ? 'Total Records' : 'Jumla Rekodi'}
          </p>
          <p className="text-2xl font-bold text-gray-900">{totalRecords}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">
            {language === 'en' ? 'Today' : 'Leo'}
          </p>
          <p className="text-2xl font-bold text-blue-600">{todayRecords}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">
            {language === 'en' ? 'Fertilizer' : 'Mbolea'}
          </p>
          <p className="text-2xl font-bold text-purple-600">{fertilizerRecords}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">
            {language === 'en' ? 'Coffee' : 'Kahawa'}
          </p>
          <p className="text-2xl font-bold text-green-600">{coffeeRecords}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder={language === 'en' ? 'Search records...' : 'Tafuta rekodi...'}
            />
          </div>

          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {recordTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              {dateFilters.map(filter => (
                <option key={filter.value} value={filter.value}>{filter.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
          <Filter className="w-4 h-4" />
          {language === 'en' ? 'Showing' : 'Inaonyesha'} {filteredRecords.length} {language === 'en' ? 'of' : 'ya'} {totalRecords} {language === 'en' ? 'records' : 'rekodi'}
        </div>
      </div>

      {/* Records Timeline */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            {language === 'en' ? 'Record Timeline' : 'Ratiba ya Rekodi'}
          </h3>
        </div>

        <div className="p-6 space-y-4">
          {filteredRecords.map((record) => (
            <div key={record.id} className={`border rounded-lg p-4 ${getRecordColor(record.type)}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg">
                    {getRecordIcon(record.type)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{getRecordTypeName(record.type)}</h4>
                    <p className="text-sm text-gray-600">{record.id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">{record.date}</p>
                  <p className="text-xs text-gray-500">{record.timestamp.split(' ')[1]}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-3">
                {record.farmerName && (
                  <div>
                    <p className="text-xs text-gray-500">{t('farmerName')}</p>
                    <p className="text-sm font-medium text-gray-900">{record.farmerName}</p>
                    {record.farmerId && (
                      <p className="text-xs text-gray-500">{record.farmerId}</p>
                    )}
                  </div>
                )}
                {record.amount && (
                  <div>
                    <p className="text-xs text-gray-500">
                      {record.type === 'fertilizer_out' ? t('bagsGiven') : t('kgCollected')}
                    </p>
                    <p className="text-sm font-medium text-gray-900">
                      {record.amount} {record.unit}
                    </p>
                  </div>
                )}
                {record.product && (
                  <div>
                    <p className="text-xs text-gray-500">
                      {record.type === 'fertilizer_out' ? t('fertilizerType') : (language === 'en' ? 'Quality' : 'Ubora')}
                    </p>
                    <p className="text-sm font-medium text-gray-900">{record.product}</p>
                  </div>
                )}
                {record.village && (
                  <div>
                    <p className="text-xs text-gray-500">{language === 'en' ? 'Village' : 'Kijiji'}</p>
                    <p className="text-sm font-medium text-gray-900">{record.village}</p>
                  </div>
                )}
                {record.farmSize && (
                  <div>
                    <p className="text-xs text-gray-500">{language === 'en' ? 'Farm Size' : 'Ukubwa wa Shamba'}</p>
                    <p className="text-sm font-medium text-gray-900">{record.farmSize} ha</p>
                  </div>
                )}
                {record.compliance && (
                  <div>
                    <p className="text-xs text-gray-500">{language === 'en' ? 'Compliance' : 'Kufuata'}</p>
                    <p className={`text-sm font-bold ${
                      record.compliance >= 95 ? 'text-green-600' :
                      record.compliance >= 90 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {record.compliance}%
                    </p>
                  </div>
                )}
              </div>

              <TrustSeal 
                recordId={record.id}
                timestamp={record.timestamp}
                verifiedBy="AMCOS Bukoba"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredRecords.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <HistoryIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {language === 'en' ? 'No records found' : 'Hakuna rekodi zilizopatikana'}
          </p>
        </div>
      )}
    </div>
  );
}
