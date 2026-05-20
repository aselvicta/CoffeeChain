import { useState } from 'react';
import { Package, TrendingDown, TrendingUp, AlertTriangle, Plus, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useLanguage } from './language-context';

export function StockInventory() {
  const { t, language } = useLanguage();
  
  const [inventory, setInventory] = useState([
    {
      id: 'INV-001',
      fertilizerType: 'NPK 20-10-10',
      currentStock: 15000,
      minThreshold: 5000,
      maxCapacity: 50000,
      unit: 'bags',
      location: 'National Warehouse - Dodoma',
      lastRestocked: '2026-02-20',
      nextRestock: '2026-03-15',
      monthlyConsumption: 3500,
      status: 'healthy'
    },
    {
      id: 'INV-002',
      fertilizerType: 'DAP',
      currentStock: 8500,
      minThreshold: 4000,
      maxCapacity: 30000,
      unit: 'bags',
      location: 'National Warehouse - Dodoma',
      lastRestocked: '2026-02-18',
      nextRestock: '2026-03-10',
      monthlyConsumption: 2800,
      status: 'healthy'
    },
    {
      id: 'INV-003',
      fertilizerType: 'Urea (46% N)',
      currentStock: 3200,
      minThreshold: 3000,
      maxCapacity: 25000,
      unit: 'bags',
      location: 'National Warehouse - Dodoma',
      lastRestocked: '2026-02-15',
      nextRestock: '2026-02-28',
      monthlyConsumption: 2200,
      status: 'warning'
    },
    {
      id: 'INV-004',
      fertilizerType: 'Organic Compost',
      currentStock: 1500,
      minThreshold: 2000,
      maxCapacity: 20000,
      unit: 'bags',
      location: 'National Warehouse - Dodoma',
      lastRestocked: '2026-02-10',
      nextRestock: '2026-02-25',
      monthlyConsumption: 1200,
      status: 'critical'
    },
    {
      id: 'INV-005',
      fertilizerType: 'CAN',
      currentStock: 6800,
      minThreshold: 3500,
      maxCapacity: 28000,
      unit: 'bags',
      location: 'National Warehouse - Dodoma',
      lastRestocked: '2026-02-22',
      nextRestock: '2026-03-20',
      monthlyConsumption: 1800,
      status: 'healthy'
    }
  ]);

  const [movements, setMovements] = useState([
    {
      id: 'MOV-001',
      type: 'out',
      fertilizerType: 'NPK 20-10-10',
      quantity: 500,
      destination: 'Kagera Region',
      date: '2026-02-23',
      batchId: 'TCB-KGR-2026-005'
    },
    {
      id: 'MOV-002',
      type: 'in',
      fertilizerType: 'DAP',
      quantity: 2000,
      source: 'International Supplier - Kenya',
      date: '2026-02-22',
      batchId: 'IMP-2026-012'
    },
    {
      id: 'MOV-003',
      type: 'out',
      fertilizerType: 'Urea (46% N)',
      quantity: 450,
      destination: 'Kilimanjaro Region',
      date: '2026-02-22',
      batchId: 'TCB-KIL-2026-003'
    }
  ]);

  const monthlyData = [
    { month: 'Aug', inbound: 12000, outbound: 8500 },
    { month: 'Sep', inbound: 15000, outbound: 10200 },
    { month: 'Oct', inbound: 18000, outbound: 12800 },
    { month: 'Nov', inbound: 14000, outbound: 11500 },
    { month: 'Dec', inbound: 16000, outbound: 13200 },
    { month: 'Jan', inbound: 20000, outbound: 14800 },
    { month: 'Feb', inbound: 8500, outbound: 6200 }
  ];

  const totalStock = inventory.reduce((sum, item) => sum + item.currentStock, 0);
  const totalCapacity = inventory.reduce((sum, item) => sum + item.maxCapacity, 0);
  const utilizationRate = Math.round((totalStock / totalCapacity) * 100);
  const criticalItems = inventory.filter(item => item.status === 'critical').length;
  const warningItems = inventory.filter(item => item.status === 'warning').length;

  const getStatusColor = (status) => {
    switch(status) {
      case 'healthy': return 'bg-green-100 text-green-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStockPercentage = (item) => {
    return Math.round((item.currentStock / item.maxCapacity) * 100);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          {language === 'en' ? 'Stock Inventory' : 'Hesabu ya Hifadhi'}
        </h2>
        <p className="text-gray-600 mt-1">
          {language === 'en' 
            ? 'National fertilizer stock management and tracking' 
            : 'Usimamizi na ufuatiliaji wa hisa ya mbolea ya taifa'}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">
              {language === 'en' ? 'Total Stock' : 'Jumla Hisa'}
            </p>
            <Package className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalStock.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">
            {language === 'en' ? 'bags' : 'mifuko'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">
              {language === 'en' ? 'Utilization' : 'Matumizi'}
            </p>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-blue-600">{utilizationRate}%</p>
          <p className="text-xs text-gray-500 mt-1">
            {language === 'en' ? 'of capacity' : 'ya uwezo'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">
              {language === 'en' ? 'Low Stock Items' : 'Bidhaa za Hisa Chini'}
            </p>
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          </div>
          <p className="text-3xl font-bold text-yellow-600">{warningItems}</p>
          <p className="text-xs text-gray-500 mt-1">
            {language === 'en' ? 'need restock' : 'wanahitaji kujazwa'}
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">
              {language === 'en' ? 'Critical Items' : 'Bidhaa za Dharura'}
            </p>
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-3xl font-bold text-red-600">{criticalItems}</p>
          <p className="text-xs text-gray-500 mt-1">
            {language === 'en' ? 'urgent action' : 'hatua ya haraka'}
          </p>
        </div>
      </div>

      {/* Current Inventory Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            {language === 'en' ? 'Current Inventory Levels' : 'Viwango vya Hisa ya Sasa'}
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Fertilizer Type' : 'Aina ya Mbolea'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Current Stock' : 'Hisa ya Sasa'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Stock Level' : 'Kiwango cha Hisa'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Monthly Usage' : 'Matumizi ya Kila Mwezi'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Days Remaining' : 'Siku Zilizobaki'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  {language === 'en' ? 'Status' : 'Hali'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {inventory.map((item) => {
                const daysRemaining = Math.floor((item.currentStock / item.monthlyConsumption) * 30);
                const stockPercentage = getStockPercentage(item);
                
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{item.fertilizerType}</p>
                        <p className="text-xs text-gray-500">{item.location}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-gray-900">
                        {item.currentStock.toLocaleString()} {language === 'en' ? 'bags' : 'mifuko'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {language === 'en' ? 'of' : 'ya'} {item.maxCapacity.toLocaleString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            stockPercentage > 50 ? 'bg-green-500' :
                            stockPercentage > 20 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${stockPercentage}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-1">{stockPercentage}%</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.monthlyConsumption.toLocaleString()} {language === 'en' ? 'bags/mo' : 'mifuko/mwezi'}
                    </td>
                    <td className="px-6 py-4">
                      <p className={`text-sm font-medium ${
                        daysRemaining > 30 ? 'text-green-600' :
                        daysRemaining > 15 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {daysRemaining} {language === 'en' ? 'days' : 'siku'}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(item.status)}`}>
                        {item.status === 'healthy' ? (language === 'en' ? 'Healthy' : 'Nzuri') :
                         item.status === 'warning' ? (language === 'en' ? 'Low Stock' : 'Hisa Chini') :
                         (language === 'en' ? 'Critical' : 'Dharura')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Stock Movements */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">
            {language === 'en' ? 'Recent Stock Movements' : 'Mabadiliko ya Hisa ya Hivi Karibuni'}
          </h3>
        </div>

        <div className="p-6 space-y-3">
          {movements.map((movement) => (
            <div key={movement.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${
                  movement.type === 'in' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {movement.type === 'in' ? (
                    <Plus className="w-5 h-5 text-green-600" />
                  ) : (
                    <Minus className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {movement.type === 'in' 
                      ? (language === 'en' ? 'Received' : 'Imepokelewa')
                      : (language === 'en' ? 'Dispatched' : 'Imetumwa')
                    }
                  </p>
                  <p className="text-sm text-gray-600">
                    {movement.quantity.toLocaleString()} {language === 'en' ? 'bags of' : 'mifuko ya'} {movement.fertilizerType}
                  </p>
                  <p className="text-xs text-gray-500">
                    {movement.type === 'in' 
                      ? `${language === 'en' ? 'From' : 'Kutoka'}: ${movement.source}`
                      : `${language === 'en' ? 'To' : 'Kwenda'}: ${movement.destination}`
                    }
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">{movement.date}</p>
                <p className="text-xs text-gray-500">{movement.batchId}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stock Movement Chart */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {language === 'en' ? 'Monthly Stock Flow' : 'Mtiririko wa Hisa wa Kila Mwezi'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="inbound" fill="#16a34a" name={language === 'en' ? 'Inbound' : 'Inayoingia'} />
              <Bar dataKey="outbound" fill="#ef4444" name={language === 'en' ? 'Outbound' : 'Inayotoka'} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {language === 'en' ? 'Inventory by Type' : 'Hisa kwa Aina'}
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={inventory} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="fertilizerType" type="category" width={150} />
              <Tooltip />
              <Bar dataKey="currentStock" fill="#7c3aed" name={language === 'en' ? 'Stock' : 'Hisa'} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
