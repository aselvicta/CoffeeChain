import { useState } from 'react';
import { FileText, Search, Filter, Download, Eye, Shield, User, Package, Leaf } from 'lucide-react';
import { useLanguage } from './language-context';
import { TrustSeal } from './trust-seal';

export function AuditTrail() {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterUser, setFilterUser] = useState('all');

  const [auditLogs, setAuditLogs] = useState([
    {
      id: 'AUD-001',
      timestamp: '2026-02-23 10:45:23',
      user: 'national_user',
      userName: 'Sarah Kimani',
      action: 'Batch Created',
      actionType: 'create',
      details: 'Created fertilizer batch TCB-KGR-2026-005',
      recordId: 'TCB-KGR-2026-005',
      level: 'national',
      ipAddress: '197.156.89.45',
      verificationId: 'VRF-23104523'
    },
    {
      id: 'AUD-002',
      timestamp: '2026-02-23 11:20:15',
      user: 'regional_officer',
      userName: 'Emmanuel Mbwana',
      action: 'Batch Verified',
      actionType: 'verify',
      details: 'Verified fertilizer batch TCB-KGR-2026-005',
      recordId: 'TCB-KGR-2026-005',
      level: 'regional',
      ipAddress: '197.156.92.78',
      verificationId: 'VRF-23112015'
    },
    {
      id: 'AUD-003',
      timestamp: '2026-02-23 08:30:45',
      user: 'coop_manager',
      userName: 'Peter Ochieng',
      action: 'Fertilizer Distribution',
      actionType: 'distribute',
      details: 'Distributed 5 bags to John Kamau (F-2401)',
      recordId: 'DIST-2405',
      level: 'cooperative',
      ipAddress: '197.156.94.12',
      verificationId: 'VRF-23083045'
    },
    {
      id: 'AUD-004',
      timestamp: '2026-02-23 09:15:30',
      user: 'coop_manager',
      userName: 'Peter Ochieng',
      action: 'Coffee Collection',
      actionType: 'collect',
      details: 'Collected 245 kg from John Kamau (F-2401)',
      recordId: 'COLL-2405',
      level: 'cooperative',
      ipAddress: '197.156.94.12',
      verificationId: 'VRF-23091530'
    },
    {
      id: 'AUD-005',
      timestamp: '2026-02-23 09:45:12',
      user: 'regional_officer',
      userName: 'Emmanuel Mbwana',
      action: 'Data Validated',
      actionType: 'validate',
      details: 'Approved coffee collection COLL-2405',
      recordId: 'COLL-2405',
      level: 'regional',
      ipAddress: '197.156.92.78',
      verificationId: 'VRF-23094512'
    },
    {
      id: 'AUD-006',
      timestamp: '2026-02-23 07:00:00',
      user: 'coop_manager',
      userName: 'Peter Ochieng',
      action: 'Farmer Registered',
      actionType: 'register',
      details: 'Registered new farmer: Daniel Mwangi (F-2406)',
      recordId: 'F-2406',
      level: 'cooperative',
      ipAddress: '197.156.94.12',
      verificationId: 'VRF-23070000'
    },
    {
      id: 'AUD-007',
      timestamp: '2026-02-22 16:30:00',
      user: 'regional_bukoba',
      userName: 'Grace Makori',
      action: 'Issue Flagged',
      actionType: 'flag',
      details: 'Flagged low yield issue for farmer F-2403',
      recordId: 'FLAG-003',
      level: 'regional',
      ipAddress: '197.156.92.89',
      verificationId: 'VRF-22163000'
    },
    {
      id: 'AUD-008',
      timestamp: '2026-02-22 14:15:00',
      user: 'national_admin',
      userName: 'Dr. Joseph Mwangi',
      action: 'User Created',
      actionType: 'create',
      details: 'Created new user: regional_mwanza',
      recordId: 'USR-006',
      level: 'national',
      ipAddress: '197.156.89.45',
      verificationId: 'VRF-22141500'
    }
  ]);

  const actionTypes = [
    { value: 'all', label: language === 'en' ? 'All Actions' : 'Vitendo Vyote' },
    { value: 'create', label: language === 'en' ? 'Create' : 'Tengeneza' },
    { value: 'verify', label: language === 'en' ? 'Verify' : 'Hakiki' },
    { value: 'distribute', label: language === 'en' ? 'Distribute' : 'Sambaza' },
    { value: 'collect', label: language === 'en' ? 'Collect' : 'Kusanya' },
    { value: 'validate', label: language === 'en' ? 'Validate' : 'Thibitisha' },
    { value: 'flag', label: language === 'en' ? 'Flag' : 'Weka Alama' },
    { value: 'register', label: language === 'en' ? 'Register' : 'Sajili' }
  ];

  const users = [
    { value: 'all', label: language === 'en' ? 'All Users' : 'Watumiaji Wote' },
    { value: 'national_admin', label: 'Dr. Joseph Mwangi (Admin)' },
    { value: 'national_user', label: 'Sarah Kimani (National)' },
    { value: 'regional_officer', label: 'Emmanuel Mbwana (Regional)' },
    { value: 'regional_bukoba', label: 'Grace Makori (Regional)' },
    { value: 'coop_manager', label: 'Peter Ochieng (AMCOS)' }
  ];

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.recordId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || log.actionType === filterType;
    const matchesUser = filterUser === 'all' || log.user === filterUser;
    return matchesSearch && matchesType && matchesUser;
  });

  const getActionIcon = (actionType) => {
    switch(actionType) {
      case 'create': return <Package className="w-4 h-4" />;
      case 'verify': return <Shield className="w-4 h-4" />;
      case 'distribute': return <Package className="w-4 h-4" />;
      case 'collect': return <Leaf className="w-4 h-4" />;
      case 'validate': return <Shield className="w-4 h-4" />;
      case 'flag': return <FileText className="w-4 h-4" />;
      case 'register': return <User className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const getActionColor = (actionType) => {
    switch(actionType) {
      case 'create': return 'text-purple-600 bg-purple-50';
      case 'verify': return 'text-blue-600 bg-blue-50';
      case 'distribute': return 'text-green-600 bg-green-50';
      case 'collect': return 'text-green-600 bg-green-50';
      case 'validate': return 'text-blue-600 bg-blue-50';
      case 'flag': return 'text-yellow-600 bg-yellow-50';
      case 'register': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const handleExport = () => {
    alert(language === 'en' 
      ? 'Exporting audit trail to CSV...' 
      : 'Kuhamisha kumbukumbu kwa CSV...');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {language === 'en' ? 'Audit Trail' : 'Kumbukumbu ya Ukaguzi'}
          </h2>
          <p className="text-gray-600 mt-1">
            {language === 'en' 
              ? 'Complete history of all system activities' 
              : 'Historia kamili ya shughuli zote za mfumo'}
          </p>
        </div>
        
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Download className="w-5 h-5" />
          {language === 'en' ? 'Export CSV' : 'Hamisha CSV'}
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">
            {language === 'en' ? 'Total Events' : 'Jumla Matukio'}
          </p>
          <p className="text-2xl font-bold text-gray-900">{auditLogs.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">
            {language === 'en' ? 'Today' : 'Leo'}
          </p>
          <p className="text-2xl font-bold text-purple-600">
            {auditLogs.filter(log => log.timestamp.startsWith('2026-02-23')).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">
            {language === 'en' ? 'Verified Actions' : 'Vitendo Vilivyothibitishwa'}
          </p>
          <p className="text-2xl font-bold text-green-600">
            {auditLogs.filter(log => log.actionType === 'verify' || log.actionType === 'validate').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">
            {language === 'en' ? 'Flagged Issues' : 'Matatizo Yaliyowekwa Alama'}
          </p>
          <p className="text-2xl font-bold text-yellow-600">
            {auditLogs.filter(log => log.actionType === 'flag').length}
          </p>
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
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder={language === 'en' ? 'Search logs...' : 'Tafuta kumbukumbu...'}
            />
          </div>

          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {actionTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {users.map(user => (
                <option key={user.value} value={user.value}>{user.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
          <Filter className="w-4 h-4" />
          {language === 'en' ? 'Showing' : 'Inaonyesha'} {filteredLogs.length} {language === 'en' ? 'of' : 'ya'} {auditLogs.length} {language === 'en' ? 'events' : 'matukio'}
        </div>
      </div>

      {/* Audit Logs Timeline */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            {language === 'en' ? 'Activity Timeline' : 'Ratiba ya Shughuli'}
          </h3>
        </div>

        <div className="p-6 space-y-4">
          {filteredLogs.map((log) => (
            <div key={log.id} className="border-l-4 border-gray-200 pl-4 py-2 hover:border-purple-400 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getActionColor(log.actionType)}`}>
                    {getActionIcon(log.actionType)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{log.action}</h4>
                    <p className="text-sm text-gray-600">{log.details}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  log.level === 'national' ? 'bg-purple-100 text-purple-800' :
                  log.level === 'regional' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {log.level === 'national' ? (language === 'en' ? 'National' : 'Taifa') :
                   log.level === 'regional' ? (language === 'en' ? 'Regional' : 'Mkoa') :
                   'AMCOS'}
                </span>
              </div>

              <div className="grid grid-cols-4 gap-4 text-xs text-gray-500 mb-2">
                <div>
                  <span className="font-medium">{language === 'en' ? 'User' : 'Mtumiaji'}:</span> {log.userName}
                </div>
                <div>
                  <span className="font-medium">{language === 'en' ? 'Time' : 'Muda'}:</span> {log.timestamp}
                </div>
                <div>
                  <span className="font-medium">{language === 'en' ? 'Record ID' : 'Nambari ya Rekodi'}:</span> {log.recordId}
                </div>
                <div>
                  <span className="font-medium">IP:</span> {log.ipAddress}
                </div>
              </div>

              <TrustSeal 
                recordId={log.id}
                timestamp={log.timestamp}
                verifiedBy={log.userName}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {filteredLogs.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {language === 'en' ? 'No audit logs found' : 'Hakuna kumbukumbu za ukaguzi zilizopatikana'}
          </p>
        </div>
      )}
    </div>
  );
}
