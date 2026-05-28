const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

let accessToken = null;
let refreshToken = null;

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
  const token = getRefreshToken();
  if (!token) return null;
  const response = await fetch(`${API_BASE}/api/token/refresh/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh: token }),
  });
  if (!response.ok) return null;
  const result = await response.json();
  if (result?.access) {
    setAccessToken(result.access);
    return result.access;
  }
  return null;
}

async function apiFetch(path, options = {}, retryOnUnauthorized = true) {
  const token = getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  if (response.status === 401 && retryOnUnauthorized) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      return apiFetch(path, options, false);
    }
  }
  if (!response.ok) {
    let message = 'Request failed';
    try {
      const errorData = await response.json();
      message = errorData.detail || JSON.stringify(errorData);
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  return response.json();
}

export async function login(username, password) {
  const result = await apiFetch('/api/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  setAccessToken(result.access);
  setRefreshToken(result.refresh);
  return result;
}

export function logout() {
  setAccessToken(null);
  setRefreshToken(null);
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

export function fetchTransfers() {
  return apiFetch('/api/transfers/');
}

export function createTransfer(payload) {
  return apiFetch('/api/transfers/', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function receiveTransfer(id) {
  return apiFetch(`/api/transfers/${id}/receive/`, { method: 'POST' });
}

export function sendOtp(id) {
  return apiFetch(`/api/transfers/${id}/send_otp/`, { method: 'POST' });
}

export function verifyOtp(id, code) {
  return apiFetch(`/api/transfers/${id}/verify_otp/`, {
    method: 'POST',
    body: JSON.stringify({ code }),
  });
}

export async function uploadProof(id, file, meta = {}) {
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
  if (!response.ok) {
    throw new Error('Failed to upload proof');
  }
  return response.json();
}

export function fetchAuditReport() {
  return apiFetch('/api/reports/audit/');
}
