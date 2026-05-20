import { useState } from 'react';
import { Leaf, User, Scale, Calendar, TrendingUp } from 'lucide-react';
import { useLanguage } from './language-context';
import { TrustSeal } from './trust-seal';

export function CoffeeIn() {
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState({
    farmerId: '',
    farmerName: '',
    kgCollected: '',
    qualityGrade: '',
    collectionDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [collections, setCollections] = useState([
    {
      id: 'COLL-2401',
      farmerId: 'F-2401',
      farmerName: 'John Kamau',
      kgCollected: 245,
      qualityGrade: 'AA',
      collectionDate: '2026-02-19',
      timestamp: '2026-02-19 09:15',
      verificationId: 'VRF-19091524',
      expectedYield: 250,
      compliance: 98,
      status: 'committed'
    },
    {
      id: 'COLL-2402',
      farmerId: 'F-2402',
      farmerName: 'Mary Wanjiku',
      kgCollected: 142,
      qualityGrade: 'A',
      collectionDate: '2026-02-19',
      timestamp: '2026-02-19 10:30',
      verificationId: 'VRF-19103024',
      expectedYield: 150,
      compliance: 95,
      status: 'committed'
    }
  ]);

  const farmers = [
    { id: 'F-2401', name: 'John Kamau', bagsReceived: 5 },
    { id: 'F-2402', name: 'Mary Wanjiku', bagsReceived: 3 },
    { id: 'F-2403', name: 'Peter Ochieng', bagsReceived: 4 },
    { id: 'F-2404', name: 'Grace Akinyi', bagsReceived: 6 },
    { id: 'F-2405', name: 'Daniel Mwangi', bagsReceived: 8 }
  ];

  const qualityGrades = [
    { value: 'aa', label: 'AA (Premium)' },
    { value: 'a', label: 'A (High Quality)' },
    { value: 'ab', label: 'AB (Standard)' },
    { value: 'c', label: 'C (Commercial)' }
  ];

  const [selectedFarmer, setSelectedFarmer] = useState(null);

  const handleFarmerSelect = (farmerId) => {
    const farmer = farmers.find(f => f.id === farmerId);
    if (farmer) {
      setSelectedFarmer(farmer);
      setFormData({
        ...formData,
        farmerId: farmer.id,
        farmerName: farmer.name
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const expectedYield = selectedFarmer ? selectedFarmer.bagsReceived * 50 : 0;
    const actualYield = parseInt(formData.kgCollected);
    const compliance = Math.round((actualYield / expectedYield) * 100);
    
    const newCollection = {
      id: `COLL-${2400 + collections.length + 1}`,
      farmerId: formData.farmerId,
      farmerName: formData.farmerName,
      kgCollected: actualYield,
      qualityGrade: qualityGrades.find(q => q.value === formData.qualityGrade)?.label.split(' ')[0] || formData.qualityGrade,
      collectionDate: formData.collectionDate,
      timestamp: new Date().toLocaleString(),
      verificationId: `VRF-${Date.now().toString().slice(-8)}`,
      expectedYield: expectedYield,
      compliance: compliance,
      notes: formData.notes,
      status: 'committed'
    };
    
    setCollections([newCollection, ...collections]);
    
    // Reset form
    setFormData({
      farmerId: '',
      farmerName: '',
      kgCollected: '',
      qualityGrade: '',
      collectionDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setSelectedFarmer(null);
  };

  const totalKgCollected = collections.reduce((sum, c) => sum + c.kgCollected, 0);
  const averageCompliance = collections.length > 0 
    ? Math.round(collections.reduce((sum, c) => sum + c.compliance, 0) / collections.length)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{t('coffeeIn')}</h2>
        <p className="text-gray-600 mt-1">
          {language === 'en' 
            ? 'Record coffee collected from farmers' 
            : 'Rekodi kahawa iliyokusanywa kutoka kwa wakulima'}
        </p>
      </div>

      {/* Daily Statistics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'en' ? 'Today\'s Collections' : 'Ukusanyaji wa Leo'}
          </p>
          <p className="text-3xl font-bold text-gray-900">
            {collections.filter(c => c.collectionDate === new Date().toISOString().split('T')[0]).length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'en' ? 'Total Coffee Collected' : 'Jumla Kahawa Iliyokusanywa'}
          </p>
          <p className="text-3xl font-bold text-gray-900">{totalKgCollected.toLocaleString()} kg</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'en' ? 'Average Compliance' : 'Wastani wa Kufuata'}
          </p>
          <p className="text-3xl font-bold text-gray-900">{averageCompliance}%</p>
        </div>
      </div>

      {/* Collection Entry Form */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            {language === 'en' ? 'Record New Collection' : 'Rekodi Ukusanyaji Mpya'}
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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

          {/* Expected Yield Info */}
          {selectedFarmer && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">
                    {language === 'en' ? 'Fertilizer History' : 'Historia ya Mbolea'}
                  </p>
                  <p className="text-sm text-blue-700">
                    {language === 'en' 
                      ? `This farmer received ${selectedFarmer.bagsReceived} bags of fertilizer. Expected yield: ~${selectedFarmer.bagsReceived * 50} kg.`
                      : `Mkulima huyu alipokea mifuko ${selectedFarmer.bagsReceived} ya mbolea. Mavuno yanayotarajiwa: ~${selectedFarmer.bagsReceived * 50} kg.`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Collection Details */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Scale className="inline w-4 h-4 mr-1" />
                {t('kgCollected')}
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.kgCollected}
                onChange={(e) => setFormData({...formData, kgCollected: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder={language === 'en' ? 'Kilograms collected' : 'Kilo zilizokusanywa'}
                min="0"
                required
              />
              {formData.kgCollected && selectedFarmer && (
                <p className={`text-xs mt-1 ${
                  (parseInt(formData.kgCollected) / (selectedFarmer.bagsReceived * 50)) >= 0.9 
                    ? 'text-green-600' 
                    : 'text-yellow-600'
                }`}>
                  {language === 'en' ? 'Compliance' : 'Kufuata'}: {Math.round((parseInt(formData.kgCollected) / (selectedFarmer.bagsReceived * 50)) * 100)}%
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Leaf className="inline w-4 h-4 mr-1" />
                {language === 'en' ? 'Quality Grade' : 'Daraja la Ubora'}
              </label>
              <select
                value={formData.qualityGrade}
                onChange={(e) => setFormData({...formData, qualityGrade: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              >
                <option value="">
                  {language === 'en' ? 'Select quality grade...' : 'Chagua daraja la ubora...'}
                </option>
                {qualityGrades.map(grade => (
                  <option key={grade.value} value={grade.value}>{grade.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                {language === 'en' ? 'Collection Date' : 'Tarehe ya Ukusanyaji'}
              </label>
              <input
                type="date"
                value={formData.collectionDate}
                onChange={(e) => setFormData({...formData, collectionDate: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder={language === 'en' ? 'Additional notes...' : 'Maelezo ya ziada...'}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              <Leaf className="w-5 h-5" />
              {t('commitToLedger')}
            </button>
          </div>
        </form>
      </div>

      {/* Recent Collections */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            {language === 'en' ? 'Recent Collections' : 'Ukusanyaji wa Hivi Karibuni'}
          </h3>
        </div>
        
        <div className="p-6 space-y-4">
          {collections.map((coll) => (
            <div key={coll.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900">{coll.farmerName}</h4>
                  <p className="text-sm text-gray-500">{coll.farmerId}</p>
                </div>
                <div className="text-right">
                  <span className="block text-lg font-bold text-green-600">
                    {coll.kgCollected.toLocaleString()} kg
                  </span>
                  <span className="text-xs text-gray-500">{coll.qualityGrade}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <p className="text-xs text-gray-500">{language === 'en' ? 'Date' : 'Tarehe'}</p>
                  <p className="text-sm font-medium text-gray-900">{coll.collectionDate}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{language === 'en' ? 'Expected' : 'Iliyotarajiwa'}</p>
                  <p className="text-sm font-medium text-gray-600">{coll.expectedYield} kg</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{language === 'en' ? 'Compliance' : 'Kufuata'}</p>
                  <p className={`text-sm font-bold ${coll.compliance >= 90 ? 'text-green-600' : 'text-yellow-600'}`}>
                    {coll.compliance}%
                  </p>
                </div>
              </div>
              
              {coll.compliance < 90 && (
                <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                  ⚠️ {language === 'en' 
                    ? 'Below expected yield - may require regional validation'
                    : 'Chini ya mavuno yanayotarajiwa - inaweza kuhitaji uthibitisho wa mkoa'
                  }
                </div>
              )}
              
              <TrustSeal 
                recordId={coll.id}
                timestamp={coll.timestamp}
                verifiedBy="AMCOS Bukoba"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}