import { useState } from 'react';
import { CheckCircle, AlertTriangle, Eye } from 'lucide-react';
import { useLanguage } from './language-context';
import { TrustSeal } from './trust-seal';

export function ValidationCenter() {
  const { language } = useLanguage();
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [flagReason, setFlagReason] = useState('');

  const [pendingRecords, setPendingRecords] = useState([
    {
      id: 'COLL-2405',
      type: 'coffee_collection',
      amcos: 'Bukoba AMCOS',
      farmerId: 'F-2401',
      farmerName: 'John Kamau',
      amount: 245,
      unit: 'kg',
      quality: 'AA',
      expectedYield: 250,
      compliance: 98,
      timestamp: '2026-02-23 09:15',
      verificationId: 'VRF-23091500'
    },
    {
      id: 'COLL-2406',
      type: 'coffee_collection',
      amcos: 'Ngara AMCOS',
      farmerId: 'F-2403',
      farmerName: 'Peter Ochieng',
      amount: 120,
      unit: 'kg',
      quality: 'AB',
      expectedYield: 200,
      compliance: 60,
      timestamp: '2026-02-22 14:00',
      verificationId: 'VRF-22140000'
    }
  ]);

  const [validatedRecords, setValidatedRecords] = useState([]);
  const [flaggedIssues, setFlaggedIssues] = useState([]);

  const handleApprove = (record) => {
    setValidatedRecords([...validatedRecords, { ...record, status: 'approved', approvedAt: new Date().toLocaleString() }]);
    setPendingRecords(pendingRecords.filter(r => r.id !== record.id));
    alert(language === 'en' ? 'Record approved and committed to ledger!' : 'Rekodi imethibitishwa na kuwasilishwa kwa daftari!');
  };

  const handleFlag = (record) => {
    setSelectedRecord(record);
    setShowFlagModal(true);
  };

  const handleSubmitFlag = () => {
    if (!flagReason) {
      alert(language === 'en' ? 'Please enter a reason' : 'Tafadhali weka sababu');
      return;
    }

    setFlaggedIssues([...flaggedIssues, { 
      ...selectedRecord, 
      flagReason, 
      flaggedAt: new Date().toLocaleString(),
      status: 'flagged'
    }]);
    setPendingRecords(pendingRecords.filter(r => r.id !== selectedRecord.id));
    setShowFlagModal(false);
    setFlagReason('');
    setSelectedRecord(null);
    alert(language === 'en' ? 'Record flagged for investigation' : 'Rekodi imewekwa alama kwa uchunguzi');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {language === 'en' ? 'Validation Center' : 'Kituo cha Uthibitisho'}
        </h2>
        <p className="text-gray-600 mt-1">
          {language === 'en' 
            ? 'Review and validate AMCOS data submissions' 
            : 'Kagua na thibitisha mawasilisho ya data ya AMCOS'}
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'en' ? 'Pending Validation' : 'Inasubiri Uthibitisho'}
          </p>
          <p className="text-3xl font-bold text-gray-900">{pendingRecords.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'en' ? 'Validated Today' : 'Iliyothibitishwa Leo'}
          </p>
          <p className="text-3xl font-bold text-gray-900">{validatedRecords.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'en' ? 'Flagged Issues' : 'Matatizo Yaliyowekwa Alama'}
          </p>
          <p className="text-3xl font-bold text-gray-900">{flaggedIssues.length}</p>
        </div>
      </div>

      {/* Pending Validations */}
      {pendingRecords.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">
              {language === 'en' ? 'Pending Validations' : 'Uthibitisho Unasubiri'}
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {pendingRecords.map((record) => (
              <div key={record.id} className={`border rounded-lg p-6 ${
                record.compliance < 70 ? 'border-red-300 bg-red-50' : 
                record.compliance < 90 ? 'border-yellow-300 bg-yellow-50' : 
                'border-gray-200 bg-white'
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{record.id}</h4>
                    <p className="text-sm text-gray-600">{record.amcos}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    record.compliance >= 90 ? 'bg-green-100 text-green-800' :
                    record.compliance >= 70 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {record.compliance}% {language === 'en' ? 'Compliance' : 'Kufuata'}
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600">{language === 'en' ? 'Farmer' : 'Mkulima'}</p>
                    <p className="text-sm font-medium text-gray-900">{record.farmerName}</p>
                    <p className="text-xs text-gray-500">{record.farmerId}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">{language === 'en' ? 'Coffee Collected' : 'Kahawa Iliyokusanywa'}</p>
                    <p className="text-sm font-bold text-gray-900">{record.amount} {record.unit}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">{language === 'en' ? 'Quality' : 'Ubora'}</p>
                    <p className="text-sm font-medium text-gray-900">{record.quality}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">{language === 'en' ? 'Expected Yield' : 'Mavuno Yanayotarajiwa'}</p>
                    <p className="text-sm font-medium text-gray-900">{record.expectedYield} kg</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">{language === 'en' ? 'Submitted' : 'Imewasilishwa'}</p>
                    <p className="text-sm text-gray-600">{record.timestamp}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleApprove(record)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" />
                    {language === 'en' ? 'Approve' : 'Thibitisha'}
                  </button>
                  <button
                    onClick={() => handleFlag(record)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium flex items-center justify-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    {language === 'en' ? 'Flag Issue' : 'Weka Alama'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validated Records */}
      {validatedRecords.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">
              {language === 'en' ? 'Recently Validated' : 'Zimethibitishwa Hivi Karibuni'}
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
                    AMCOS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {language === 'en' ? 'Farmer' : 'Mkulima'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {language === 'en' ? 'Amount' : 'Kiasi'}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {language === 'en' ? 'Approved At' : 'Ilithitishwa'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {validatedRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{record.id}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.amcos}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.farmerName}</td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{record.amount} {record.unit}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{record.approvedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Flagged Issues */}
      {flaggedIssues.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">
              {language === 'en' ? 'Flagged Issues' : 'Matatizo Yaliyowekwa Alama'}
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {flaggedIssues.map((issue) => (
              <div key={issue.id} className="border border-red-300 rounded-lg p-6 bg-red-50">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{issue.id}</h4>
                    <p className="text-sm text-gray-600">{issue.amcos} - {issue.farmerName}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-red-200 text-red-900">
                    Flagged
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-3">
                  <strong>{language === 'en' ? 'Reason' : 'Sababu'}:</strong> {issue.flagReason}
                </p>
                <p className="text-xs text-gray-600">{language === 'en' ? 'Flagged at' : 'Iliwekwa alama'}: {issue.flaggedAt}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flag Modal */}
      {showFlagModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              {language === 'en' ? 'Flag Issue' : 'Weka Alama Tatizo'}
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              {language === 'en' 
                ? 'Enter the reason for flagging this record:' 
                : 'Weka sababu ya kuweka alama rekodi hii:'}
            </p>
            <textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-4"
              rows="4"
              placeholder={language === 'en' ? 'Enter reason...' : 'Weka sababu...'}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowFlagModal(false);
                  setFlagReason('');
                  setSelectedRecord(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {language === 'en' ? 'Cancel' : 'Ghairi'}
              </button>
              <button
                onClick={handleSubmitFlag}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {language === 'en' ? 'Submit Flag' : 'Wasilisha Alama'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
