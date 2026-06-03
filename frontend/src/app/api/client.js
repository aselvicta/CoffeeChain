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
    let message = 'Request failed';
    try {
      const errorData = await response.json();
      message = errorData.detail || JSON.stringify(errorData);
    } catch {
      // ignore
    }
    if (response.status === 401) {
      throw new AuthError(
        typeof message === 'string' ? message : 'Authentication failed.',
        401
      );
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
    let message = 'Invalid username or password';
    try {
      const errorData = await response.json();
      message = errorData.detail || message;
    } catch {
      // ignore
    }
    throw new AuthError(message, response.status);
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

export function fetchSuppliers() {
  return apiFetch('/api/suppliers/');
}

export function fetchUsers() {
  return apiFetch('/api/users/');
}

export function createUser(payload) {
  return apiFetch('/api/users/', {
    method: 'POST',
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

export function fetchAuditReport() {
  return apiFetch('/api/reports/audit/');
}

export function markNotificationRead(id) {
  return apiFetch(`/api/notifications/${id}/read/`, { method: 'POST' });
}

export function markAllNotificationsRead() {
  return apiFetch('/api/notifications/read_all/', { method: 'POST' });
}
