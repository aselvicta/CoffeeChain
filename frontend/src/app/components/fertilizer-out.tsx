import { useState } from 'react';
import { Package, ArrowRight, Calendar, User } from 'lucide-react';
import { useLanguage } from './language-context';
import { TrustSeal } from './trust-seal';
import { FarmerOTPModal } from './farmer-otp-modal';
import { useFertilizerTypes } from '../hooks/use-fertilizer-types';

interface Distribution {
  id: string;
  farmerId: string;
  farmerName: string;
  bagsGiven: number;
  fertilizerType: string;
  distributionDate: string;
  timestamp: string;
  verificationId: string;
  status: string;
  notes?: string;
}

interface Farmer {
  id: string;
  name: string;
}

interface FertilizerType {
  value: string;
  label: string;
}

interface FormData {
  farmerId: string;
  farmerName: string;
  bagsGiven: string;
  fertilizerType: string;
  distributionDate: string;
  notes: string;
}

export function FertilizerOut() {
  const { t, language } = useLanguage();
  const { fertilizerTypes } = useFertilizerTypes();
  const [formData, setFormData] = useState<FormData>({
    farmerId: '',
    farmerName: '',
    bagsGiven: '',
    fertilizerType: '',
    distributionDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [distributions, setDistributions] = useState<Distribution[]>([
    {
      id: 'DIST-2401',
      farmerId: 'F-2401',
      farmerName: 'John Kamau',
      bagsGiven: 5,
      fertilizerType: 'NPK 20-10-10',
      distributionDate: '2026-02-18',
      timestamp: '2026-02-18 10:30',
      verificationId: 'VRF-18103024',
      status: 'committed'
    },
    {
      id: 'DIST-2402',
      farmerId: 'F-2402',
      farmerName: 'Mary Wanjiku',
      bagsGiven: 3,
      fertilizerType: 'DAP',
      distributionDate: '2026-02-18',
      timestamp: '2026-02-18 11:15',
      verificationId: 'VRF-18111524',
      status: 'committed'
    }
  ]);

  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [pendingDistribution, setPendingDistribution] = useState<FormData | null>(null);

  const farmers: Farmer[] = [
    { id: 'F-2401', name: 'John Kamau' },
    { id: 'F-2402', name: 'Mary Wanjiku' },
    { id: 'F-2403', name: 'Peter Ochieng' },
    { id: 'F-2404', name: 'Grace Akinyi' },
    { id: 'F-2405', name: 'Daniel Mwangi' }
  ];

  const handleFarmerSelect = (farmerId: string) => {
    const farmer = farmers.find(f => f.id === farmerId);
    if (farmer) {
      setFormData({
        ...formData,
        farmerId: farmer.id,
        farmerName: farmer.name
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Store form data and open OTP modal
    setPendingDistribution(formData);
    setIsOtpModalOpen(true);
  };

  const handleOtpVerified = () => {
    if (!pendingDistribution) return;

    const newDistribution: Distribution = {
      id: `DIST-${2400 + distributions.length + 1}`,
      farmerId: pendingDistribution.farmerId,
      farmerName: pendingDistribution.farmerName,
      bagsGiven: parseInt(pendingDistribution.bagsGiven),
      fertilizerType: fertilizerTypes.find(f => f.value === pendingDistribution.fertilizerType)?.label || pendingDistribution.fertilizerType,
      distributionDate: pendingDistribution.distributionDate,
      timestamp: new Date().toLocaleString(),
      verificationId: `VRF-${Date.now().toString().slice(-8)}`,
      notes: pendingDistribution.notes,
      status: 'committed'
    };
    
    setDistributions([newDistribution, ...distributions]);
    
    // Close modal and reset form
    setIsOtpModalOpen(false);
    setPendingDistribution(null);
    
    setFormData({
      farmerId: '',
      farmerName: '',
      bagsGiven: '',
      fertilizerType: '',
      distributionDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const handleCloseOtpModal = () => {
    setIsOtpModalOpen(false);
    setPendingDistribution(null);
  };

  const totalBagsDistributed = distributions.reduce((sum, d) => sum + d.bagsGiven, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{t('fertilizerOut')}</h2>
        <p className="text-gray-600 mt-1">
          {language === 'en' 
            ? 'Record fertilizer bags given to farmers' 
            : 'Rekodi mifuko ya mbolea iliyotolewa kwa wakulima'}
        </p>
      </div>

      {/* Daily Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'en' ? 'Today\'s Distributions' : 'Usambazaji wa Leo'}
          </p>
          <p className="text-3xl font-bold text-gray-900">
            {distributions.filter(d => d.distributionDate === new Date().toISOString().split('T')[0]).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'en' ? 'Total Bags Distributed' : 'Jumla Mifuko Iliyogawanywa'}
          </p>
          <p className="text-3xl font-bold text-gray-900">{totalBagsDistributed}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'en' ? 'Expected Coffee Yield' : 'Mavuno Yanayotarajiwa'}
          </p>
          <p className="text-3xl font-bold text-gray-900">
            {(totalBagsDistributed * 50).toLocaleString()} kg
          </p>
        </div>
      </div>

      {/* Distribution Entry Form */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            {language === 'en' ? 'Record New Distribution' : 'Rekodi Usambazaji Mpya'}
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Farmer Selection */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline w-4 h-4 mr-1" />
                {t('selectFarmer')}
              </label>
              <select
                value={formData.farmerId}
                onChange={(e) => handleFarmerSelect(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="">
                  {language === 'en' ? 'Select a farmer...' : 'Chagua mkulima...'}
                </option>
                {farmers.map(farmer => (
                  <option key={farmer.id} value={farmer.id}>
                    {farmer.id} - {farmer.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('farmerName')}
              </label>
              <input
                type="text"
                value={formData.farmerName}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                disabled
                placeholder={language === 'en' ? 'Auto-filled...' : 'Itajazwa moja kwa moja...'}
              />
            </div>
          </div>

          {/* Distribution Details */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Package className="inline w-4 h-4 mr-1" />
                {t('fertilizerType')}
              </label>
              <select
                value={formData.fertilizerType}
                onChange={(e) => setFormData({...formData, fertilizerType: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                <option value="">
                  {language === 'en' ? 'Select fertilizer type...' : 'Chagua aina ya mbolea...'}
                </option>
                {fertilizerTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('bagsGiven')}
              </label>
              <input
                type="number"
                value={formData.bagsGiven}
                onChange={(e) => setFormData({...formData, bagsGiven: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={language === 'en' ? 'Number of bags' : 'Idadi ya mifuko'}
                min="1"
                required
              />
              {formData.bagsGiven && (
                <p className="text-xs text-green-600 mt-1">
                  {language === 'en' ? 'Expected yield' : 'Mavuno yanayotarajiwa'}: ~{parseInt(formData.bagsGiven) * 50} kg
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                {language === 'en' ? 'Distribution Date' : 'Tarehe ya Usambazaji'}
              </label>
              <input
                type="date"
                value={formData.distributionDate}
                onChange={(e) => setFormData({...formData, distributionDate: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {language === 'en' ? 'Notes (Optional)' : 'Maelezo (Si Lazima)'}
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={language === 'en' ? 'Additional notes...' : 'Maelezo ya ziada...'}
              />
            </div>
          </div>

          {/* Reconciliation Note */}
          {formData.bagsGiven && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <ArrowRight className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    {t('reconciliationRule')}
                  </p>
                  <p className="text-sm text-blue-700">
                    {language === 'en' 
                      ? `This farmer should return approximately ${parseInt(formData.bagsGiven) * 50} kg of coffee during harvest season.`
                      : `Mkulima huyu anapaswa kurudisha takriban ${parseInt(formData.bagsGiven) * 50} kg ya kahawa wakati wa mavuno.`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              <Package className="w-5 h-5" />
              {t('commitToLedger')}
            </button>
          </div>
        </form>
      </div>

      {/* Recent Distributions */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            {language === 'en' ? 'Recent Distributions' : 'Usambazaji wa Hivi Karibuni'}
          </h3>
        </div>
        
        <div className="p-6 space-y-4">
          {distributions.map((dist) => (
            <div key={dist.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{dist.farmerName}</h4>
                  <p className="text-sm text-gray-500">{dist.farmerId}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {dist.bagsGiven} {language === 'en' ? 'bags' : 'mifuko'}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <p className="text-xs text-gray-500">{t('fertilizerType')}</p>
                  <p className="text-sm font-medium text-gray-900">{dist.fertilizerType}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{language === 'en' ? 'Date' : 'Tarehe'}</p>
                  <p className="text-sm font-medium text-gray-900">{dist.distributionDate}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{language === 'en' ? 'Expected Yield' : 'Mavuno Yanayotarajiwa'}</p>
                  <p className="text-sm font-medium text-green-600">~{dist.bagsGiven * 50} kg</p>
                </div>
              </div>
              
              <TrustSeal 
                recordId={dist.id}
                timestamp={dist.timestamp}
                verifiedBy="AMCOS Bukoba"
              />
            </div>
          ))}
        </div>
      </div>

      {/* OTP Verification Modal */}
      {pendingDistribution && (
        <FarmerOTPModal
          isOpen={isOtpModalOpen}
          onClose={handleCloseOtpModal}
          onVerified={handleOtpVerified}
          farmerName={pendingDistribution.farmerName}
          farmerId={pendingDistribution.farmerId}
          distributionData={{
            bagsGiven: parseInt(pendingDistribution.bagsGiven),
            fertilizerType: fertilizerTypes.find(f => f.value === pendingDistribution.fertilizerType)?.label || pendingDistribution.fertilizerType
          }}
        />
      )}
    </div>
  );
}
