import { useState } from 'react';
import { Truck, CheckCircle, AlertCircle, Flag, Package, Users, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLanguage } from './language-context';
import { TrustSeal } from './trust-seal';
import { ProductionBalance } from './production-balance';
import { SyncPulse } from './sync-pulse';
import { DigitalSignatureModal } from './digital-signature-modal';

const amcosProductionData = [
  { name: 'Bukoba', production: 12500, fertilizer: 450 },
  { name: 'Ngara', production: 9800, fertilizer: 350 },
  { name: 'Karagwe', production: 11200, fertilizer: 400 },
  { name: 'Missenyi', production: 8500, fertilizer: 300 },
  { name: 'Muleba', production: 10100, fertilizer: 380 }
];

export function RegionalDashboard() {
  const { t, language } = useLanguage();
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);

  const [pendingBatches, setPendingBatches] = useState([
    {
      id: 'TCB-KGR-2026-003',
      fertilizerType: 'NPK 20-10-10',
      totalBags: 500,
      source: 'National TCB',
      destination: 'Kagera Region',
      district: 'Bukoba',
      status: 'pending',
      dispatchDate: '2026-02-20',
      truckNumber: 'T456 DEF'
    },
    {
      id: 'TCB-KGR-2026-004',
      fertilizerType: 'DAP',
      totalBags: 300,
      source: 'National TCB',
      destination: 'Kagera Region',
      district: 'Ngara',
      status: 'pending',
      dispatchDate: '2026-02-19',
      truckNumber: 'T789 GHI'
    }
  ]);

  const [verifiedBatches, setVerifiedBatches] = useState([
    {
      id: 'TCB-KGR-2026-001',
      fertilizerType: 'NPK 20-10-10',
      totalBags: 500,
      status: 'verified',
      verificationDate: '2026-02-18',
      verificationId: 'VRF-20260218'
    }
  ]);

  const [pendingValidations, setPendingValidations] = useState([
    {
      id: 'VAL-001',
      amcos: 'Bukoba AMCOS',
      type: language === 'en' ? 'Coffee Collection' : 'Ukusanyaji wa Kahawa',
      details: '245 kg from John Kamau',
      submittedDate: '2026-02-19',
      farmerId: 'F-2401'
    },
    {
      id: 'VAL-002',
      amcos: 'Bukoba AMCOS',
      type: language === 'en' ? 'Fertilizer Distribution' : 'Usambazaji wa Mbolea',
      details: '5 bags to Mary Wanjiku',
      submittedDate: '2026-02-19',
      farmerId: 'F-2402'
    },
    {
      id: 'VAL-003',
      amcos: 'Ngara AMCOS',
      type: language === 'en' ? 'Coffee Collection' : 'Ukusanyaji wa Kahawa',
      details: '180 kg from Peter Ochieng',
      submittedDate: '2026-02-18',
      farmerId: 'F-2403'
    }
  ]);

  const [flaggedIssues, setFlaggedIssues] = useState([
    {
      id: 'FLAG-001',
      issueType: language === 'en' ? 'Low Yield' : 'Mavuno Chini',
      description: language === 'en' ? 'Farmer collected only 120 kg vs expected 250 kg' : 'Mkulima alikusanya 120 kg tu badala ya 250 kg iliyotarajiwa',
      amcos: 'Bukoba AMCOS',
      severity: 'medium',
      date: '2026-02-18',
      status: 'open'
    },
    {
      id: 'FLAG-002',
      issueType: language === 'en' ? 'Data Discrepancy' : 'Kutofautiana kwa Data',
      description: language === 'en' ? 'Fertilizer distribution exceeds allocated amount' : 'Usambazaji wa mbolea umezidi kiasi kilichotengwa',
      amcos: 'Ngara AMCOS',
      severity: 'high',
      date: '2026-02-17',
      status: 'open'
    }
  ]);

  const amcosStatus = [
    { name: 'Bukoba AMCOS', production: 12500, status: 'validated', pending: 2, flagged: 1 },
    { name: 'Ngara AMCOS', production: 9800, status: 'pending', pending: 5, flagged: 1 },
    { name: 'Karagwe AMCOS', production: 11200, status: 'validated', pending: 0, flagged: 0 },
    { name: 'Missenyi AMCOS', production: 8500, status: 'pending', pending: 3, flagged: 0 },
    { name: 'Muleba AMCOS', production: 10100, status: 'validated', pending: 1, flagged: 0 }
  ];

  const handleVerifyBatch = (batch) => {
    setSelectedBatch(batch);
    setShowSignatureModal(true);
  };

  const handleVerificationSuccess = () => {
    if (selectedBatch) {
      // Move batch from pending to verified
      setPendingBatches(pendingBatches.filter(b => b.id !== selectedBatch.id));
      setVerifiedBatches([
        {
          ...selectedBatch,
          status: 'verified',
          verificationDate: new Date().toISOString().split('T')[0],
          verificationId: `VRF-${Date.now().toString().slice(-8)}`
        },
        ...verifiedBatches
      ]);
      setSelectedBatch(null);
    }
  };

  const handleApproveValidation = (validation) => {
    setPendingValidations(pendingValidations.filter(v => v.id !== validation.id));
    alert(`${language === 'en' ? 'Approved and committed to ledger!' : 'Imekubaliwa na kuwasilishwa kwa daftari!'}`);
  };

  const handleFlagValidation = (validation) => {
    const reason = prompt(language === 'en' ? 'Enter reason for flagging:' : 'Weka sababu ya kueka alama:');
    if (reason) {
      setFlaggedIssues([
        {
          id: `FLAG-${Date.now()}`,
          issueType: validation.type,
          description: reason,
          amcos: validation.amcos,
          severity: 'medium',
          date: new Date().toISOString().split('T')[0],
          status: 'open'
        },
        ...flaggedIssues
      ]);
      setPendingValidations(pendingValidations.filter(v => v.id !== validation.id));
    }
  };

  const handleResolveIssue = (issue) => {
    setFlaggedIssues(flaggedIssues.map(i => 
      i.id === issue.id ? { ...i, status: 'resolved' } : i
    ));
    alert(`${language === 'en' ? 'Issue marked as resolved!' : 'Tatizo limewekwa kama limeshughulikiwa!'}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {t('dashboard')} - {t('regionalLevel')}
        </h2>
        <p className="text-gray-600 mt-1">
          {language === 'en' 
            ? 'Kagera Regional Office - Bukoba' 
            : 'Ofisi ya Mkoa wa Kagera - Bukoba'}
        </p>
      </div>

      {/* Production Balance Widget */}
      <ProductionBalance fertilizerBags={1880} coffeeKg={52100} />

      {/* Statistics Overview */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'en' ? 'Active AMCOS' : 'AMCOS Hai'}
          </p>
          <p className="text-3xl font-bold text-gray-900">{amcosStatus.length}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'en' ? 'Pending Batches' : 'Makundi Yanasubiri'}
          </p>
          <p className="text-3xl font-bold text-gray-900">{pendingBatches.length}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'en' ? 'Pending Validations' : 'Uthibitisho Unasubiri'}
          </p>
          <p className="text-3xl font-bold text-gray-900">{pendingValidations.length}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'en' ? 'Flagged Issues' : 'Matatizo Yaliyowekwa Alama'}
          </p>
          <p className="text-3xl font-bold text-gray-900">{flaggedIssues.length}</p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Incoming Batches */}
        <div className="col-span-2 space-y-6">
          {/* Pending Batches */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">{t('incomingBatches')}</h3>
            </div>
            
            <div className="p-6 space-y-4">
              {pendingBatches.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Truck className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>{language === 'en' ? 'No pending batches' : 'Hakuna makundi yanasubiri'}</p>
                </div>
              ) : (
                pendingBatches.map((batch) => (
                  <div key={batch.id} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-semibold text-gray-900 text-lg">{batch.id}</h4>
                        <p className="text-sm text-gray-600">
                          {language === 'en' ? 'Truck' : 'Lori'}: {batch.truckNumber}
                        </p>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-200 text-yellow-800">
                        {language === 'en' ? 'Pending Verification' : 'Inasubiri Uthibitisho'}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-gray-500">{t('fertilizerType')}</p>
                        <p className="font-medium text-gray-900">{batch.fertilizerType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">{t('totalBags')}</p>
                        <p className="font-medium text-gray-900">{batch.totalBags}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">
                          {language === 'en' ? 'District' : 'Wilaya'}
                        </p>
                        <p className="font-medium text-gray-900">{batch.district}</p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleVerifyBatch(batch)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                    >
                      <CheckCircle className="w-5 h-5" />
                      {language === 'en' ? 'Verify Batch' : 'Hakiki Kundi'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Verified Batches */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold">
                {language === 'en' ? 'Recently Verified Batches' : 'Makundi Yaliyohakikiwa Hivi Karibuni'}
              </h3>
            </div>
            
            <div className="p-6 space-y-4">
              {verifiedBatches.map((batch) => (
                <div key={batch.id} className="border border-green-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-semibold text-gray-900">{batch.id}</h4>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {language === 'en' ? 'Verified' : 'Imethibitishwa'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <p className="text-xs text-gray-500">{t('fertilizerType')}</p>
                      <p className="font-medium text-gray-900">{batch.fertilizerType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">{t('totalBags')}</p>
                      <p className="font-medium text-gray-900">{batch.totalBags}</p>
                    </div>
                  </div>
                  
                  <TrustSeal 
                    recordId={batch.id}
                    timestamp={batch.verificationDate}
                    verifiedBy="Kagera Office & TCB"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Sync Pulse */}
        <div>
          <SyncPulse />
        </div>
      </div>

      {/* Validation Center */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">{t('validationCenter')}</h3>
          <p className="text-sm text-gray-600 mt-1">
            {language === 'en' 
              ? 'Review and approve data submitted by AMCOS cooperatives' 
              : 'Kagua na ukubali data iliyowasilishwa na ushirika wa AMCOS'}
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'AMCOS' : 'AMCOS'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Type' : 'Aina'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Details' : 'Maelezo'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Submitted' : 'Imewasilishwa'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Actions' : 'Vitendo'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pendingValidations.map((validation) => (
                <tr key={validation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{validation.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{validation.amcos}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{validation.type}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{validation.details}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{validation.submittedDate}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApproveValidation(validation)}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        {t('approve')}
                      </button>
                      <button
                        onClick={() => handleFlagValidation(validation)}
                        className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                      >
                        {t('flag')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Flagged Issues */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            {language === 'en' ? 'Flagged Issues' : 'Matatizo Yaliyowekwa Alama'}
          </h3>
        </div>
        
        <div className="p-6 space-y-3">
          {flaggedIssues.filter(i => i.status === 'open').map((issue) => (
            <div key={issue.id} className="border-l-4 border-red-500 bg-red-50 p-4 rounded-r-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Flag className="w-4 h-4 text-red-600" />
                    <span className="font-semibold text-red-900">{issue.issueType}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      issue.severity === 'high' 
                        ? 'bg-red-200 text-red-800' 
                        : 'bg-yellow-200 text-yellow-800'
                    }`}>
                      {issue.severity === 'high' 
                        ? (language === 'en' ? 'High' : 'Juu')
                        : (language === 'en' ? 'Medium' : 'Wastani')
                      }
                    </span>
                  </div>
                  <p className="text-sm text-red-800 mb-2">{issue.description}</p>
                  <p className="text-xs text-red-600">
                    {issue.amcos} • {issue.date}
                  </p>
                </div>
                <button
                  onClick={() => handleResolveIssue(issue)}
                  className="ml-4 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  {t('resolve')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* AMCOS Status Overview */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            {language === 'en' ? 'AMCOS Status Overview' : 'Muhtasari wa Hali ya AMCOS'}
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'AMCOS Name' : 'Jina la AMCOS'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Production (kg)' : 'Uzalishaji (kg)'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Status' : 'Hali'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Pending' : 'Inasubiri'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Flagged' : 'Alama'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {amcosStatus.map((amcos, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{amcos.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{amcos.production.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                      amcos.status === 'validated'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {amcos.status === 'validated' 
                        ? (language === 'en' ? 'Validated' : 'Imethibitishwa')
                        : (language === 'en' ? 'Pending' : 'Inasubiri')
                      }
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{amcos.pending}</td>
                  <td className="px-6 py-4">
                    {amcos.flagged > 0 ? (
                      <span className="flex items-center gap-1 text-red-600">
                        <AlertCircle className="w-4 h-4" />
                        {amcos.flagged}
                      </span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* AMCOS Production Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">
          {language === 'en' ? 'AMCOS Production Overview' : 'Muhtasari wa Uzalishaji wa AMCOS'}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={amcosProductionData}>
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

      {/* Digital Signature Modal */}
      <DigitalSignatureModal 
        isOpen={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        batchData={selectedBatch}
        onSuccess={handleVerificationSuccess}
      />
    </div>
  );
}