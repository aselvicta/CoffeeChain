import { useState } from 'react';
import { Truck, Package, MapPin, Calendar, Lock } from 'lucide-react';
import { useLanguage } from './language-context';
import { TrustSeal } from './trust-seal';

export function BatchDispatch() {
  const { t, language } = useLanguage();
  const [formData, setFormData] = useState({
    fertilizerType: '',
    totalBags: '',
    region: 'Kagera',
    district: '',
    dispatchDate: new Date().toISOString().split('T')[0],
    truckNumber: '',
    driverName: '',
    notes: ''
  });
  
  const [dispatchedBatches, setDispatchedBatches] = useState([
    {
      id: 'TCB-KGR-2026-001',
      fertilizerType: 'NPK 20-10-10',
      totalBags: 500,
      region: 'Kagera',
      district: 'Bukoba',
      status: 'in-transit',
      dispatchDate: '2026-02-18',
      verificationId: 'VRF-20260218'
    },
    {
      id: 'TCB-KGR-2026-002',
      fertilizerType: 'DAP',
      totalBags: 300,
      region: 'Kagera',
      district: 'Ngara',
      status: 'verified',
      dispatchDate: '2026-02-15',
      verificationId: 'VRF-20260215'
    }
  ]);
  
  const [showSuccess, setShowSuccess] = useState(false);

  const fertilizerTypes = [
    { value: 'npk', label: 'NPK 20-10-10' },
    { value: 'dap', label: 'DAP (Diammonium Phosphate)' },
    { value: 'urea', label: 'Urea (46% N)' },
    { value: 'organic', label: language === 'en' ? 'Organic Compost' : 'Mbolea ya Asili' },
    { value: 'can', label: 'CAN (Calcium Ammonium Nitrate)' }
  ];

  const regions = [
    'Kagera', 'Kilimanjaro', 'Mbeya', 'Mwanza', 'Arusha', 'Ruvuma'
  ];

  const kageraDistricts = [
    'Bukoba', 'Ngara', 'Karagwe', 'Missenyi', 'Muleba', 'Biharamulo', 'Kyerwa'
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const batchId = `TCB-${formData.region.substring(0, 3).toUpperCase()}-${new Date().getFullYear()}-${String(dispatchedBatches.length + 1).padStart(3, '0')}`;
    const verificationId = `VRF-${Date.now().toString().slice(-8)}`;
    
    const newBatch = {
      id: batchId,
      fertilizerType: fertilizerTypes.find(f => f.value === formData.fertilizerType)?.label || formData.fertilizerType,
      totalBags: parseInt(formData.totalBags),
      region: formData.region,
      district: formData.district,
      status: 'in-transit',
      dispatchDate: formData.dispatchDate,
      truckNumber: formData.truckNumber,
      driverName: formData.driverName,
      notes: formData.notes,
      verificationId: verificationId,
      timestamp: new Date().toLocaleString()
    };
    
    setDispatchedBatches([newBatch, ...dispatchedBatches]);
    setShowSuccess(true);
    
    // Reset form
    setFormData({
      fertilizerType: '',
      totalBags: '',
      region: 'Kagera',
      district: '',
      dispatchDate: new Date().toISOString().split('T')[0],
      truckNumber: '',
      driverName: '',
      notes: ''
    });
    
    setTimeout(() => setShowSuccess(false), 5000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{t('batchDispatch')}</h2>
        <p className="text-gray-600 mt-1">
          {language === 'en' 
            ? 'Create and dispatch fertilizer batches to regional offices' 
            : 'Tengeneza na tuma makundi ya mbolea kwa ofisi za mikoa'}
        </p>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-800">
            <Lock className="w-5 h-5" />
            <div>
              <p className="font-semibold">
                {language === 'en' ? 'Batch Locked & Dispatched!' : 'Kundi Limefungwa na Kutumwa!'}
              </p>
              <p className="text-sm">
                {language === 'en' 
                  ? 'Batch committed to ledger and notification sent to regional office.' 
                  : 'Kundi limewasilishwa kwa daftari na arifa imetumwa kwa ofisi ya mkoa.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch Form */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            {language === 'en' ? 'Create New Batch' : 'Tengeneza Kundi Jipya'}
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Fertilizer Type */}
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

            {/* Total Bags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('totalBags')}
              </label>
              <input
                type="number"
                value={formData.totalBags}
                onChange={(e) => setFormData({...formData, totalBags: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={language === 'en' ? 'Enter number of bags' : 'Weka idadi ya mifuko'}
                min="1"
                required
              />
            </div>

            {/* Region */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="inline w-4 h-4 mr-1" />
                {t('region')}
              </label>
              <select
                value={formData.region}
                onChange={(e) => setFormData({...formData, region: e.target.value, district: ''})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              >
                {regions.map(region => (
                  <option key={region} value={region}>{region}</option>
                ))}
              </select>
            </div>

            {/* District */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {language === 'en' ? 'District' : 'Wilaya'}
              </label>
              <select
                value={formData.district}
                onChange={(e) => setFormData({...formData, district: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
                disabled={formData.region !== 'Kagera'}
              >
                <option value="">
                  {language === 'en' ? 'Select district...' : 'Chagua wilaya...'}
                </option>
                {formData.region === 'Kagera' && kageraDistricts.map(district => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>

            {/* Dispatch Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                {language === 'en' ? 'Dispatch Date' : 'Tarehe ya Kutuma'}
              </label>
              <input
                type="date"
                value={formData.dispatchDate}
                onChange={(e) => setFormData({...formData, dispatchDate: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
            </div>

            {/* Truck Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Truck className="inline w-4 h-4 mr-1" />
                {language === 'en' ? 'Truck Number' : 'Nambari ya Lori'}
              </label>
              <input
                type="text"
                value={formData.truckNumber}
                onChange={(e) => setFormData({...formData, truckNumber: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={language === 'en' ? 'e.g., T123 ABC' : 'mfano, T123 ABC'}
                required
              />
            </div>

            {/* Driver Name */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {language === 'en' ? 'Driver Name' : 'Jina la Dereva'}
              </label>
              <input
                type="text"
                value={formData.driverName}
                onChange={(e) => setFormData({...formData, driverName: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={language === 'en' ? 'Enter driver name' : 'Weka jina la dereva'}
                required
              />
            </div>

            {/* Notes */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {language === 'en' ? 'Notes (Optional)' : 'Maelezo (Si Lazima)'}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                rows="3"
                placeholder={language === 'en' ? 'Additional notes about this batch...' : 'Maelezo ya ziada kuhusu kundi hili...'}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              <Lock className="w-5 h-5" />
              {t('lockAndDispatch')}
            </button>
          </div>
        </form>
      </div>

      {/* Dispatched Batches */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            {language === 'en' ? 'Recently Dispatched Batches' : 'Makundi Yaliyotumwa Hivi Karibuni'}
          </h3>
        </div>
        
        <div className="p-6 space-y-4">
          {dispatchedBatches.map((batch) => (
            <div key={batch.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900 text-lg">{batch.id}</h4>
                  <p className="text-sm text-gray-500">
                    {language === 'en' ? 'Dispatched on' : 'Ilitumwa'} {batch.dispatchDate}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  batch.status === 'verified' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {batch.status === 'verified' 
                    ? (language === 'en' ? 'Verified' : 'Imethibitishwa')
                    : (language === 'en' ? 'In Transit' : 'Inaenda')
                  }
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div>
                  <p className="text-xs text-gray-500">{t('fertilizerType')}</p>
                  <p className="font-medium text-gray-900">{batch.fertilizerType}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t('totalBags')}</p>
                  <p className="font-medium text-gray-900">{batch.totalBags.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{language === 'en' ? 'Destination' : 'Enda'}</p>
                  <p className="font-medium text-gray-900">{batch.region} - {batch.district}</p>
                </div>
              </div>
              
              <TrustSeal 
                recordId={batch.id}
                timestamp={batch.timestamp || batch.dispatchDate}
                verifiedBy={batch.status === 'verified' ? 'Kagera Office & TCB' : 'TCB'}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
