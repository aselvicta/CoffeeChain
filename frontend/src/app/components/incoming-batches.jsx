import { useState } from 'react';
import { Package, CheckCircle, Clock } from 'lucide-react';
import { useLanguage } from './language-context';
import { DigitalSignatureModal } from './digital-signature-modal';
import { TrustSeal } from './trust-seal';

export function IncomingBatches() {
  const { language } = useLanguage();
  const [showSignature, setShowSignature] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);

  const [batches, setBatches] = useState([
    {
      id: 'TCB-KGR-2026-005',
      fertilizerType: 'NPK 20-10-10',
      totalBags: 500,
      source: 'National Warehouse - Dodoma',
      destination: 'Kagera Regional Office',
      dispatchDate: '2026-02-22',
      estimatedArrival: '2026-02-24',
      truckNumber: 'T 456 BJK',
      driverName: 'Hassan Mohammed',
      status: 'pending',
      verificationId: 'VRF-22140000'
    },
    {
      id: 'TCB-KGR-2026-004',
      fertilizerType: 'DAP',
      totalBags: 350,
      source: 'National Warehouse - Dodoma',
      destination: 'Kagera Regional Office',
      dispatchDate: '2026-02-20',
      estimatedArrival: '2026-02-22',
      truckNumber: 'T 234 ABC',
      driverName: 'John Mtebe',
      status: 'verified',
      verificationId: 'VRF-20083000',
      verifiedDate: '2026-02-22 14:30'
    }
  ]);

  const handleVerifyBatch = (batch) => {
    setSelectedBatch(batch);
    setShowSignature(true);
  };

  const handleSignatureComplete = () => {
    setBatches(batches.map(b => 
      b.id === selectedBatch.id 
        ? { ...b, status: 'verified', verifiedDate: new Date().toLocaleString() }
        : b
    ));
    setShowSignature(false);
    setSelectedBatch(null);
  };

  const pendingBatches = batches.filter(b => b.status === 'pending');
  const verifiedBatches = batches.filter(b => b.status === 'verified');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {language === 'en' ? 'Incoming Batches' : 'Makundi Yanayoingia'}
        </h2>
        <p className="text-gray-600 mt-1">
          {language === 'en' 
            ? 'Verify fertilizer batches from national warehouse' 
            : 'Hakiki makundi ya mbolea kutoka ghala la taifa'}
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'en' ? 'Total Batches' : 'Jumla Makundi'}
          </p>
          <p className="text-3xl font-bold text-gray-900">{batches.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'en' ? 'Pending Verification' : 'Inasubiri Uthibitisho'}
          </p>
          <p className="text-3xl font-bold text-gray-900">{pendingBatches.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'en' ? 'Verified' : 'Imethibitishwa'}
          </p>
          <p className="text-3xl font-bold text-gray-900">{verifiedBatches.length}</p>
        </div>
      </div>

      {/* Pending Batches */}
      {pendingBatches.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">
              {language === 'en' ? 'Pending Verification' : 'Inasubiri Uthibitisho'}
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {pendingBatches.map((batch) => (
              <div key={batch.id} className="border border-yellow-200 rounded-lg p-6 bg-yellow-50">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{batch.id}</h4>
                    <p className="text-sm text-gray-600">{batch.fertilizerType}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-200 text-yellow-900">
                    <Clock className="w-3 h-3" />
                    Pending
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600">{language === 'en' ? 'Total Bags' : 'Jumla Mifuko'}</p>
                    <p className="text-sm font-bold text-gray-900">{batch.totalBags}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">{language === 'en' ? 'Truck Number' : 'Nambari ya Lori'}</p>
                    <p className="text-sm font-medium text-gray-900">{batch.truckNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">{language === 'en' ? 'Driver' : 'Dereva'}</p>
                    <p className="text-sm font-medium text-gray-900">{batch.driverName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">{language === 'en' ? 'ETA' : 'Muda Unaotarajiwa'}</p>
                    <p className="text-sm font-medium text-gray-900">{batch.estimatedArrival}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleVerifyBatch(batch)}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  {language === 'en' ? 'Verify Batch' : 'Hakiki Kundi'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verified Batches */}
      {verifiedBatches.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">
              {language === 'en' ? 'Recently Verified' : 'Zimethibitishwa Hivi Karibuni'}
            </h3>
          </div>
          <div className="p-6 space-y-4">
            {verifiedBatches.map((batch) => (
              <div key={batch.id} className="border border-green-200 rounded-lg p-6 bg-green-50">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-bold text-gray-900">{batch.id}</h4>
                    <p className="text-sm text-gray-600">{batch.fertilizerType}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-200 text-green-900">
                    <CheckCircle className="w-3 h-3" />
                    Verified
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-600">{language === 'en' ? 'Total Bags' : 'Jumla Mifuko'}</p>
                    <p className="text-sm font-bold text-gray-900">{batch.totalBags}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">{language === 'en' ? 'Verified Date' : 'Tarehe ya Uthibitisho'}</p>
                    <p className="text-sm font-medium text-gray-900">{batch.verifiedDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">{language === 'en' ? 'Truck Number' : 'Nambari ya Lori'}</p>
                    <p className="text-sm font-medium text-gray-900">{batch.truckNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">{language === 'en' ? 'Driver' : 'Dereva'}</p>
                    <p className="text-sm font-medium text-gray-900">{batch.driverName}</p>
                  </div>
                </div>

                <TrustSeal
                  recordId={batch.id}
                  timestamp={batch.verifiedDate}
                  verifiedBy="Kagera Regional Office"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {showSignature && (
        <DigitalSignatureModal
          onClose={() => setShowSignature(false)}
          onComplete={handleSignatureComplete}
          batchId={selectedBatch?.id}
        />
      )}
    </div>
  );
}
