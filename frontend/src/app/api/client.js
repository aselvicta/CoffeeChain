const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

let accessToken = null;

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

async function apiFetch(path, options = {}) {
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
  return result;
}

export function logout() {
  setAccessToken(null);
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
