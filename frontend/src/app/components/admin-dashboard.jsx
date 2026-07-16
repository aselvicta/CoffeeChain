import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  AlertCircle, BarChart3, Building2, CheckCircle, ChevronRight, Clock,
  Eye, Lock, LogOut, Package, Pencil, Plus, Search, Shield, ShoppingCart,
  Trash2, TrendingUp, User, Users, UserX, UserCheck, Warehouse, X, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from './logo';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { createUser, fetchAuditReport, fetchBatches, fetchBranches, fetchSuppliers,
  fetchTransfers, fetchUser, fetchUsers, updateUser, deleteUser, toggleUserActive,
  fetchPendingRegistrations, fetchPendingRegistration, approvePendingRegistration, rejectPendingRegistration,
  fetchWarehouses, updateMyProfile, fetchProfile,
} from '../api/client';
import { NotificationBell } from './notification-bell';
import { useNotifications } from '../hooks/use-notifications';
import { REGION_LIST, TANZANIA_REGIONS } from '../data/tanzania-locations';
import { buildDashboardPath, resolveDashboardTab } from '../utils/dashboard-routing';
import { getUserMessage } from '../utils/user-messages';
import { HISTORY_PAGE_SIZE } from '../utils/list-limits';
import { usePaginatedList } from '../hooks/use-paginated-list';
import { PaginationBar } from './ui/pagination-bar';
import { ConfirmDialog } from './ui/confirm-dialog';
import { IntegrityPanel } from './integrity-panel';
import { getRoleLabel, getRoleColor } from '../utils/role-labels';
import { ReportsPanel } from './reports-panel';

const ANALYTICS_COLORS = ['#16a34a', '#84cc16', '#0f766e', '#22c55e', '#65a30d', '#15803d'];

function buildMonthlyAnalytics(records) {
  const buckets = new Map();
  const today = new Date();
  for (let offset = 5; offset >= 0; offset--) {
    const date = new Date(today.getFullYear(), today.getMonth() - offset, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    buckets.set(key, { month: date.toLocaleString('en-US', { month: 'short' }), fertilizer: 0, records: 0 });
  }
  records.forEach((record) => {
    const createdAt = record?.created_at;
    if (!createdAt) return;
    const createdDate = new Date(createdAt);
    if (isNaN(createdDate.getTime())) return;
    const key = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}`;
    const bucket = buckets.get(key);
    if (!bucket) return;
    bucket.fertilizer += Number(record.quantity_bags) || 0;
    bucket.records += 1;
  });
  return Array.from(buckets.values());
}

function buildFertilizerDistribution(records) {
  const grouped = records.reduce((acc, record) => {
    const name = record?.batch?.fertilizer_type || record?.fertilizer_type || 'Unknown';
    acc[name] = (acc[name] || 0) + (Number(record?.quantity_bags) || 0);
    return acc;
  }, {});
  return Object.entries(grouped)
    .sort(([, a], [, b]) => b - a)
    .map(([name, value], index) => ({ name, value, color: ANALYTICS_COLORS[index % ANALYTICS_COLORS.length] }));
}

function buildTopBranchPerformance(transfers, branchType, limit = 5) {
  const scores = new Map();
  transfers.forEach((t) => {
    if (t.transfer_type !== 'BRANCH_TO_FARMER') return;
    const branch = t.from_branch;
    if (!branch || branch.branch_type !== branchType) return;
    const cur = scores.get(branch.id) || { name: branch.name || 'Unknown', bags: 0, verified: 0, distributions: 0 };
    cur.bags += Number(t.quantity_bags) || 0;
    cur.distributions += 1;
    if (t.status === 'VERIFIED') cur.verified += Number(t.quantity_bags) || 0;
    scores.set(branch.id, cur);
  });
  return Array.from(scores.values())
    .sort((a, b) => b.bags - a.bags)
    .slice(0, limit)
    .map((e) => ({ ...e, label: e.name.length > 18 ? e.name.slice(0, 17) + '…' : e.name }));
}

function resolveRegionName(region, district) {
  if (region?.trim()) return region.trim();
  if (!district?.trim()) return 'Unassigned';
  const nd = district.trim().toLowerCase();
  for (const [r, districts] of Object.entries(TANZANIA_REGIONS)) {
    if (districts.some((d) => d.toLowerCase().startsWith(nd) || nd.startsWith(d.toLowerCase().split(' ')[0])))
      return r;
  }
  return 'Unassigned';
}

// ─── Role-specific form configs ─────────────────────────────────────────────

const ROLE_TABS = [
  { key: 'supplier', label: 'Suppliers', icon: Building2, color: 'text-blue-600' },
  { key: 'retailer', label: 'Retailers', icon: ShoppingCart, color: 'text-emerald-600' },
  { key: 'cooperative', label: 'Cooperatives', icon: Users, color: 'text-teal-600' },
  { key: 'warehouse_manager', label: 'Warehouse Managers', icon: Warehouse, color: 'text-amber-600' },
  { key: 'regulator', label: 'Regulators', icon: Shield, color: 'text-rose-600' },
];

const PHONE_PREFIX = '+255 ';

function emptyFormForRole(role) {
  const base = { username: '', password: '', first_name: '', last_name: '', email: '' };
  if (role === 'supplier') return { ...base, supplier_name: '', supplier_region: '', contact_phone: PHONE_PREFIX };
  if (role === 'warehouse_manager') return { ...base, supplier_id: '', warehouse_id: '' };
  if (role === 'retailer') return { ...base, branch_name: '', branch_type: 'RETAILER', district: '', region: '', contact_phone: PHONE_PREFIX };
  if (role === 'cooperative') return { ...base, branch_name: '', branch_type: 'COOPERATIVE', district: '', region: '', contact_phone: PHONE_PREFIX };
  if (role === 'regulator') return { ...base, branch_name: '', branch_type: 'REGULATOR', district: '', region: '', contact_phone: PHONE_PREFIX };
  return base;
}

function FieldLabel({ children, required }) {
  return (
    <label className="block text-xs font-semibold text-gray-600 mb-1">
      {children}
      {required ? <span className="text-red-500 ml-0.5">*</span> : <span className="text-gray-400 text-[10px] ml-1">(optional)</span>}
    </label>
  );
}

function RegulatorAccessNotice() {
  return (
    <div className="mx-4 md:mx-6 lg:mx-8 mt-4 px-5 py-4 bg-white border border-gray-200 rounded-xl">
      <div className="flex items-start gap-3 max-w-4xl">
        <Shield className="h-4 w-4 text-gray-400 mt-1 shrink-0" />
        <div className="space-y-1.5 text-sm leading-relaxed">
          <p className="font-semibold text-gray-900">Regulatory view-only access</p>
          <p className="text-gray-600">
            You can monitor the supply chain, browse users, review registration requests,
            generate reports, and run integrity checks.
          </p>
          <p className="text-gray-500 text-xs">
            Account creation and edits are reserved for administrators. You may update your
            own profile under My Account. For other changes, contact a CoffeeChain administrator.
          </p>
        </div>
      </div>
    </div>
  );
}

function FormInput({ label, required, className = '', ...props }) {
  return (
    <div>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      <input
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent border-gray-300 ${className}`}
        {...props}
      />
    </div>
  );
}

