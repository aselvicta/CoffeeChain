import { useState } from 'react';
import { Users, Plus, Search, Edit, Trash2, Phone, MapPin } from 'lucide-react';
import { useLanguage } from './language-context';
import { TrustSeal } from './trust-seal';

export function FarmerRegistry() {
  const { t, language } = useLanguage();
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    farmerId: '',
    phoneNumber: '',
    village: '',
    farmSize: '',
    coffeeVariety: ''
  });

  const [farmers, setFarmers] = useState([
    { 
      id: 'F-2401', 
      name: 'John Kamau', 
      phone: '+255 712 345 678', 
      village: 'Bukoba North', 
      farmSize: '2.5', 
      variety: 'Arabica',
      registered: '2025-01-15',
      status: 'active'
    },
    { 
      id: 'F-2402', 
      name: 'Mary Wanjiku', 
      phone: '+255 713 456 789', 
      village: 'Bukoba South', 
      farmSize: '1.8', 
      variety: 'Robusta',
      registered: '2025-01-20',
      status: 'active'
    },
    { 
      id: 'F-2403', 
      name: 'Peter Ochieng', 
      phone: '+255 714 567 890', 
      village: 'Bukoba East', 
      farmSize: '3.2', 
      variety: 'Arabica',
      registered: '2025-02-01',
      status: 'active'
    },
    { 
      id: 'F-2404', 
      name: 'Grace Akinyi', 
      phone: '+255 715 678 901', 
      village: 'Bukoba West', 
      farmSize: '2.0', 
      variety: 'Robusta',
      registered: '2025-02-10',
      status: 'active'
    },
    { 
      id: 'F-2405', 
      name: 'Daniel Mwangi', 
      phone: '+255 716 789 012', 
      village: 'Bukoba Central', 
      farmSize: '4.5', 
      variety: 'Arabica',
      registered: '2025-02-15',
      status: 'active'
    }
  ]);

  const coffeeVarieties = [
    { value: 'arabica', label: 'Arabica' },
    { value: 'robusta', label: 'Robusta' },
    { value: 'hybrid', label: language === 'en' ? 'Hybrid' : 'Mchanganyiko' }
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newFarmer = {
      id: `F-${2400 + farmers.length + 1}`,
      name: formData.name,
      phone: formData.phoneNumber,
      village: formData.village,
      farmSize: formData.farmSize,
      variety: coffeeVarieties.find(v => v.value === formData.coffeeVariety)?.label || formData.coffeeVariety,
      registered: new Date().toISOString().split('T')[0],
      status: 'active'
    };
    
    setFarmers([newFarmer, ...farmers]);
    setShowAddForm(false);
    setFormData({
      name: '',
      farmerId: '',
      phoneNumber: '',
      village: '',
      farmSize: '',
      coffeeVariety: ''
    });
  };

  const filteredFarmers = farmers.filter(farmer => 
    farmer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    farmer.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    farmer.village.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('farmerRegistry')}</h2>
          <p className="text-gray-600 mt-1">
            {language === 'en' 
              ? 'Manage farmers in your cooperative' 
              : 'Simamia wakulima katika ushirika wako'}
          </p>
        </div>
        
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          {language === 'en' ? 'Add Farmer' : 'Ongeza Mkulima'}
        </button>
      </div>

      {/* Add Farmer Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold">
              {language === 'en' ? 'Register New Farmer' : 'Sajili Mkulima Mpya'}
            </h3>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('farmerName')}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={language === 'en' ? 'Full name' : 'Jina kamili'}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Phone className="inline w-4 h-4 mr-1" />
                  {language === 'en' ? 'Phone Number' : 'Nambari ya Simu'}
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="+255 7XX XXX XXX"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <MapPin className="inline w-4 h-4 mr-1" />
                  {language === 'en' ? 'Village' : 'Kijiji'}
                </label>
                <input
                  type="text"
                  value={formData.village}
                  onChange={(e) => setFormData({...formData, village: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder={language === 'en' ? 'Village name' : 'Jina la kijiji'}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'en' ? 'Farm Size (hectares)' : 'Ukubwa wa Shamba (hekta)'}
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.farmSize}
                  onChange={(e) => setFormData({...formData, farmSize: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="2.5"
                  required
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'en' ? 'Coffee Variety' : 'Aina ya Kahawa'}
                </label>
                <select
                  value={formData.coffeeVariety}
                  onChange={(e) => setFormData({...formData, coffeeVariety: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                >
                  <option value="">
                    {language === 'en' ? 'Select variety...' : 'Chagua aina...'}
                  </option>
                  {coffeeVarieties.map(variety => (
                    <option key={variety.value} value={variety.value}>{variety.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {language === 'en' ? 'Register Farmer' : 'Sajili Mkulima'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">
            {language === 'en' ? 'Total Farmers' : 'Jumla Wakulima'}
          </p>
          <p className="text-2xl font-bold text-gray-900">{farmers.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">
            {language === 'en' ? 'Active' : 'Hai'}
          </p>
          <p className="text-2xl font-bold text-green-600">
            {farmers.filter(f => f.status === 'active').length}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">
            {language === 'en' ? 'Total Farm Size' : 'Jumla Shamba'}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {farmers.reduce((sum, f) => sum + parseFloat(f.farmSize), 0).toFixed(1)} ha
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-600 mb-1">
            {language === 'en' ? 'Arabica Farmers' : 'Wakulima Arabica'}
          </p>
          <p className="text-2xl font-bold text-gray-900">
            {farmers.filter(f => f.variety === 'Arabica').length}
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder={language === 'en' ? 'Search farmers by name, ID, or village...' : 'Tafuta wakulima kwa jina, nambari, au kijiji...'}
          />
        </div>
      </div>

      {/* Farmers Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('farmerId')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {t('farmerName')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Phone' : 'Simu'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Village' : 'Kijiji'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Farm Size' : 'Shamba'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Variety' : 'Aina'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Status' : 'Hali'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Actions' : 'Vitendo'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredFarmers.map((farmer) => (
                <tr key={farmer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{farmer.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{farmer.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{farmer.phone}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{farmer.village}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{farmer.farmSize} ha</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{farmer.variety}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      {language === 'en' ? 'Active' : 'Hai'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="p-1 text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty State */}
      {filteredFarmers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {language === 'en' ? 'No farmers found' : 'Hakuna wakulima waliopatikana'}
          </p>
        </div>
      )}
    </div>
  );
}
