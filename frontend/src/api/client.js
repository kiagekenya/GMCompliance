// src/api/client.js
//
// Every backend call in the app goes through here. Nothing else in the
// codebase should call fetch() directly against /api/... - that keeps the
// base URL, auth header, and error handling in exactly one place.

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('galaxy_token');
}

function setToken(token) {
  localStorage.setItem('galaxy_token', token);
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `Request failed: ${response.status}`);
    error.status = response.status;
    error.details = data.details;
    throw error;
  }

  return data;
}

// --- Auth ---
export const signup = (payload) => request('/auth/signup', { method: 'POST', body: payload }).then((data) => {
  setToken(data.token);
  return data;
});

export const login = (payload) => request('/auth/login', { method: 'POST', body: payload }).then((data) => {
  setToken(data.token);
  return data;
});

export const isAuthenticated = () => Boolean(getToken());

// --- Pipeline profile ---
export const getProfile = () => request('/profile');
export const saveProfile = (payload) => request('/profile', { method: 'POST', body: payload });

// --- Requirements (applicability engine) ---
export const getSuggestedRequirements = () => request('/requirements/suggested');

// --- Compliance items (the operator's calendar) ---
export const confirmComplianceItems = (items) => request('/compliance-items/confirm', { method: 'POST', body: { items } });
export const getComplianceItems = () => request('/compliance-items');
export const updateComplianceItem = (id, payload) => request(`/compliance-items/${id}`, { method: 'PATCH', body: payload });
export const completeComplianceItem = (id, payload) => request(`/compliance-items/${id}/complete`, { method: 'POST', body: payload });

// --- Contacts ---
export const listContacts = () => request('/contacts');
export const addContact = (payload) => request('/contacts', { method: 'POST', body: payload });

// --- Vendors ---
export const listVendors = () => request('/vendors');
export const addVendor = (payload) => request('/vendors', { method: 'POST', body: payload });

export { setToken, getToken };
