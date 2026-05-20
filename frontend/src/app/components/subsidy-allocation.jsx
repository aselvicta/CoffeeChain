import { useState } from 'react';
import { Package, Send, CheckCircle, Clock, AlertCircle, MapPin } from 'lucide-react';

const regions = [
  { id: 'northern', name: 'Northern Region', cooperatives: 12 },
  { id: 'southern', name: 'Southern Region', cooperatives: 8 },
  { id: 'eastern', name: 'Eastern Region', cooperatives: 10 },
  { id: 'western', name: 'Western Region', cooperatives: 7 },
  { id: 'central', name: 'Central Region', cooperatives: 9 },
];

const cooperatives = {
  northern: [
    { id: 'moshi', name: 'Moshi Farmers Cooperative', district: 'Moshi District' },
    { id: 'arusha', name: 'Arusha Coffee Growers', district: 'Arusha District' },
  ],
  southern: [
    { id: 'mbeya', name: 'Mbeya Coffee Union', district: 'Mbeya District' },
  ],
};

const subsidyTypes = [
  { id: 'fertilizer', name: 'Fertilizer (NPK)', unit: 'bags' },
  { id: 'pesticide', name: 'Pesticide', unit: 'liters' },
  { id: 'tools', name: 'Farm Tools', unit: 'sets' },
  { id: 'seeds', name: 'Coffee Seeds', unit: 'kg' },
];

const mockNationalAllocations = [
  {
    id: 'NAT-001',
    subsidyType: 'Fertilizer (NPK)',
    quantity: 500,
    unit: 'bags',
    recipient: 'Northern Region',
    allocatedBy: 'National Admin',
    date: '2025-01-19 10:30',
    status: 'approved',
    notes: 'Q1 allocation for northern zone cooperatives',
  },
  {
    id: 'NAT-002',
    subsidyType: 'Pesticide',
    quantity: 200,
    unit: 'liters',
    recipient: 'Central Region',
    allocatedBy: 'National Admin',
    date: '2025-01-18 14:20',
    status: 'pending',
    notes: 'Pest control program',
  },
];

const mockRegionalAllocations = [
  {
    id: 'REG-001',
    subsidyType: 'Fertilizer (NPK)',
    quantity: 150,
    unit: 'bags',
    recipient: 'Moshi Farmers Cooperative',
    allocatedBy: 'Regional Officer',
    date: '2025-01-19 11:45',
    status: 'approved',
    fromAllocation: 'NAT-001',
  },
  {
    id: 'REG-002',
    subsidyType: 'Fertilizer (NPK)',
    quantity: 120,
    unit: 'bags',
    recipient: 'Arusha Coffee Growers',
    allocatedBy: 'Regional Officer',
    date: '2025-01-19 12:00',
    status: 'pending',
    fromAllocation: 'NAT-001',
  },
];

export function SubsidyAllocation({ userRole }) {
  const [showAllocationForm, setShowAllocationForm] = useState(false);
  const [allocationData, setAllocationData] = useState({
    subsidyType: '',
    quantity: '',
    recipient: '',
    notes: '',
  });

  const handleSubmitAllocation = (e) => {
    e.preventDefault();
    // In production, this would submit to blockchain
    alert(`Subsidy allocation submitted successfully!\n\nType: ${allocationData.subsidyType}\nQuantity: ${allocationData.quantity}\nRecipient: ${allocationData.recipient}`);
    setShowAllocationForm(false);
    setAllocationData({
      subsidyType: '',
      quantity: '',
      recipient: '',
      notes: '',
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3" />
            Approved
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <AlertCircle className="h-3 w-3" />
            Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const getRecipientOptions = () => {
    if (userRole === 'national') {
      return regions;
    } else if (userRole === 'regional') {
      return cooperatives.northern || [];
    }
    return [];
  };

  const allocations = userRole === 'national' ? mockNationalAllocations : mockRegionalAllocations;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subsidy Allocation</h2>
          <p className="text-gray-600 mt-1">
            {userRole === 'national'
              ? 'Allocate subsidies to regional offices'
              : userRole === 'regional'
              ? 'Distribute subsidies to cooperatives'
              : 'View received subsidies'}
          </p>
        </div>
        {(userRole === 'national' || userRole === 'regional') && (
          <button
            onClick={() => setShowAllocationForm(!showAllocationForm)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Send className="h-5 w-5" />
            New Allocation
          </button>
        )}
      </div>

      {/* Allocation Form */}
      {showAllocationForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Create New Allocation</h3>
          <form onSubmit={handleSubmitAllocation} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subsidy Type
                </label>
                <select
                  value={allocationData.subsidyType}
                  onChange={(e) =>
                    setAllocationData({ ...allocationData, subsidyType: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Select type</option>
                  {subsidyTypes.map((type) => (
                    <option key={type.id} value={type.name}>
                      {type.name} ({type.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity
                </label>
                <input
                  type="number"
                  value={allocationData.quantity}
                  onChange={(e) =>
                    setAllocationData({ ...allocationData, quantity: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter quantity"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {userRole === 'national' ? 'Region' : 'Cooperative'}
              </label>
              <select
                value={allocationData.recipient}
                onChange={(e) =>
                  setAllocationData({ ...allocationData, recipient: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Select recipient</option>
                {getRecipientOptions().map((option) => (
                  <option key={option.id} value={option.name}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes / Purpose
              </label>
              <textarea
                value={allocationData.notes}
                onChange={(e) =>
                  setAllocationData({ ...allocationData, notes: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                rows="3"
                placeholder="Enter allocation notes or purpose"
              ></textarea>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Submit Allocation
              </button>
              <button
                type="button"
                onClick={() => setShowAllocationForm(false)}
                className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Allocations</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{allocations.length}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Approved</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {allocations.filter((a) => a.status === 'approved').length}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {allocations.filter((a) => a.status === 'pending').length}
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Allocations Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            {userRole === 'national' ? 'National Allocations' : 'Regional Distributions'}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Subsidy Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Quantity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Recipient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {allocations.map((allocation) => (
                <tr key={allocation.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {allocation.id}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{allocation.subsidyType}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {allocation.quantity} {allocation.unit}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">{allocation.recipient}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{allocation.date}</td>
                  <td className="px-6 py-4">{getStatusBadge(allocation.status)}</td>
                  <td className="px-6 py-4">
                    <button className="text-sm text-green-600 hover:text-green-700 font-medium">
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
