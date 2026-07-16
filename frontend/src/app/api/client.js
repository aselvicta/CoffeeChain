import { getUserMessage } from '../utils/user-messages';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const DEFAULT_FERTILIZER_TYPES = [
  'DAP',
  'CAN',
  'Urea',
  'NPK',
  'CAN+B',
  'Organic Compost',
];

let accessToken = null;
let refreshToken = null;
let refreshInFlight = null;

const PUBLIC_API_PATHS = ['/api/login/', '/api/token/refresh/'];

function isPublicPath(path) {
  return PUBLIC_API_PATHS.some((publicPath) => path.startsWith(publicPath));
}

export function setAccessToken(token) {
  accessToken = token;
  if (token) {
    localStorage.setItem('coffeechain_access_token', token);
  } else {
    localStorage.removeItem('coffeechain_access_token');
  }
}

export function getAccessToken() {
  if (accessToken) return accessToken;
  const stored = localStorage.getItem('coffeechain_access_token');
  accessToken = stored || null;
  return accessToken;
}

export function setRefreshToken(token) {
  refreshToken = token;
  if (token) {
    localStorage.setItem('coffeechain_refresh_token', token);
  } else {
    localStorage.removeItem('coffeechain_refresh_token');
  }
}

function getRefreshToken() {
  if (refreshToken) return refreshToken;
  const stored = localStorage.getItem('coffeechain_refresh_token');
  refreshToken = stored || null;
  return refreshToken;
}

