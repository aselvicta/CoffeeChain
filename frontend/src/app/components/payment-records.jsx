import { useState } from 'react';
import { Plus, Search, Download, DollarSign, CheckCircle, Clock } from 'lucide-react';

const mockPayments = [
  {
    id: 'PAY-001',
    farmer: 'John Kamau',
    farmerId: 'F-2401',
    amount: 450.00,
    quantity: '120 kg',
    pricePerKg: 3.75,
    date: '2025-01-10',
    status: 'completed',
    method: 'M-Pesa',
    blockHash: '0x7a3f9c2e1b4d',
  },
  {
    id: 'PAY-002',
    farmer: 'Mary Wanjiku',
    farmerId: 'F-2402',
    amount: 356.25,
    quantity: '95 kg',
    pricePerKg: 3.75,
    date: '2025-01-11',
    status: 'completed',
    method: 'Bank Transfer',
    blockHash: '0x8b4e1a3f2c5d',
  },
  {
    id: 'PAY-003',
    farmer: 'Peter Ochieng',
    farmerId: 'F-2403',
    amount: 562.50,
    quantity: '150 kg',
    pricePerKg: 3.75,
    date: '2025-01-12',
    status: 'completed',
    method: 'M-Pesa',
    blockHash: '0x9c5d2b4e3a6f',
  },
  {
    id: 'PAY-004',
    farmer: 'Grace Akinyi',
    farmerId: 'F-2404',
    amount: 318.75,
    quantity: '85 kg',
    pricePerKg: 3.75,
    date: '2025-01-13',
    status: 'pending',
    method: 'M-Pesa',
    blockHash: null,
  },
  {
    id: 'PAY-005',
    farmer: 'David Mutua',
    farmerId: 'F-2405',
    amount: 412.50,
    quantity: '110 kg',
    pricePerKg: 3.75,
    date: '2025-01-14',
    status: 'processing',
    method: 'Bank Transfer',
    blockHash: null,
  },
];

export function PaymentRecords() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    farmer: '',
    quantity: '',
    pricePerKg: '3.75',
    method: '',
    date: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const amount = parseFloat(formData.quantity) * parseFloat(formData.pricePerKg);
    console.log('New payment:', { ...formData, amount });
    setShowAddForm(false);
    setFormData({ farmer: '', quantity: '', pricePerKg: '3.75', method: '', date: '' });
  };

  const filteredPayments = mockPayments.filter((pay) =>
    pay.farmer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pay.farmerId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pay.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPaid = mockPayments
    .filter((p) => p.status === 'completed')
    .reduce((sum, p) => sum + p.amount, 0);
  const pendingAmount = mockPayments
    .filter((p) => p.status === 'pending' || p.status === 'processing')
    .reduce((sum, p) => sum + p.amount, 0);
  const completionRate = (
    (mockPayments.filter((p) => p.status === 'completed').length / mockPayments.length) *
    100
  ).toFixed(0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Payment Records</h2>
          <p className="text-gray-600 mt-1">Manage farmer payments and compensation</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Record Payment
        </button>
      </div>

      {/* Add Payment Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Record New Payment</h3>
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
                  Price per kg ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.pricePerKg}
                  onChange={(e) => setFormData({ ...formData, pricePerKg: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              {formData.quantity && formData.pricePerKg && (
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">Total Amount:</p>
                  <p className="text-xl font-bold text-green-700">
                    ${(parseFloat(formData.quantity) * parseFloat(formData.pricePerKg)).toFixed(2)}
                  </p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={formData.method}
                  onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Select method</option>
                  <option value="M-Pesa">M-Pesa</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date
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
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Paid</p>
              <p className="text-2xl font-bold text-gray-900">${totalPaid.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending Amount</p>
              <p className="text-2xl font-bold text-gray-900">${pendingAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{completionRate}%</p>
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
              placeholder="Search by farmer, ID, or payment details..."
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

      {/* Payment Records Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price/kg</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Block Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPayments.map((pay) => (
                <tr key={pay.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{pay.id}</td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{pay.farmer}</p>
                      <p className="text-xs text-gray-500">{pay.farmerId}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{pay.quantity}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">${pay.pricePerKg}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">${pay.amount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{pay.method}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{pay.date}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        pay.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : pay.status === 'processing'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {pay.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-gray-600">
                    {pay.blockHash || 'Pending...'}
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
