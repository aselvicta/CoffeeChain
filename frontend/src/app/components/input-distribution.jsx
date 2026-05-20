import { useState } from 'react';
import { Plus, Search, Filter, Download, Package, Calendar, User, Scale } from 'lucide-react';
import { HashTrail } from './hash-trail';

const mockDistributions = [
  {
    id: 'DIST-001',
    farmer: 'John Kamau',
    farmerId: 'F-2401',
    inputType: 'Fertilizer - NPK 17-17-17',
    quantity: '5 bags (50kg each)',
    date: '2025-01-10',
    season: '2024/2025',
    status: 'delivered',
    blockHash: '0x7a3f9c2e1b4d',
  },
  {
    id: 'DIST-002',
    farmer: 'Mary Wanjiku',
    farmerId: 'F-2402',
    inputType: 'Pesticide - Coffee Berry Disease',
    quantity: '2 liters',
    date: '2025-01-12',
    season: '2024/2025',
    status: 'delivered',
    blockHash: '0x8b4e1a3f2c5d',
  },
  {
    id: 'DIST-003',
    farmer: 'Peter Ochieng',
    farmerId: 'F-2403',
    inputType: 'Coffee Seedlings - Ruiru 11',
    quantity: '100 seedlings',
    date: '2025-01-14',
    season: '2024/2025',
    status: 'pending',
    blockHash: null,
  },
  {
    id: 'DIST-004',
    farmer: 'Grace Akinyi',
    farmerId: 'F-2404',
    inputType: 'Pruning Tools',
    quantity: '1 set',
    date: '2025-01-15',
    season: '2024/2025',
    status: 'delivered',
    blockHash: '0x9c5d2b4e3a6f',
  },
];

export function InputDistribution() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    farmer: '',
    inputType: '',
    quantity: '',
    date: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // In production, this would create a blockchain transaction
    console.log('New distribution:', formData);
    setShowAddForm(false);
    setFormData({ farmer: '', inputType: '', quantity: '', date: '' });
  };

  const filteredDistributions = mockDistributions.filter((dist) =>
    dist.farmer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dist.farmerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dist.inputType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Input Distribution</h2>
          <p className="text-gray-600 mt-1">Manage and track agricultural input distribution</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          New Distribution
        </button>
      </div>

      {/* Add Distribution Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Record New Distribution</h3>
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
                  Input Type
                </label>
                <select
                  value={formData.inputType}
                  onChange={(e) => setFormData({ ...formData, inputType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Select input type</option>
                  <option value="Fertilizer - NPK 17-17-17">Fertilizer - NPK 17-17-17</option>
                  <option value="Fertilizer - Organic Compost">Fertilizer - Organic Compost</option>
                  <option value="Pesticide - Coffee Berry Disease">Pesticide - Coffee Berry Disease</option>
                  <option value="Pesticide - Leaf Rust">Pesticide - Leaf Rust</option>
                  <option value="Coffee Seedlings - Ruiru 11">Coffee Seedlings - Ruiru 11</option>
                  <option value="Coffee Seedlings - Batian">Coffee Seedlings - Batian</option>
                  <option value="Pruning Tools">Pruning Tools</option>
                  <option value="Harvesting Baskets">Harvesting Baskets</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity
                </label>
                <input
                  type="text"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder="e.g., 5 bags, 2 liters"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Distribution Date
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
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Scale className="h-4 w-4" />
                  Commit to Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by farmer, ID, or input type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="h-5 w-5" />
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Download className="h-5 w-5" />
            Export
          </button>
        </div>
      </div>

      {/* Distribution Records */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Input Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDistributions.map((dist) => (
                <>
                  <tr key={dist.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{dist.id}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{dist.farmer}</p>
                        <p className="text-xs text-gray-500">{dist.farmerId}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{dist.inputType}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{dist.quantity}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{dist.date}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          dist.status === 'delivered'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {dist.status}
                      </span>
                    </td>
                  </tr>
                  {dist.blockHash && (
                    <tr>
                      <td colSpan="6" className="px-0 py-0">
                        <HashTrail
                          hash={dist.blockHash}
                          blockNumber={Math.floor(Math.random() * 1000) + 1200}
                          timestamp={dist.date}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 p-3 rounded-lg">
              <Package className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Distributions</p>
              <p className="text-2xl font-bold text-gray-900">1,247</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">124</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-3 rounded-lg">
              <User className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Farmers Served</p>
              <p className="text-2xl font-bold text-gray-900">342</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}