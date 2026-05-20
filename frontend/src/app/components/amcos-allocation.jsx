import { useState } from 'react';
import { Building2, Send } from 'lucide-react';
import { useLanguage } from './language-context';
import { TrustSeal } from './trust-seal';

export function AmcosAllocation() {
  const { language } = useLanguage();
  const [formData, setFormData] = useState({
    batchId: '',
    amcos: '',
    bags: ''
  });

  const [allocations, setAllocations] = useState([
    {
      id: 'ALLOC-001',
      batchId: 'TCB-KGR-2026-004',
      amcos: 'Bukoba AMCOS',
      bags: 200,
      timestamp: '2026-02-23 10:30',
      status: 'allocated',
      verificationId: 'VRF-23103000'
    },
    {
      id: 'ALLOC-002',
      batchId: 'TCB-KGR-2026-004',
      amcos: 'Ngara AMCOS',
      bags: 150,
      timestamp: '2026-02-23 11:00',
      status: 'allocated',
      verificationId: 'VRF-23110000'
    }
  ]);

  const availableBatches = [
    { id: 'TCB-KGR-2026-004', type: 'DAP', bags: 350, allocated: 350 },
    { id: 'TCB-KGR-2026-005', type: 'NPK 20-10-10', bags: 500, allocated: 0 }
  ];

  const amcosList = [
    'Bukoba AMCOS',
    'Ngara AMCOS',
    'Karagwe AMCOS',
    'Muleba AMCOS',
    'Biharamulo AMCOS'
  ];

  const handleAllocate = () => {
    if (!formData.batchId || !formData.amcos || !formData.bags) {
      alert(language === 'en' ? 'Please fill in all fields' : 'Tafadhali jaza sehemu zote');
      return;
    }

    const newAllocation = {
      id: `ALLOC-${String(allocations.length + 1).padStart(3, '0')}`,
      batchId: formData.batchId,
      amcos: formData.amcos,
      bags: parseInt(formData.bags),
      timestamp: new Date().toLocaleString(),
      status: 'allocated',
      verificationId: `VRF-${Date.now().toString().slice(-8)}`
    };

    setAllocations([newAllocation, ...allocations]);
    setFormData({ batchId: '', amcos: '', bags: '' });
    alert(language === 'en' ? 'Allocation successful!' : 'Ugawaji umefanikiwa!');
  };

  const totalAllocated = allocations.reduce((sum, a) => sum + a.bags, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {language === 'en' ? 'AMCOS Allocation' : 'Ugawaji wa AMCOS'}
        </h2>
        <p className="text-gray-600 mt-1">
          {language === 'en' 
            ? 'Distribute fertilizer batches to cooperatives' 
            : 'Sambaza makundi ya mbolea kwa vyama vya ushirika'}
        </p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'en' ? 'Available Batches' : 'Makundi Yaliyopatikana'}
          </p>
          <p className="text-3xl font-bold text-gray-900">{availableBatches.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'en' ? 'Total Allocated' : 'Jumla Iliyogawanywa'}
          </p>
          <p className="text-3xl font-bold text-gray-900">{totalAllocated}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'en' ? 'Active AMCOS' : 'AMCOS Hai'}
          </p>
          <p className="text-3xl font-bold text-gray-900">{amcosList.length}</p>
        </div>
      </div>

      {/* Allocation Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-6">
          {language === 'en' ? 'Create New Allocation' : 'Tengeneza Ugawaji Mpya'}
        </h3>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'en' ? 'Select Batch' : 'Chagua Kundi'}
            </label>
            <select
              value={formData.batchId}
              onChange={(e) => setFormData({...formData, batchId: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{language === 'en' ? 'Select batch...' : 'Chagua kundi...'}</option>
              {availableBatches.map(batch => (
                <option key={batch.id} value={batch.id}>
                  {batch.id} - {batch.type} ({batch.bags - batch.allocated} bags available)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'en' ? 'Select AMCOS' : 'Chagua AMCOS'}
            </label>
            <select
              value={formData.amcos}
              onChange={(e) => setFormData({...formData, amcos: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{language === 'en' ? 'Select AMCOS...' : 'Chagua AMCOS...'}</option>
              {amcosList.map(amcos => (
                <option key={amcos} value={amcos}>{amcos}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'en' ? 'Number of Bags' : 'Idadi ya Mifuko'}
            </label>
            <input
              type="number"
              value={formData.bags}
              onChange={(e) => setFormData({...formData, bags: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={language === 'en' ? 'Enter bags' : 'Weka mifuko'}
            />
          </div>
        </div>

        <button
          onClick={handleAllocate}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
        >
          <Send className="w-5 h-5" />
          {language === 'en' ? 'Allocate to AMCOS' : 'Gawia AMCOS'}
        </button>
      </div>

      {/* Recent Allocations */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            {language === 'en' ? 'Recent Allocations' : 'Ugawaji wa Hivi Karibuni'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Allocation ID' : 'Nambari ya Ugawaji'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Batch ID' : 'Nambari ya Kundi'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  AMCOS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Bags' : 'Mifuko'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Timestamp' : 'Muda'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Verification' : 'Uthibitisho'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {allocations.map((allocation) => (
                <tr key={allocation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{allocation.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{allocation.batchId}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{allocation.amcos}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{allocation.bags}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{allocation.timestamp}</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-600">{allocation.verificationId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
