import { useState } from 'react';
import { BarChart2, Download, Filter, Loader2, RefreshCw, X } from 'lucide-react';
import { fetchReports, exportReportCsv } from '../api/client';
import { getUserMessage } from '../utils/user-messages';
import { getRoleLabel } from '../utils/role-labels';
import { REGION_LIST } from '../data/tanzania-locations';

const REPORT_TYPES = [
  { value: 'transfers', label: 'Transfer History' },
  { value: 'dispatches', label: 'Dispatches' },
  { value: 'stock', label: 'Warehouse Stock' },
  { value: 'users', label: 'User Registry' },
];

const ROLE_FILTER_OPTIONS = [
  { value: '', label: 'All roles' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'retailer', label: 'Retailer' },
  { value: 'cooperative', label: 'Cooperative' },
  { value: 'warehouse_manager', label: 'Warehouse Manager' },
];

function Badge({ children, color = 'bg-gray-100 text-gray-700' }) {
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>{children}</span>;
}

function statusColor(s) {
  if (!s) return 'bg-gray-100 text-gray-600';
  if (s === 'VERIFIED') return 'bg-emerald-100 text-emerald-700';
  if (s === 'DISPATCHED') return 'bg-blue-100 text-blue-700';
  if (s === 'RECEIVED') return 'bg-teal-100 text-teal-700';
  if (s === 'PENDING') return 'bg-amber-100 text-amber-700';
  if (s === 'REJECTED') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
}

export function ReportsPanel() {
  const [filters, setFilters] = useState({
    type: '',
    role: '',
    from: '',
    to: '',
    region: '',
  });
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [hasRun, setHasRun] = useState(false);

  const set = (field) => (e) => setFilters((p) => ({ ...p, [field]: e.target.value }));

  const handleRun = async () => {
    if (!filters.type) { setError('Please select a report type.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await fetchReports(filters);
      setRows(res.rows || []);
      setSummary(res.summary || null);
      setHasRun(true);
    } catch (err) {
      setError(getUserMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportReportCsv(filters);
    } catch (err) {
      setError(getUserMessage(err));
    } finally {
      setExporting(false);
    }
  };

  const handleClear = () => {
    setFilters({ type: '', role: '', from: '', to: '', region: '' });
    setRows([]);
    setSummary(null);
    setHasRun(false);
    setError('');
  };

  const typeConf = REPORT_TYPES.find((t) => t.value === filters.type);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Reports</h2>
        <p className="text-sm text-gray-500">Generate and export reports filtered by role, region, and date.</p>
      </div>

      {/* Filter card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-gray-700">
          <Filter className="h-4 w-4" /> Report Filters
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {/* Report type */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Report type <span className="text-red-500">*</span></label>
            <select
              value={filters.type}
              onChange={set('type')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="">Select report type…</option>
              {REPORT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Filter by role</label>
            <select
              value={filters.role}
              onChange={set('role')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              {ROLE_FILTER_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
          </div>

          {/* From date */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">From date</label>
            <input
              type="date"
              value={filters.from}
              onChange={set('from')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* To date */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">To date</label>
            <input
              type="date"
              value={filters.to}
              onChange={set('to')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* Region */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Region</label>
            <select
              value={filters.region}
              onChange={set('region')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
            >
              <option value="">All regions</option>
              {REGION_LIST.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError('')}><X className="h-4 w-4" /></button>
          </div>
        )}

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={handleRun}
            disabled={loading}
            className="flex items-center gap-2 bg-green-700 text-white rounded-lg px-5 py-2 text-sm font-semibold hover:bg-green-800 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart2 className="h-4 w-4" />}
            {loading ? 'Generating…' : 'Run Report'}
          </button>

          {hasRun && (
            <>
              <button
                onClick={handleExport}
                disabled={exporting || rows.length === 0}
                className="flex items-center gap-2 border border-green-600 text-green-700 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-green-50 disabled:opacity-40"
              >
                {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export CSV
              </button>
              <button
                onClick={handleClear}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm"
              >
                <RefreshCw className="h-4 w-4" /> Reset
              </button>
            </>
          )}
        </div>
      </div>

      {/* Results */}
      {hasRun && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Summary bar */}
          {summary && (
            <div className="flex flex-wrap items-center gap-3 px-5 py-3 bg-gray-50 border-b border-gray-200 text-sm">
              <span className="font-semibold text-gray-700">{typeConf?.label}</span>
              <Badge>{summary.total_rows} rows</Badge>
              {summary.role_filter && <Badge color="bg-blue-100 text-blue-700">{getRoleLabel(summary.role_filter)}</Badge>}
              {summary.region_filter && <Badge color="bg-teal-100 text-teal-700">{summary.region_filter}</Badge>}
              {summary.date_from && <span className="text-gray-500">From: {summary.date_from}</span>}
              {summary.date_to && <span className="text-gray-500">To: {summary.date_to}</span>}
            </div>
          )}

          {rows.length === 0 ? (
            <div className="py-14 text-center text-sm text-gray-400">No data matched your filters.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    {Object.keys(rows[0]).map((col) => (
                      <th key={col} className="text-left py-3 px-4 font-semibold text-gray-600 whitespace-nowrap capitalize">
                        {col.replace(/_/g, ' ')}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      {Object.entries(row).map(([key, val]) => (
                        <td key={key} className="py-3 px-4 text-gray-700 whitespace-nowrap">
                          {key === 'status' ? (
                            <Badge color={statusColor(String(val))}>{String(val)}</Badge>
                          ) : key === 'is_active' ? (
                            <Badge color={val ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                              {val ? 'Active' : 'Inactive'}
                            </Badge>
                          ) : (
                            val === null || val === undefined ? '—' : String(val)
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
