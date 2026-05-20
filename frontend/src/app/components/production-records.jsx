import { useState } from 'react';
import { Plus, Search, Download, Leaf, TrendingUp, Award } from 'lucide-react';

const mockProduction = [
  {
    id: 'PROD-001',
    farmer: 'John Kamau',
    farmerId: 'F-2401',
    quantity: '120 kg',
    quality: 'AA',
    date: '2025-01-10',
    season: '2024/2025',
    moisture: '10.5%',
    blockHash: '0x7a3f9c2e1b4d',
  },
  {
    id: 'PROD-002',
    farmer: 'Mary Wanjiku',
    farmerId: 'F-2402',
    quantity: '95 kg',
    quality: 'AB',
    date: '2025-01-11',
    season: '2024/2025',
    moisture: '11.2%',
    blockHash: '0x8b4e1a3f2c5d',
  },
  {
    id: 'PROD-003',
    farmer: 'Peter Ochieng',
    farmerId: 'F-2403',
    quantity: '150 kg',
    quality: 'AA',
    date: '2025-01-12',
    season: '2024/2025',
    moisture: '10.8%',
    blockHash: '0x9c5d2b4e3a6f',
  },
  {
    id: 'PROD-004',
    farmer: 'Grace Akinyi',
    farmerId: 'F-2404',
    quantity: '85 kg',
    quality: 'AB',
    date: '2025-01-13',
    season: '2024/2025',
    moisture: '11.5%',
    blockHash: '0x1d6e3c5f4b7a',
  },
  {
    id: 'PROD-005',
    farmer: 'David Mutua',
    farmerId: 'F-2405',
    quantity: '110 kg',
    quality: 'AA',
    date: '2025-01-14',
    season: '2024/2025',
    moisture: '10.3%',
    blockHash: '0x2e7f4d6g5c8b',
  },
];

export function ProductionRecords() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    farmer: '',
    quantity: '',
    quality: '',
    moisture: '',
    date: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('New production record:', formData);
    setShowAddForm(false);
    setFormData({ farmer: '', quantity: '', quality: '', moisture: '', date: '' });
  };

  const filteredProduction = mockProduction.filter((prod) =>
    prod.farmer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prod.farmerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    prod.quality.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalProduction = mockProduction.reduce((sum, prod) => sum + parseInt(prod.quantity), 0);
  const aaGradeCount = mockProduction.filter((prod) => prod.quality === 'AA').length;
  const avgMoisture = (
    mockProduction.reduce((sum, prod) => sum + parseFloat(prod.moisture), 0) / mockProduction.length
  ).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Production Records</h2>
          <p className="text-gray-600 mt-1">Track seasonal coffee production and quality</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Record Production
        </button>
      </div>

      {/* Add Production Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Record New Production</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Farmer Name
                </label>
                <input
                  type="text"
                  value={formData.farmer}
                  onChange={(e) => setFormData({ ...formData, farmer: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity (kg)
                </label>
                <input
                  type="number"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quality Grade
                </label>
                <select
                  value={formData.quality}
                  onChange={(e) => setFormData({ ...formData, quality: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Select grade</option>
                  <option value="AA">AA (Premium)</option>
                  <option value="AB">AB (Good)</option>
                  <option value="C">C (Standard)</option>
                  <option value="PB">PB (Peaberry)</option>
                  <option value="E">E (Elephant)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Moisture Content (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.moisture}
                  onChange={(e) => setFormData({ ...formData, moisture: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Harvest Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  Record & Create Block
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <Leaf className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Production</p>
              <p className="text-2xl font-bold text-gray-900">{totalProduction} kg</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Award className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">AA Grade Count</p>
              <p className="text-2xl font-bold text-gray-900">{aaGradeCount}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Avg Moisture</p>
              <p className="text-2xl font-bold text-gray-900">{avgMoisture}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by farmer, ID, or quality grade..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="h-5 w-5" />
            Export
          </button>
        </div>
      </div>

      {/* Production Records Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quality</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Moisture</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Block Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProduction.map((prod) => (
                <tr key={prod.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{prod.id}</td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{prod.farmer}</p>
                      <p className="text-xs text-gray-500">{prod.farmerId}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{prod.quantity}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        prod.quality === 'AA'
                          ? 'bg-green-100 text-green-800'
                          : prod.quality === 'AB'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {prod.quality}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{prod.moisture}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{prod.date}</td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-600">{prod.blockHash}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
