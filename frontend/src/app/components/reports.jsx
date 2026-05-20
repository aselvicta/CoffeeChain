import { useState } from 'react';
import { Download, FileText, Calendar, Filter } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLanguage } from './language-context';

const monthlyPerformance = [
  { month: 'Jul 24', production: 4200, payments: 15750, farmers: 298 },
  { month: 'Aug 24', production: 5800, payments: 21750, farmers: 310 },
  { month: 'Sep 24', production: 7200, payments: 27000, farmers: 325 },
  { month: 'Oct 24', production: 8900, payments: 33375, farmers: 332 },
  { month: 'Nov 24', production: 10500, payments: 39375, farmers: 338 },
  { month: 'Dec 24', production: 9800, payments: 36750, farmers: 340 },
  { month: 'Jan 25', production: 8200, payments: 30750, farmers: 342 },
];

const farmerPerformance = [
  { name: 'Top 20%', value: 35, count: 68 },
  { name: 'High', value: 25, count: 85 },
  { name: 'Medium', value: 30, count: 103 },
  { name: 'Low', value: 10, count: 86 },
];

const qualityDistribution = [
  { grade: 'AA', count: 145, percentage: 42 },
  { grade: 'AB', count: 120, percentage: 35 },
  { grade: 'C', count: 52, percentage: 15 },
  { grade: 'PB', count: 18, percentage: 5 },
  { grade: 'E', count: 10, percentage: 3 },
];

const COLORS = ['#16a34a', '#22c55e', '#4ade80', '#86efac'];

export function Reports() {
  const { language } = useLanguage();
  const [reportType, setReportType] = useState('overview');
  const [dateRange, setDateRange] = useState('season');

  const generateReport = () => {
    console.log('Generating report:', reportType, dateRange);
    alert(language === 'en' ? 'Report generated successfully!' : 'Ripoti imetengenezwa kwa mafanikio!');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {language === 'en' ? 'Reports & Analytics' : 'Ripoti na Uchambuzi'}
          </h2>
          <p className="text-gray-600 mt-1">
            {language === 'en' 
              ? 'Comprehensive cooperative performance insights' 
              : 'Maarifa kamili ya utendaji wa ushirika'}
          </p>
        </div>
        <button
          onClick={generateReport}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="h-5 w-5" />
          {language === 'en' ? 'Export Report' : 'Hamisha Ripoti'}
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'en' ? 'Total Production' : 'Jumla Uzalishaji'}
          </p>
          <p className="text-3xl font-bold text-gray-900">54,700 kg</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'en' ? 'Active Farmers' : 'Wakulima Hai'}
          </p>
          <p className="text-3xl font-bold text-gray-900">342</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'en' ? 'Fertilizer Distributed' : 'Mbolea Iliyogawanywa'}
          </p>
          <p className="text-3xl font-bold text-gray-900">1,247 bags</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <p className="text-sm text-gray-600 mb-2">
            {language === 'en' ? 'Average Quality' : 'Ubora wa Wastani'}
          </p>
          <p className="text-3xl font-bold text-gray-900">AA</p>
        </div>
      </div>

      {/* Report Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="overview">Performance Overview</option>
              <option value="production">Production Analysis</option>
              <option value="payments">Payment Summary</option>
              <option value="distribution">Input Distribution</option>
              <option value="quality">Quality Assessment</option>
              <option value="blockchain">Blockchain Audit</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Date Range
            </label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="season">Current Season (2024/2025)</option>
              <option value="month">This Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Format
            </label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="pdf">PDF Document</option>
              <option value="excel">Excel Spreadsheet</option>
              <option value="csv">CSV File</option>
            </select>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Production Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="production" stroke="#16a34a" strokeWidth={2} name="Production (kg)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Farmer Performance Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Farmer Performance Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={farmerPerformance}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {farmerPerformance.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Quality Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Coffee Quality Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={qualityDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="grade" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#16a34a" name="Batches" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment vs Production */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Production vs Payments</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyPerformance}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="production" stroke="#16a34a" strokeWidth={2} name="Production (kg)" />
              <Line yAxisId="right" type="monotone" dataKey="payments" stroke="#3b82f6" strokeWidth={2} name="Payments ($)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Available Reports */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Available Reports</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { name: 'Seasonal Summary Report', date: '2025-01-15', type: 'PDF' },
              { name: 'Farmer Payment Details', date: '2025-01-14', type: 'Excel' },
              { name: 'Production Quality Analysis', date: '2025-01-13', type: 'PDF' },
              { name: 'Input Distribution Log', date: '2025-01-12', type: 'CSV' },
              { name: 'Blockchain Audit Trail', date: '2025-01-11', type: 'PDF' },
              { name: 'Monthly Performance', date: '2025-01-10', type: 'Excel' },
            ].map((report, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:border-green-500 transition-colors cursor-pointer">
                <div className="flex items-start gap-3">
                  <div className="bg-green-100 p-2 rounded">
                    <FileText className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">{report.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">Generated: {report.date}</p>
                    <p className="text-xs text-gray-500">Format: {report.type}</p>
                  </div>
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <Download className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Data Insights */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Key Insights & Recommendations</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg">
            <div className="h-2 w-2 bg-green-600 rounded-full mt-2"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Production Performance</p>
              <p className="text-sm text-gray-600 mt-1">
                Coffee production increased by 18% compared to last season. Top 20% of farmers contribute 35% of total production.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg">
            <div className="h-2 w-2 bg-blue-600 rounded-full mt-2"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Quality Achievement</p>
              <p className="text-sm text-gray-600 mt-1">
                77% of production achieved AA-AB premium grades. Consider targeted training for farmers producing lower grades.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-lg">
            <div className="h-2 w-2 bg-yellow-600 rounded-full mt-2"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Payment Efficiency</p>
              <p className="text-sm text-gray-600 mt-1">
                98% payment completion rate with average processing time of 2.4 days. Blockchain verification ensures transparency.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-lg">
            <div className="h-2 w-2 bg-purple-600 rounded-full mt-2"></div>
            <div>
              <p className="text-sm font-medium text-gray-900">Blockchain Integrity</p>
              <p className="text-sm text-gray-600 mt-1">
                All 1,245 blocks verified with zero discrepancies. 4,832 transactions recorded with complete audit trail.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}