function FormSelect({ label, required, children, className = '', ...props }) {
  return (
    <div>
      {label && <FieldLabel required={required}>{label}</FieldLabel>}
      <select
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent border-gray-300 bg-white ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

// ─── User Form Modal ─────────────────────────────────────────────────────────

function UserFormModal({ role, editingUser, suppliers, warehouses, onClose, onSaved }) {
  const isEditing = !!editingUser;
  const [form, setForm] = useState(() => {
    if (isEditing) {
      const u = editingUser.user || {};
      const s = editingUser.supplier;
      const b = editingUser.branch;
      const wm = editingUser.warehouse_manager;
      return {
        username: u.username || '',
        password: '',
        first_name: u.first_name || '',
        last_name: u.last_name || '',
        email: u.email || '',
        supplier_name: s?.name || '',
        supplier_region: s?.region || '',
        contact_phone: (() => { const p = s?.contact_phone || b?.contact_phone || ''; return p && !p.startsWith('+255') ? PHONE_PREFIX + p.replace(/^0/, '') : (p || PHONE_PREFIX); })(),
        supplier_id: wm?.supplier?.id ? String(wm.supplier.id) : '',
        warehouse_id: wm?.assigned_warehouse_id ? String(wm.assigned_warehouse_id) : '',
        branch_name: b?.name || '',
        branch_type: b?.branch_type || (role === 'retailer' ? 'RETAILER' : role === 'cooperative' ? 'COOPERATIVE' : 'REGULATOR'),
        district: b?.district || '',
        region: b?.region || s?.region || '',
      };
    }
    return emptyFormForRole(role);
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const commonRequired = form.first_name.trim() && form.last_name.trim() && form.email.trim();

  const roleFieldsOk = (() => {
    if (role === 'supplier') {
      return form.supplier_name.trim() && form.contact_phone.trim() && form.supplier_region;
    }
    if (role === 'retailer' || role === 'cooperative' || role === 'regulator') {
      return form.branch_name.trim() && form.contact_phone.trim() && form.region && form.district;
    }
    if (role === 'warehouse_manager') {
      return !!form.supplier_id;
    }
    return true;
  })();

  const canSubmit = isEditing
    ? !!(commonRequired && roleFieldsOk)
    : !!(form.username.trim().length >= 3 && form.password.length >= 1 && commonRequired && roleFieldsOk);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      if (isEditing) {
        const payload = { ...form };
        delete payload.username;
        if (!payload.password) delete payload.password;
        if (payload.supplier_id) payload.supplier_id = Number(payload.supplier_id);
        if (payload.warehouse_id !== undefined) payload.warehouse_id = payload.warehouse_id ? Number(payload.warehouse_id) : null;
        const updated = await updateUser(editingUser.user.id, payload);
        onSaved(updated, true);
        toast.success(`User "${form.username}" updated successfully.`);
      } else {
        const payload = { ...form, role };
        if (payload.supplier_id) payload.supplier_id = Number(payload.supplier_id);
        if (!payload.warehouse_id) delete payload.warehouse_id;
        const created = await createUser(payload);
        onSaved(created, false);
        toast.success(`User "${form.username}" created successfully.`);
      }
      onClose();
    } catch (err) {
      setError(getUserMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const districtOptions = form.region ? (TANZANIA_REGIONS[form.region] || []) : [];
  const roleLabel = getRoleLabel(role);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900">
            {isEditing ? `Edit ${roleLabel}` : `Add ${roleLabel}`}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Login Credentials */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Login Credentials</p>
            <FormInput label="Username" required value={form.username} onChange={set('username')} placeholder="username" disabled={isEditing} />
            <FormInput
              label={isEditing ? 'New password' : 'Password'}
              required={!isEditing}
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder={isEditing ? 'Leave blank to keep current' : 'Set password'}
            />
          </div>

          {/* Personal */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Personal Info</p>
            <div className="grid grid-cols-2 gap-3">
              <FormInput label="First name" required value={form.first_name} onChange={set('first_name')} placeholder="First" />
              <FormInput label="Last name" required value={form.last_name} onChange={set('last_name')} placeholder="Last" />
            </div>
            <FormInput label="Email" required type="email" value={form.email} onChange={set('email')} placeholder="email@example.com" />
          </div>

          {/* Role-specific */}
          {(role === 'supplier') && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Supplier Details</p>
              <FormInput label="Company name" required value={form.supplier_name} onChange={set('supplier_name')} placeholder="Organisation name" />
              <FormInput label="Contact phone" required value={form.contact_phone} onChange={(e) => { if (e.target.value.startsWith('+255')) set('contact_phone')(e); }} placeholder="+255 7XX XXX XXX" />
              <FormSelect label="Region" required value={form.supplier_region} onChange={set('supplier_region')}>
                <option value="">Select region…</option>
                {REGION_LIST.map((r) => <option key={r} value={r}>{r}</option>)}
              </FormSelect>
            </div>
          )}

          {(role === 'retailer' || role === 'cooperative' || role === 'regulator') && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{roleLabel} Details</p>
              <FormInput
                label={role === 'regulator' ? 'Authority name' : 'Branch / Shop name'}
                required
                value={form.branch_name}
                onChange={set('branch_name')}
                placeholder={role === 'cooperative' ? 'e.g. Mbinga Central AMCOS' : 'e.g. Ruvuma Agri Shop'}
              />
              <FormInput label="Contact phone" required value={form.contact_phone} onChange={(e) => { if (e.target.value.startsWith('+255')) set('contact_phone')(e); }} placeholder="+255 7XX XXX XXX" />
              <div className="grid grid-cols-2 gap-3">
                <FormSelect label="Region" required value={form.region} onChange={(e) => setForm((p) => ({ ...p, region: e.target.value, district: '' }))}>
                  <option value="">Select region…</option>
                  {REGION_LIST.map((r) => <option key={r} value={r}>{r}</option>)}
                </FormSelect>
                <FormSelect label="District" required value={form.district} onChange={set('district')} disabled={!form.region}>
                  <option value="">Select district…</option>
                  {districtOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                </FormSelect>
              </div>
            </div>
          )}

          {role === 'warehouse_manager' && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Assignment</p>
              <FormSelect label="Supplier" required value={form.supplier_id} onChange={set('supplier_id')}>
                <option value="">Select supplier…</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </FormSelect>
              <FormSelect label="Assign to warehouse" value={form.warehouse_id} onChange={set('warehouse_id')}>
                <option value="">Select warehouse…</option>
                {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name} {w.section ? `(${w.section})` : ''}</option>)}
              </FormSelect>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              className="flex-1 bg-green-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving…' : isEditing ? 'Save Changes' : `Create ${roleLabel}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── User Detail Drawer ──────────────────────────────────────────────────────

function UserDetailModal({ record, onClose, onEdit, readOnly = false }) {
  if (!record) return null;
  const { user, role, supplier, branch, warehouse_manager } = record;
  const entity = supplier || branch;
  const roleColor = getRoleColor(role);
  const roleLabel = getRoleLabel(role);

  const imageUrl = supplier?.store_image_url || branch?.shop_image_url;
  const phone = supplier?.contact_phone || branch?.contact_phone;
  const region = supplier?.region || branch?.region;
  const district = branch?.district;
  const lat = supplier?.location_lat || branch?.location_lat;
  const lng = supplier?.location_lng || branch?.location_lng;
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            {imageUrl ? (
              <img src={imageUrl} alt="" className="h-14 w-14 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                <User className="h-7 w-7 text-green-700" />
              </div>
            )}
            <div>
              <p className="text-lg font-bold text-gray-900">{fullName || user?.username}</p>
              <p className="text-sm text-gray-500">@{user?.username}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${roleColor}`}>
                  <Shield className="h-3 w-3" /> {roleLabel}
                </span>
                {user?.is_active ? (
                  <span className="inline-flex items-center gap-1 text-xs text-green-700 font-semibold bg-green-100 px-2 py-0.5 rounded-full">
                    <CheckCircle className="h-3 w-3" /> Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-red-600 font-semibold bg-red-100 px-2 py-0.5 rounded-full">
                    <UserX className="h-3 w-3" /> Inactive
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!readOnly && (
              <button
                onClick={() => onEdit(record)}
                className="flex items-center gap-1.5 text-sm text-green-700 border border-green-200 hover:bg-green-50 rounded-lg px-3 py-1.5 font-medium"
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Account */}
          <section>
            <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-3">Account</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <DetailRow label="Username" value={user?.username} />
              <DetailRow label="Email" value={user?.email || '—'} />
            </div>
          </section>

          {/* Organisation */}
          {entity && (
            <>
              <div className="border-t border-gray-100" />
              <section>
                <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-3">Organisation</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  <DetailRow label="Name" value={entity.name} span />
                  {phone && <DetailRow label="Phone" value={phone} />}
                  {region && <DetailRow label="Region" value={region} />}
                  {district && <DetailRow label="District" value={district} />}
                  {branch && typeof branch.farmers_count === 'number' && (
                    <DetailRow label="Registered farmers" value={String(branch.farmers_count)} />
                  )}
                </div>
              </section>
            </>
          )}

          {/* Warehouse assignment */}
          {warehouse_manager && (
            <>
              <div className="border-t border-gray-100" />
              <section>
                <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-3">Warehouse Assignment</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  <DetailRow label="Supplier" value={warehouse_manager.supplier?.name || '—'} />
                  <DetailRow label="Warehouse" value={warehouse_manager.assigned_warehouse_name || 'Not assigned'} />
                </div>
              </section>
            </>
          )}

          {/* Location */}
          {lat && lng && (
            <>
              <div className="border-t border-gray-100" />
              <section>
                <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-3">Location</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  <DetailRow label="Latitude" value={String(lat)} />
                  <DetailRow label="Longitude" value={String(lng)} />
                </div>
                <a
                  href={`https://maps.google.com?q=${lat},${lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  View on Google Maps <ChevronRight className="h-3 w-3" />
                </a>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, span }) {
  return (
    <div className={span ? 'col-span-2' : ''}>
      <p className="text-xs font-semibold text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value || '—'}</p>
    </div>
  );
}

function Row({ label, value, children }) {
  return (
    <div className="flex items-start justify-between gap-2 py-0.5">
      <span className="text-xs text-gray-500 shrink-0 w-28">{label}</span>
      <span className="text-sm font-medium text-gray-900 text-right">{children ?? (value || '—')}</span>
    </div>
  );
}

// ─── Per-role user table ─────────────────────────────────────────────────────

function RoleUserTable({ role, users, suppliers, warehouses, onRefresh, readOnly = false }) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [detailRecord, setDetailRecord] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [deleting, setDeleting] = useState(null);
  const [togglingActive, setTogglingActive] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, confirmLabel, danger, onConfirm }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((r) => {
      if (r.role !== role) return false;
      const name = (r.user?.username || '').toLowerCase();
      const org = (r.supplier?.name || r.branch?.name || r.warehouse_manager?.supplier?.name || '').toLowerCase();
      return !q || name.includes(q) || org.includes(q);
    });
  }, [users, role, search]);

  const { page, pageItems, totalPages, setPage } = usePaginatedList(filtered, HISTORY_PAGE_SIZE);

  const handleDelete = (record) => {
    const username = record.user?.username;
    setConfirmDialog({
      title: 'Delete User',
      message: `Are you sure you want to permanently delete "${username}"? This action cannot be undone.`,
      confirmLabel: 'Yes, Delete',
      danger: true,
      onConfirm: async () => {
        setConfirmDialog(null);
        setDeleting(record.user?.id);
        try {
          await deleteUser(record.user.id);
          toast.success(`User "${username}" deleted successfully.`);
          onRefresh();
        } catch (err) {
          toast.error(getUserMessage(err, 'Failed to delete user.'));
        } finally {
          setDeleting(null);
        }
      },
    });
  };

  const handleToggleActive = (record) => {
    const nowActive = record.user?.is_active;
    const action = nowActive ? 'Deactivate' : 'Activate';
    const username = record.user?.username;
    setConfirmDialog({
      title: `${action} User`,
      message: `Are you sure you want to ${action.toLowerCase()} "${username}"?`,
      confirmLabel: `Yes, ${action}`,
      danger: nowActive,
      onConfirm: async () => {
        setConfirmDialog(null);
        setTogglingActive(record.user?.id);
        try {
          await toggleUserActive(record.user.id, !nowActive);
          toast.success(`User "${username}" ${nowActive ? 'deactivated' : 'activated'} successfully.`);
          onRefresh();
        } catch (err) {
          toast.error(getUserMessage(err, `Failed to ${action.toLowerCase()} user.`));
        } finally {
          setTogglingActive(null);
        }
      },
    });
  };

  const openCreate = () => { setEditingRecord(null); setShowForm(true); };
  const openEdit = (r) => { setDetailRecord(null); setEditingRecord(r); setShowForm(true); };

  const roleConf = ROLE_TABS.find((t) => t.key === role);

  return (
    <div>
      <ConfirmDialog
        open={!!confirmDialog}
        title={confirmDialog?.title}
        message={confirmDialog?.message}
        confirmLabel={confirmDialog?.confirmLabel}
        danger={confirmDialog?.danger ?? true}
        onConfirm={confirmDialog?.onConfirm}
        onCancel={() => setConfirmDialog(null)}
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${roleConf?.label || role}…`}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
        {!readOnly && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-green-700 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-green-800 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Add {getRoleLabel(role)}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Username</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Full Name</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Organisation</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Contact</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Region</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-700">{readOnly ? 'View' : 'Actions'}</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-gray-400">
                  No {roleConf?.label || role} found.
                </td>
              </tr>
            )}
            {pageItems.map((record) => {
              const u = record.user || {};
              const org = record.supplier?.name || record.branch?.name || record.warehouse_manager?.supplier?.name || '—';
              const phone = record.supplier?.contact_phone || record.branch?.contact_phone || '—';
              const region = record.supplier?.region || record.branch?.region || '—';
              return (
                <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4 font-medium text-gray-900">{u.username}</td>
                  <td className="py-3 px-4 text-gray-700">
                    {[u.first_name, u.last_name].filter(Boolean).join(' ') || <span className="text-gray-400">—</span>}
                  </td>
                  <td className="py-3 px-4 text-gray-700">{org}</td>
                  <td className="py-3 px-4 text-gray-600">{phone}</td>
                  <td className="py-3 px-4 text-gray-600">{region}</td>
                  <td className="py-3 px-4">
                    {u.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs bg-green-100 text-green-700 rounded-full px-2 py-0.5 font-medium">
                        <CheckCircle className="h-3 w-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-700 rounded-full px-2 py-0.5 font-medium">
                        <UserX className="h-3 w-3" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setDetailRecord(record)}
                        title="View details"
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {!readOnly && (
                        <>
                          <button
                            onClick={() => openEdit(record)}
                            title="Edit"
                            className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleToggleActive(record)}
                            disabled={togglingActive === u.id}
                            title={u.is_active ? 'Deactivate' : 'Activate'}
                            className={`p-1.5 rounded ${u.is_active
                              ? 'text-gray-500 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-gray-500 hover:text-green-600 hover:bg-green-50'}`}
                          >
                            {u.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </button>
                          <button
                            onClick={() => handleDelete(record)}
                            disabled={deleting === u.id}
                            title="Delete"
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100">
            <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <UserFormModal
          role={editingRecord ? editingRecord.role : role}
          editingUser={editingRecord}
          suppliers={suppliers}
          warehouses={warehouses}
          onClose={() => { setShowForm(false); setEditingRecord(null); }}
          onSaved={() => { setShowForm(false); setEditingRecord(null); onRefresh(); }}
        />
      )}
      {detailRecord && (
        <UserDetailModal
          record={detailRecord}
          onClose={() => setDetailRecord(null)}
          onEdit={(r) => { setDetailRecord(null); openEdit(r); }}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}

// ─── Registration Detail Modal ───────────────────────────────────────────────

const REG_STATUS_STYLE = {
  PENDING: 'bg-amber-100 text-amber-800',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

function formatRegDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 10);
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function RegistrationDetailModal({
  registrationId,
  onClose,
  onApprove,
  onReject,
  readOnly = false,
  actioning = false,
}) {
  const [reg, setReg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchPendingRegistration(registrationId);
        if (!cancelled) setReg(data);
      } catch (err) {
        if (!cancelled) setError(getUserMessage(err, 'Failed to load registration details.'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [registrationId]);

  const fullName = [reg?.first_name, reg?.last_name].filter(Boolean).join(' ');
  const roleLabel = reg ? getRoleLabel(reg.role) : '';
  const roleColor = reg ? (getRoleColor(reg.role) || 'bg-gray-100 text-gray-700') : '';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
              <User className="h-7 w-7 text-green-700" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">
                {loading ? 'Loading…' : (reg?.organisation_name || reg?.username || 'Registration')}
              </p>
              {!loading && reg && (
                <>
                  <p className="text-sm text-gray-500">@{reg.username}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${roleColor}`}>
                      <Shield className="h-3 w-3" /> {roleLabel}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${REG_STATUS_STYLE[reg.status] || 'bg-gray-100 text-gray-700'}`}>
                      {reg.status.charAt(0) + reg.status.slice(1).toLowerCase()}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {loading && (
            <p className="text-sm text-gray-400 text-center py-8">Loading account details…</p>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
          )}
          {!loading && reg && !error && (
            <>
              <section>
                <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-3">Account</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  <DetailRow label="Username" value={reg.username} />
                  <DetailRow label="Email" value={reg.email || '—'} />
                  <DetailRow label="First name" value={reg.first_name || '—'} />
                  <DetailRow label="Last name" value={reg.last_name || '—'} />
                  {fullName && <DetailRow label="Full name" value={fullName} span />}
                </div>
              </section>

              <div className="border-t border-gray-100" />
              <section>
                <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-3">Organisation</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  <DetailRow label="Organisation name" value={reg.organisation_name || '—'} span />
                  <DetailRow label="Contact phone" value={reg.contact_phone || '—'} />
                  <DetailRow label="Region" value={reg.region || '—'} />
                  <DetailRow label="District" value={reg.district || '—'} />
                </div>
              </section>

              <div className="border-t border-gray-100" />
              <section>
                <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-3">Submission</p>
                <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                  <DetailRow label="Submitted" value={formatRegDate(reg.created_at)} span />
                  {reg.reviewed_at && (
                    <DetailRow label="Reviewed" value={formatRegDate(reg.reviewed_at)} span />
                  )}
                  {reg.reviewed_by_username && (
                    <DetailRow label="Reviewed by" value={reg.reviewed_by_username} span />
                  )}
                  {reg.rejection_reason && (
                    <DetailRow label="Rejection reason" value={reg.rejection_reason} span />
                  )}
                </div>
              </section>
            </>
          )}
        </div>

        {!loading && reg && reg.status === 'PENDING' && !readOnly && (
          <div className="flex gap-3 p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <button
              onClick={onClose}
              className="flex-1 border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-600 hover:bg-white"
            >
              Close
            </button>
            <button
              onClick={() => onReject(reg.id)}
              disabled={actioning}
              className="flex-1 flex items-center justify-center gap-1.5 border border-red-300 text-red-600 rounded-lg py-2.5 text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
            >
              <UserX className="h-4 w-4" />
              Reject
            </button>
            <button
              onClick={() => onApprove(reg.id)}
              disabled={actioning}
              className="flex-1 flex items-center justify-center gap-1.5 bg-green-700 text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-green-800 disabled:opacity-50"
            >
              <UserCheck className="h-4 w-4" />
              {actioning ? 'Processing…' : 'Approve'}
            </button>
          </div>
        )}

        {(!reg || reg.status !== 'PENDING' || readOnly) && !loading && (
          <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
            <button
              onClick={onClose}
              className="w-full border border-gray-300 rounded-lg py-2.5 text-sm font-medium text-gray-600 hover:bg-white"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Pending Registrations Tab ───────────────────────────────────────────────

function PendingRegistrationsPanel({ readOnly = false }) {
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('PENDING');
  const [statusMsg, setStatusMsg] = useState('');
  const [actioning, setActioning] = useState(null);
  const [rejectModalId, setRejectModalId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [detailRegId, setDetailRegId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchPendingRegistrations(filter);
      setRegistrations(Array.isArray(data) ? data : []);
    } catch (err) {
      setStatusMsg(getUserMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter]);

  const handleApprove = async (id) => {
    setActioning(id);
    try {
      await approvePendingRegistration(id);
      setDetailRegId(null);
      toast.success('Registration approved — account is now active.');
      load();
    } catch (err) {
      toast.error(getUserMessage(err, 'Failed to approve registration.'));
    } finally {
      setActioning(null);
    }
  };

  const handleReject = async () => {
    setActioning(rejectModalId);
    try {
      await rejectPendingRegistration(rejectModalId, rejectReason);
      setRejectModalId(null);
      setDetailRegId(null);
      setRejectReason('');
      toast.success('Registration rejected successfully.');
      load();
    } catch (err) {
      toast.error(getUserMessage(err, 'Failed to reject registration.'));
    } finally {
      setActioning(null);
    }
  };

  const ROLE_BADGE = { supplier: 'bg-blue-100 text-blue-700', retailer: 'bg-emerald-100 text-emerald-700', cooperative: 'bg-teal-100 text-teal-700' };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Registration Requests</h2>
          <p className="text-sm text-gray-500">
            Review self-registration submissions from suppliers, retailers, and cooperatives.
          </p>
        </div>
        <div className="sm:ml-auto flex gap-2">
          {['PENDING', 'APPROVED', 'REJECTED', 'all'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${filter === s ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {s === 'all' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {statusMsg && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex justify-between">
          {statusMsg}
          <button onClick={() => setStatusMsg('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-gray-400">Loading…</div>
      ) : registrations.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400 bg-white rounded-xl border border-gray-200">
          No {filter === 'all' ? '' : filter.toLowerCase()} registration requests found.
        </div>
      ) : (
        <div className="space-y-3">
          {registrations.map((reg) => (
            <div key={reg.id} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-gray-900">{reg.username}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_BADGE[reg.role] || 'bg-gray-100 text-gray-700'}`}>
                      {getRoleLabel(reg.role)}
                    </span>
                    {reg.status !== 'PENDING' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${reg.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {reg.status.charAt(0) + reg.status.slice(1).toLowerCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-medium text-gray-700">{reg.organisation_name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                    {reg.email && <span>{reg.email}</span>}
                    {reg.contact_phone && <span>{reg.contact_phone}</span>}
                    {reg.region && <span>{reg.region}{reg.district ? `, ${reg.district}` : ''}</span>}
                    <span>Submitted: {reg.created_at?.slice(0, 10)}</span>
                  </div>
                  {reg.rejection_reason && (
                    <p className="mt-1 text-xs text-red-600">Reason: {reg.rejection_reason}</p>
                  )}
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setDetailRegId(reg.id)}
                    className="flex items-center gap-1.5 border border-gray-300 text-gray-700 rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-gray-50"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Review
                  </button>
                  {reg.status === 'PENDING' && !readOnly && (
                    <>
                      <button
                        onClick={() => handleApprove(reg.id)}
                        disabled={actioning === reg.id}
                        className="flex items-center gap-1.5 bg-green-700 text-white rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-green-800 disabled:opacity-50"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => { setRejectModalId(reg.id); setRejectReason(''); }}
                        disabled={actioning === reg.id}
                        className="flex items-center gap-1.5 border border-red-300 text-red-600 rounded-lg px-3 py-1.5 text-sm font-semibold hover:bg-red-50 disabled:opacity-50"
                      >
                        <UserX className="h-3.5 w-3.5" />
                        Reject
                      </button>
                    </>
                  )}
                  {reg.status === 'PENDING' && readOnly && (
                    <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800">
                      Awaiting admin review
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {detailRegId && (
        <RegistrationDetailModal
          registrationId={detailRegId}
          onClose={() => setDetailRegId(null)}
          onApprove={handleApprove}
          onReject={(id) => { setRejectModalId(id); setRejectReason(''); }}
          readOnly={readOnly}
          actioning={Boolean(actioning)}
        />
      )}

      {/* Reject modal */}
      {rejectModalId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="font-bold text-gray-900 mb-3">Reject Registration</h3>
            <p className="text-sm text-gray-600 mb-4">Optionally provide a reason for rejection:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="Reason (optional)…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRejectModalId(null)}
                className="flex-1 border border-gray-300 rounded-lg py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actioning === rejectModalId}
                className="flex-1 bg-red-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
              >
                {actioning === rejectModalId ? 'Rejecting…' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Admin Profile Panel ─────────────────────────────────────────────────────

function ensurePhonePrefix(val) {
  const v = val || '';
  return v.startsWith(PHONE_PREFIX) ? v : PHONE_PREFIX + v.replace(/^\+255\s?/, '');
}

function AdminProfilePanel({ userProfile }) {
  const [form, setForm] = useState({
    first_name: userProfile?.firstName || '',
    last_name: userProfile?.lastName || '',
    email: userProfile?.email || '',
    username: userProfile?.username || '',
    contact_phone: userProfile?.contactPhone ? ensurePhonePrefix(userProfile.contactPhone) : PHONE_PREFIX,
    organization: userProfile?.organization || 'CoffeeChain Enterprises',
  });
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState('');

  // Fetch fresh profile data every time this panel mounts so phone/org are never stale
  useEffect(() => {
    fetchProfile().then((data) => {
      setForm({
        first_name: data.user?.first_name || '',
        last_name: data.user?.last_name || '',
        email: data.user?.email || '',
        username: data.user?.username || '',
        contact_phone: data.contact_phone ? ensurePhonePrefix(data.contact_phone) : PHONE_PREFIX,
        organization: data.organization || 'CoffeeChain Enterprises',
      });
    }).catch(() => {});
  }, []);

  const initials = [form.first_name?.[0], form.last_name?.[0]]
    .filter(Boolean).join('').toUpperCase() || form.username?.[0]?.toUpperCase() || 'A';

  const setF = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setPw = (k) => (e) => setPwForm((f) => ({ ...f, [k]: e.target.value }));

  const handlePhoneChange = (e) => {
    const val = e.target.value;
    setForm((f) => ({ ...f, contact_phone: val.startsWith(PHONE_PREFIX) ? val : PHONE_PREFIX }));
  };

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || form.username.trim().length < 3) {
      toast.error('Username must be at least 3 characters.');
      return;
    }
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
      toast.error('First name, last name, and email are required.');
      return;
    }
    if (!form.contact_phone.trim() || form.contact_phone.trim() === PHONE_PREFIX.trim()) {
      toast.error('Phone number is required.');
      return;
    }
    if (!form.organization.trim()) {
      toast.error('Organization is required.');
      return;
    }
    setSaving(true);
    // Small artificial delay so the spinner is always visible even on fast localhost
    await new Promise((r) => setTimeout(r, 400));
    try {
      const result = await updateMyProfile({
        username: form.username.trim(),
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: form.email.trim(),
        contact_phone: form.contact_phone.trim(),
        organization: form.organization.trim(),
      });
      // Sync form from server response so values are always fresh
      if (result?.user) {
        setForm({
          first_name: result.user.first_name || '',
          last_name: result.user.last_name || '',
          email: result.user.email || '',
          username: result.user.username || '',
          contact_phone: result.contact_phone ? ensurePhonePrefix(result.contact_phone) : PHONE_PREFIX,
          organization: result.organization || 'CoffeeChain Enterprises',
        });
      }
      toast.success('Profile updated successfully.');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');
    if (!pwForm.current_password) { setPwError('Enter your current password.'); return; }
    if (pwForm.new_password.length < 6) { setPwError('New password must be at least 6 characters.'); return; }
    if (pwForm.new_password !== pwForm.confirm_password) { setPwError('Passwords do not match.'); return; }
    setSavingPw(true);
    await new Promise((r) => setTimeout(r, 400));
    try {
      await updateMyProfile({ current_password: pwForm.current_password, new_password: pwForm.new_password });
      toast.success('Password changed successfully.');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPwError(err.message || 'Failed to change password.');
    } finally {
      setSavingPw(false);
    }
  };

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition';
  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1';

  return (
    <div className="space-y-6">
      {/* Profile header card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-5">
          <div className="h-16 w-16 rounded-full bg-green-600 flex items-center justify-center text-white text-2xl font-bold shrink-0">
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {form.first_name || userProfile?.firstName || ''} {form.last_name || userProfile?.lastName || ''}
            </h2>
            <p className="text-sm text-gray-500">@{userProfile?.username}</p>
            <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
              {userProfile?.level || 'Administrator'}
            </span>
            <p className="text-xs text-gray-400 mt-0.5">{form.organization}</p>
          </div>
        </div>
      </div>

      {/* Two-column layout for info and password */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="h-4 w-4 text-green-700" />
            <h3 className="text-xs font-bold text-green-700 uppercase tracking-wide">Personal Information</h3>
          </div>
          <form onSubmit={handleSaveInfo} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>First Name <span className="text-red-500">*</span></label>
                <input className={inputCls} value={form.first_name} onChange={setF('first_name')} placeholder="First name" />
              </div>
              <div>
                <label className={labelCls}>Last Name <span className="text-red-500">*</span></label>
                <input className={inputCls} value={form.last_name} onChange={setF('last_name')} placeholder="Last name" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Email Address <span className="text-red-500">*</span></label>
              <input className={inputCls} type="email" value={form.email} onChange={setF('email')} placeholder="admin@example.com" />
            </div>
            <div>
              <label className={labelCls}>Phone Number <span className="text-red-500">*</span></label>
              <input
                className={inputCls}
                type="tel"
                value={form.contact_phone}
                onChange={handlePhoneChange}
                placeholder="+255 7XX XXX XXX"
              />
            </div>
            <div>
              <label className={labelCls}>Username <span className="text-red-500">*</span></label>
              <input className={inputCls} value={form.username} onChange={setF('username')} placeholder="username" />
            </div>
            <div>
              <label className={labelCls}>Organization <span className="text-red-500">*</span></label>
              <input className={inputCls} value={form.organization} onChange={setF('organization')} placeholder="e.g. CoffeeChain Enterprises" />
            </div>
            <div className="pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors"
              >
                {saving && (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                )}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Change password */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-5">
            <Lock className="h-4 w-4 text-green-700" />
            <h3 className="text-xs font-bold text-green-700 uppercase tracking-wide">Change Password</h3>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className={labelCls}>Current Password <span className="text-red-500">*</span></label>
              <input className={inputCls} type="password" value={pwForm.current_password} onChange={setPw('current_password')} placeholder="Enter current password" />
            </div>
            <div>
              <label className={labelCls}>New Password <span className="text-red-500">*</span></label>
              <input className={inputCls} type="password" value={pwForm.new_password} onChange={setPw('new_password')} placeholder="Min. 6 characters" />
            </div>
            <div>
              <label className={labelCls}>Confirm New Password <span className="text-red-500">*</span></label>
              <input className={inputCls} type="password" value={pwForm.confirm_password} onChange={setPw('confirm_password')} placeholder="Repeat new password" />
            </div>
            {pwError && <p className="text-sm text-red-600">{pwError}</p>}
            <div className="pt-1">
              <button
                type="submit"
                disabled={savingPw}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:opacity-60 transition-colors"
              >
                {savingPw && (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                )}
                {savingPw ? 'Updating…' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main Admin Dashboard ────────────────────────────────────────────────────

export function AdminDashboard({ userProfile, onLogout }) {
  const readOnly = Boolean(userProfile?.readOnly || userProfile?.role === 'regulator');
  const dashboardRole = readOnly ? 'regulator' : 'admin';
  const dashboardTabs = ['overview', 'users', 'registrations', 'reports', 'integrity', 'profile'];
  const [activeTab, setActiveTab] = useState('overview');
  const [activeRoleTab, setActiveRoleTab] = useState('supplier');
  const [integrityHighlightId, setIntegrityHighlightId] = useState('');

  const [suppliers, setSuppliers] = useState([]);
  const [retailers, setRetailers] = useState([]);
  const [cooperatives, setCooperatives] = useState([]);
  const [users, setUsers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [transferData, setTransferData] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [audit, setAudit] = useState({ dispatched: 0, received: 0, verified: 0, gap: 0 });
  const [statusMessage, setStatusMessage] = useState('');

  const {
    notifications, unreadCount, refresh: refreshNotifications,
    markRead, markAllRead, dismiss,
  } = useNotifications();

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setActiveTab(
      resolveDashboardTab(location.pathname, dashboardRole, {
        defaultTab: 'overview',
        validTabs: dashboardTabs,
      })
    );
  }, [location.pathname]);

  const goToTab = (tab) => {
    const next = dashboardTabs.includes(tab) ? tab : 'overview';
    setActiveTab(next);
    navigate(buildDashboardPath(dashboardRole, next));
  };

  const loadData = async () => {
    try {
      const [supplierData, branchData, auditData, transferRecords, userData, batchRecords, warehouseData] = await Promise.all([
        fetchSuppliers(),
        fetchBranches(),
        fetchAuditReport(),
        fetchTransfers(),
        fetchUsers(),
        fetchBatches(),
        fetchWarehouses(),
      ]);
      setTransferData(transferRecords);
      setBatches(batchRecords);
      setWarehouses(warehouseData);
      setSuppliers(
        supplierData.map((s) => ({
          id: `SUP-${s.id.toString().padStart(3, '0')}`,
          rawId: s.id,
          name: s.name,
          region: s.region || 'Region',
          phone: s.contact_phone || 'N/A',
          lastDispatch: transferRecords.find((t) => t.from_supplier?.id === s.id)?.created_at?.slice(0, 10) || 'N/A',
        }))
      );
      setRetailers(
        branchData
          .filter((b) => b.branch_type === 'RETAILER')
          .map((b) => ({
            id: `RET-${b.id.toString().padStart(3, '0')}`,
            name: b.name, region: b.region || '', district: b.district || '',
            bagsAvailable: transferRecords.filter((t) => t.to_branch?.id === b.id).reduce((s, t) => s + t.quantity_bags, 0),
          }))
      );
      setCooperatives(
        branchData
          .filter((b) => b.branch_type === 'COOPERATIVE')
          .map((b) => ({
            id: `AMCOS-${b.id.toString().padStart(3, '0')}`,
            name: b.name, region: b.region || '', district: b.district || '',
            members: b.farmers_count || 0,
          }))
      );
      setAudit(auditData);
      setUsers(userData);
      await refreshNotifications();
    } catch (error) {
      setStatusMessage(getUserMessage(error));
    }
  };

  useEffect(() => { loadData(); }, []);

  const monthlyData = useMemo(() => buildMonthlyAnalytics(transferData.length > 0 ? transferData : batches), [batches, transferData]);
  const distributionData = useMemo(() => buildFertilizerDistribution(transferData.length > 0 ? transferData : batches), [batches, transferData]);
  const topRetailerData = useMemo(() => buildTopBranchPerformance(transferData, 'RETAILER'), [transferData]);
  const topAmcosData = useMemo(() => buildTopBranchPerformance(transferData, 'COOPERATIVE'), [transferData]);

  const regionData = useMemo(() => {
    const grouped = [...retailers, ...cooperatives].reduce((acc, b) => {
      const district = b.district?.trim() || 'Unassigned';
      const region = resolveRegionName(b.region, district);
      const key = `${region}::${district}`;
      acc[key] = acc[key] || { region, district, cooperatives: 0, retailers: 0, farmers: 0 };
      if (b.id.startsWith('RET')) acc[key].retailers += 1;
      if (b.id.startsWith('AMCOS')) { acc[key].cooperatives += 1; acc[key].farmers += b.members || 0; }
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => a.region.localeCompare(b.region) || a.district.localeCompare(b.district));
  }, [retailers, cooperatives]);

  const supplierOptions = useMemo(() =>
    users.filter((r) => r.role === 'supplier').map((r) => ({ id: r.supplier?.id || r.user?.id, name: r.supplier?.name || r.user?.username })).filter((s) => s.id),
    [users]
  );

  const TAB_CONFIG = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: readOnly ? 'User Directory' : 'User Management', icon: Users },
    { id: 'registrations', label: 'Registrations', icon: UserCheck },
    { id: 'reports', label: 'Reports', icon: TrendingUp },
    { id: 'integrity', label: 'Chain Integrity', icon: Shield },
    { id: 'profile', label: 'My Account', icon: User },
  ];

  const TAB_TITLES = readOnly
    ? {
        overview: 'Regulatory Dashboard',
        users: 'User Directory',
        registrations: 'Registration Requests',
        reports: 'Reports',
        integrity: 'Chain Integrity',
        profile: 'My Account',
      }
    : {
        overview: 'Admin Dashboard',
        users: 'User Management',
        registrations: 'Registration Requests',
        reports: 'Reports',
        integrity: 'Chain Integrity',
        profile: 'My Account',
      };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar — matches supplier / warehouse-manager / retailer style */}
      <div className="w-72 bg-gradient-to-b from-green-700 to-green-900 text-white flex flex-col shrink-0">
        <div className="p-4 border-b border-green-600">
          <div className="w-fit mx-auto bg-white rounded-xl px-4 py-2 shadow-lg">
            <Logo size="md" variant="full" showText={false} />
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => goToTab(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                activeTab === id
                  ? 'bg-green-600 text-white'
                  : 'text-green-100 hover:bg-green-600/50'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{TAB_TITLES[activeTab] || 'Admin Dashboard'}</h1>
              <p className="text-sm text-gray-600">
                {userProfile?.name} · {userProfile?.level || (readOnly ? 'Regulatory Authority' : 'Administrator')}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell
                notifications={notifications}
                unreadCount={unreadCount}
                onMarkRead={markRead}
                onMarkAllRead={markAllRead}
                onDismiss={dismiss}
                onNavigateTab={(tab, notification) => {
                  if (tab === 'integrity') {
                    const tid = notification?.transferId || notification?.metadata?.transfer_id || '';
                    setIntegrityHighlightId(String(tid || ''));
                    goToTab('integrity');
                    return;
                  }
                  goToTab(tab || 'overview');
                }}
              />
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{userProfile?.name}</p>
                <p className="text-xs text-gray-500">{userProfile?.level || 'Administrator'}</p>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </header>

        {readOnly && <RegulatorAccessNotice />}

        {/* Page body */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8">
          {/* Overview */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {statusMessage && <p className="text-sm text-red-600">{statusMessage}</p>}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {[
                  { label: 'Total Suppliers', value: `${suppliers.length}`, sub: 'Registered suppliers', icon: Package, color: 'bg-blue-500' },
                  { label: 'Active Retailers', value: `${retailers.length}`, sub: 'Registered retailers', icon: ShoppingCart, color: 'bg-green-500' },
                  { label: 'Cooperatives', value: `${cooperatives.length}`, sub: 'Registered AMCOS', icon: Users, color: 'bg-purple-500' },
                  { label: 'Verified Distributions', value: `${audit.verified}`, sub: `${audit.gap} pending`, icon: CheckCircle, color: 'bg-amber-500' },
                ].map((m, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`${m.color} p-2.5 rounded-lg`}><m.icon className="h-5 w-5 text-white" /></div>
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-0.5">{m.value}</h3>
                    <p className="text-sm font-medium text-gray-600">{m.label}</p>
                    <p className="text-xs text-green-600 mt-0.5">{m.sub}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-base font-bold text-gray-900 mb-4">Monthly Trends</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="month" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="fertilizer" stroke="#16a34a" strokeWidth={2} name="Fertilizer bags" />
                      <Line type="monotone" dataKey="records" stroke="#ea580c" strokeWidth={2} name="Records" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h3 className="text-base font-bold text-gray-900 mb-4">Fertilizer Distribution</h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={distributionData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}>
                        {distributionData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v) => [`${v} bags`, 'Qty']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {[
                  { title: 'Top Performing Retailers', data: topRetailerData, color1: '#16a34a', color2: '#84cc16' },
                  { title: 'Top Performing AMCOS', data: topAmcosData, color1: '#7c3aed', color2: '#a78bfa' },
                ].map(({ title, data, color1, color2 }) => (
                  <div key={title} className="bg-white rounded-xl border border-gray-200 p-5">
                    <h3 className="text-base font-bold text-gray-900 mb-3">{title}</h3>
                    {data.length === 0 ? (
                      <p className="py-12 text-center text-sm text-gray-400">No data yet.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={data} layout="vertical" margin={{ right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                          <XAxis type="number" stroke="#6b7280" fontSize={11} allowDecimals={false} />
                          <YAxis type="category" dataKey="label" stroke="#6b7280" width={100} fontSize={11} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="bags" fill={color1} name="Bags" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="verified" fill={color2} name="Verified" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-base font-bold text-gray-900 mb-4">Regional Overview</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        {['Region', 'District', 'Cooperatives', 'Retailers', 'Farmers'].map((h) => (
                          <th key={h} className="text-left py-3 px-4 font-semibold text-gray-700">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {regionData.length === 0 && (
                        <tr><td colSpan={5} className="py-8 text-center text-gray-400">No data yet.</td></tr>
                      )}
                      {regionData.map((row) => (
                        <tr key={`${row.region}-${row.district}`} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium text-gray-900">{row.region}</td>
                          <td className="py-3 px-4 text-gray-700">{row.district}</td>
                          <td className="py-3 px-4 text-gray-600">{row.cooperatives}</td>
                          <td className="py-3 px-4 text-gray-600">{row.retailers}</td>
                          <td className="py-3 px-4 text-gray-600">{row.farmers}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* User Management */}
          {activeTab === 'users' && (
            <div className="space-y-5">
              {/* Role sub-tabs */}
              <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
                {ROLE_TABS.map(({ key, label, icon: Icon, color }) => (
                  <button
                    key={key}
                    onClick={() => setActiveRoleTab(key)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                      activeRoleTab === key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${activeRoleTab === key ? color : ''}`} />
                    {label}
                    <span className="text-xs text-gray-400">
                      ({users.filter((u) => u.role === key).length})
                    </span>
                  </button>
                ))}
              </div>

              <RoleUserTable
                key={activeRoleTab}
                role={activeRoleTab}
                users={users}
                suppliers={supplierOptions}
                warehouses={warehouses}
                onRefresh={loadData}
                readOnly={readOnly}
              />
            </div>
          )}

          {/* Registrations */}
          {activeTab === 'registrations' && <PendingRegistrationsPanel readOnly={readOnly} />}

          {/* Reports */}
          {activeTab === 'reports' && <ReportsPanel />}

          {/* Integrity */}
          {activeTab === 'integrity' && (
            <IntegrityPanel
              userProfile={userProfile}
              initialHighlightId={integrityHighlightId}
              onClearHighlight={() => setIntegrityHighlightId('')}
            />
          )}

          {activeTab === 'profile' && (
            <AdminProfilePanel userProfile={userProfile} />
          )}
        </main>
      </div>
    </div>
  );
}