async function refreshAccessToken() {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const token = getRefreshToken();
    if (!token) return null;
    try {
      const response = await fetch(`${API_BASE}/api/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: token }),
      });
      if (!response.ok) return null;
      const result = await response.json();
      if (result?.access) {
        setAccessToken(result.access);
        return result.access;
      }
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

function clearSession() {
  setAccessToken(null);
  setRefreshToken(null);
}

function notifySessionExpired() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('coffeechain:session-expired'));
  }
}

export class AuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

async function apiFetch(path, options = {}, retryOnUnauthorized = true) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = getAccessToken();
  if (token && !isPublicPath(path)) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    cache: 'no-store',
    ...options,
    headers,
  });

  if (response.status === 401 && retryOnUnauthorized && !isPublicPath(path)) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      return apiFetch(path, options, false);
    }
    clearSession();
    notifySessionExpired();
    throw new AuthError('Your session has expired. Please sign in again.', 401);
  }

  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch {
      // ignore
    }
    const message = getUserMessage(errorData, 'Something went wrong. Please try again.');
    if (response.status === 401) {
      throw new AuthError(message, 401);
    }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}

export async function login(username, password) {
  const response = await fetch(`${API_BASE}/api/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch {
      // ignore
    }
    throw new AuthError(
      getUserMessage(errorData, 'Incorrect username or password.'),
      response.status
    );
  }
  const result = await response.json();
  setAccessToken(result.access);
  setRefreshToken(result.refresh);
  return result;
}

export function logout() {
  clearSession();
}

export function fetchProfile() {
  return apiFetch('/api/me/');
}

export function updateMyProfile(payload) {
  return apiFetch('/api/me/', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function fetchSuppliers() {
  return apiFetch('/api/suppliers/');
}

export function fetchUsers() {
  return apiFetch('/api/users/');
}

export function fetchUser(userId) {
  return apiFetch(`/api/users/${userId}/`);
}

export function createUser(payload) {
  return apiFetch('/api/users/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateUser(userId, payload) {
  return apiFetch(`/api/users/${userId}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function fetchBranches() {
  return apiFetch('/api/branches/');
}

export function fetchFarmers() {
  return apiFetch('/api/farmers/');
}

export function lookupMinistryFarmer(ministryId) {
  const params = new URLSearchParams({ ministry_id: ministryId });
  return apiFetch(`/api/farmers/lookup/?${params.toString()}`);
}

export function registerFarmer(payload) {
  return apiFetch('/api/farmers/register/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function resolveRetailerBuyer(payload) {
  return apiFetch('/api/farmers/resolve_buyer/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchBatches() {
  return apiFetch('/api/batches/');
}

export function createBatch(payload) {
  return apiFetch('/api/batches/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateBatch(id, payload) {
  return apiFetch(`/api/batches/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteBatch(id) {
  return apiFetch(`/api/batches/${id}/`, {
    method: 'DELETE',
  });
}

export function fetchWarehouses() {
  return apiFetch('/api/warehouses/');
}

export function fetchWarehouseCatalog() {
  return apiFetch('/api/warehouse-catalog/');
}

export function fetchFertilizerTypes() {
  return apiFetch('/api/fertilizer-types/');
}

export function createWarehouse(payload) {
  return apiFetch('/api/warehouses/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateWarehouse(id, payload) {
  return apiFetch(`/api/warehouses/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function deleteWarehouse(id) {
  return apiFetch(`/api/warehouses/${id}/`, {
    method: 'DELETE',
  });
}

export function fetchTransfers(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch(`/api/transfers/${suffix}`);
}

export function createTransfer(payload) {
  return apiFetch('/api/transfers/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchNotifications() {
  return apiFetch('/api/notifications/');
}

export async function notifyDispatchReceiver(payload) {
  const response = await apiFetch('/api/transfers/notify-receiver/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response;
}

export function receiveTransfer(id) {
  return apiFetch(`/api/transfers/${id}/receive/`, { method: 'POST' });
}

export function approveTransfer(id) {
  return apiFetch(`/api/transfers/${id}/approve/`, { method: 'POST' });
}

export function rejectTransfer(id, message) {
  return apiFetch(`/api/transfers/${id}/reject/`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export function sendOtp(id, options = {}) {
  return apiFetch(`/api/transfers/${id}/send_otp/`, {
    method: 'POST',
    body: JSON.stringify(options),
  });
}

export function verifyOtp(id, code) {
  return apiFetch(`/api/transfers/${id}/verify_otp/`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export function fetchTransferReceipt(transferId) {
  return apiFetch(`/api/transfers/${transferId}/receipt/`);
}

export async function uploadProof(id, file, meta = {}, retryOnUnauthorized = true) {
  const token = getAccessToken();
  const formData = new FormData();
  if (file) formData.append('file', file);
  Object.entries(meta).forEach(([key, value]) => {
    formData.append(key, value);
  });
  const response = await fetch(`${API_BASE}/api/transfers/${id}/upload_proof/`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (response.status === 401 && retryOnUnauthorized) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      return uploadProof(id, file, meta, false);
    }
    clearSession();
    notifySessionExpired();
    throw new AuthError('Your session has expired. Please sign in again.', 401);
  }
  if (!response.ok) {
    throw new Error('Failed to upload proof');
  }
  return response.json();
}

export function fetchIssues() {
  return apiFetch('/api/issues/');
}

export async function createIssue(payload, retryOnUnauthorized = true) {
  const token = getAccessToken();
  const formData = new FormData();
  formData.append('transfer_id', String(payload.transferId));
  formData.append('issue_type', payload.issueType);
  formData.append('summary', payload.summary);
  formData.append('description', payload.description);
  if (payload.evidenceFile) {
    formData.append('evidence_file', payload.evidenceFile);
  }

  const response = await fetch(`${API_BASE}/api/issues/`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (response.status === 401 && retryOnUnauthorized) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      return createIssue(payload, false);
    }
    clearSession();
    notifySessionExpired();
    throw new AuthError('Your session has expired. Please sign in again.', 401);
  }

  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    const detail = result?.detail || result?.description?.[0] || result?.summary?.[0];
    throw new Error(detail || 'Failed to create issue');
  }

  return response.json();
}

export function resolveIssue(id, resolutionNotes = '') {
  return apiFetch(`/api/issues/${id}/resolve/`, {
    method: 'POST',
    body: JSON.stringify({ resolution_notes: resolutionNotes }),
  });
}

export function fetchAuditReport() {
  return apiFetch('/api/reports/audit/');
}

export function fetchIntegrityTransfers({
  branchId = '',
  branchType = '',
  search = '',
  transferId = '',
} = {}) {
  const params = new URLSearchParams();
  if (branchId) params.set('branch_id', String(branchId));
  if (branchType) params.set('branch_type', branchType);
  if (search) params.set('search', search);
  if (transferId) params.set('transfer_id', String(transferId));
  const query = params.toString();
  return apiFetch(`/api/integrity/${query ? `?${query}` : ''}`);
}

export function compareIntegrityTransfer(transferId, { notify = true } = {}) {
  return apiFetch(`/api/integrity/${transferId}/`, {
    method: 'POST',
    body: JSON.stringify({ notify }),
  });
}

export function fetchIntegrityTransferDetail(transferId) {
  return apiFetch(`/api/integrity/${transferId}/`);
}

export function scanIntegrityFiltered({
  branchId = '',
  branchType = '',
  search = '',
  transferIds = [],
  notify = true,
} = {}) {
  return apiFetch('/api/integrity/scan/', {
    method: 'POST',
    body: JSON.stringify({
      branch_id: branchId || undefined,
      branch_type: branchType || undefined,
      search: search || undefined,
      transfer_ids: transferIds.length ? transferIds : undefined,
      notify,
    }),
  });
}

export function markNotificationRead(id) {
  return apiFetch(`/api/notifications/${id}/read/`, { method: 'POST' });
}

export function markAllNotificationsRead() {
  return apiFetch('/api/notifications/read_all/', { method: 'POST' });
}

export function deleteNotification(id) {
  return apiFetch(`/api/notifications/${id}/`, { method: 'DELETE' });
}

export function deleteUser(userId) {
  return apiFetch(`/api/users/${userId}/`, { method: 'DELETE' });
}

export function toggleUserActive(userId, isActive) {
  return apiFetch(`/api/users/${userId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ is_active: isActive }),
  });
}

export function registerPublic(payload) {
  return fetch(`${API_BASE}/api/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail || 'Registration failed.');
    return data;
  });
}

export function fetchPendingRegistrations(statusFilter = 'PENDING') {
  const params = statusFilter && statusFilter !== 'all' ? `?status=${statusFilter}` : '?status=all';
  return apiFetch(`/api/registrations/${params}`);
}

export function fetchPendingRegistration(id) {
  return apiFetch(`/api/registrations/${id}/`);
}

export function approvePendingRegistration(id) {
  return apiFetch(`/api/registrations/${id}/approve/`, { method: 'POST' });
}

export function rejectPendingRegistration(id, reason = '') {
  return apiFetch(`/api/registrations/${id}/reject/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function fetchReports(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
  });
  return apiFetch(`/api/reports/?${query.toString()}`);
}

export function exportReportCsv(params = {}) {
  const query = new URLSearchParams({ ...params, export: 'csv' });
  const token = getAccessToken();
  const url = `${API_BASE}/api/reports/?${query.toString()}`;
  const a = document.createElement('a');
  a.href = url;
  a.download = `coffeechain-report.csv`;
  // Fetch with auth then trigger download
  return fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).then(async (res) => {
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `coffeechain-report-${params.type || 'transfers'}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  });
}

export async function uploadUserImage(userId, role, file) {
  const token = getAccessToken();
  const formData = new FormData();
  const field = role === 'supplier' ? 'store_image' : 'shop_image';
  formData.append(field, file);

  const endpoint = role === 'supplier'
    ? `/api/suppliers/`
    : `/api/branches/`;

  // We need the entity id — caller should pass entityId instead, but this is a helper
  // that patches the branch/supplier linked to the user
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return null;
}

export async function uploadEntityImage(entityType, entityId, file, retryOnUnauthorized = true) {
  const token = getAccessToken();
  const formData = new FormData();
  const fieldName = entityType === 'supplier' ? 'store_image' : 'shop_image';
  formData.append(fieldName, file);
  const url = entityType === 'supplier'
    ? `${API_BASE}/api/suppliers/${entityId}/`
    : `${API_BASE}/api/branches/${entityId}/`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  if (res.status === 401 && retryOnUnauthorized) {
    const refreshed = await refreshAccessToken();
    if (refreshed) return uploadEntityImage(entityType, entityId, file, false);
    clearSession();
    notifySessionExpired();
    throw new AuthError('Session expired.', 401);
  }
  if (!res.ok) throw new Error('Image upload failed.');
  return res.json();
}

export function assignWarehouseManager(warehouseId, managerId) {
  return apiFetch(`/api/warehouses/${warehouseId}/`, {
    method: 'PATCH',
    body: JSON.stringify({ assigned_manager_id: managerId }),
  });
}

// ─── Orders API ──────────────────────────────────────────────────────────────

export function fetchOrders(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch(`/api/orders/${suffix}`);
}

export function createOrder(payload) {
  return apiFetch('/api/orders/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function acceptOrder(id, supplierNotes = '') {
  return apiFetch(`/api/orders/${id}/accept/`, {
    method: 'POST',
    body: JSON.stringify({ supplier_notes: supplierNotes }),
  });
}

export function rejectOrder(id, reason = '', supplierNotes = '') {
  return apiFetch(`/api/orders/${id}/reject/`, {
    method: 'POST',
    body: JSON.stringify({ reason, supplier_notes: supplierNotes }),
  });
}

export function markOrderProcessing(id) {
  return apiFetch(`/api/orders/${id}/mark_processing/`, { method: 'POST' });
}

export function markOrderReady(id) {
  return apiFetch(`/api/orders/${id}/mark_ready/`, { method: 'POST' });
}

export function linkOrderTransfer(id, transferId) {
  return apiFetch(`/api/orders/${id}/link_transfer/`, {
    method: 'POST',
    body: JSON.stringify({ transfer_id: transferId }),
  });
}

export function dispatchOrder(id, batchId) {
  return apiFetch(`/api/orders/${id}/send_dispatch/`, {
    method: 'POST',
    body: JSON.stringify({ batch_id: batchId }),
  });
}

export function verifyDispatch(id) {
  return apiFetch(`/api/orders/${id}/verify_dispatch/`, { method: 'POST' });
}

export function fetchOrderAvailableBatches(fertilizerType) {
  const qs = fertilizerType ? `?fertilizer_type=${encodeURIComponent(fertilizerType)}` : '';
  return apiFetch(`/api/orders/available_batches/${qs}`);
}

export function cancelOrder(id) {
  return apiFetch(`/api/orders/${id}/cancel/`, { method: 'POST' });
}

export function markOrderDelivered(id) {
  return apiFetch(`/api/orders/${id}/mark_delivered/`, { method: 'POST' });
}

// ─── Supplier Catalog API ────────────────────────────────────────────────────

export function fetchSupplierCatalog(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch(`/api/supplier-catalog/${suffix}`);
}

// ─── Compliance API ──────────────────────────────────────────────────────────

export function fetchComplianceFlags(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch(`/api/compliance/flags/${suffix}`);
}

export function fetchComplianceFlag(id) {
  return apiFetch(`/api/compliance/flags/${id}/`);
}

export function createComplianceFlag(payload) {
  return apiFetch('/api/compliance/flags/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function updateComplianceFlag(id, payload) {
  return apiFetch(`/api/compliance/flags/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function respondToComplianceFlag(id, message) {
  return apiFetch(`/api/compliance/flags/${id}/respond/`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export function recommendComplianceAction(id, payload) {
  return apiFetch(`/api/compliance/flags/${id}/recommend/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchComplianceRecommendations(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch(`/api/compliance/recommendations/${suffix}`);
}

export function decideComplianceRecommendation(id, payload) {
  return apiFetch(`/api/compliance/recommendations/${id}/decide/`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export function fetchOrganisationCertificates(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const suffix = query.toString() ? `?${query.toString()}` : '';
  return apiFetch(`/api/compliance/certificates/${suffix}`);
}

export async function uploadOrganisationCertificate(payload, retryOnUnauthorized = true) {
  const token = getAccessToken();
  const formData = new FormData();
  formData.append('document_type', payload.document_type);
  formData.append('certificate_number', payload.certificate_number || '');
  formData.append('issuing_authority', payload.issuing_authority || '');
  if (payload.issued_on) formData.append('issued_on', payload.issued_on);
  formData.append('expires_on', payload.expires_on);
  formData.append('notes', payload.notes || '');
  if (payload.document) formData.append('document', payload.document);

  const response = await fetch(`${API_BASE}/api/compliance/certificates/`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (response.status === 401 && retryOnUnauthorized) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      return uploadOrganisationCertificate(payload, false);
    }
    clearSession();
    notifySessionExpired();
    throw new AuthError('Your session has expired. Please sign in again.', 401);
  }

  if (!response.ok) {
    let errorData = null;
    try {
      errorData = await response.json();
    } catch {
      // ignore
    }
    throw new Error(getUserMessage(errorData, 'Failed to upload certificate.'));
  }
  return response.json();
}

export function reviewOrganisationCertificate(id, payload) {
  return apiFetch(`/api/compliance/certificates/${id}/review/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
