// src/api/client.js
//
// Every backend call in the app goes through here. Auth is handled by
// Clerk (window.Clerk.session.getToken()). Every failure is logged to the
// console with full context (method, path, status, response body) so a
// failed request is never a silent, invisible thing - open devtools and
// the exact request/response is right there.

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:4000/api';

async function getClerkToken() {
  if (!window.Clerk || !window.Clerk.session) {
    const err = new Error('Not signed in - no active Clerk session');
    console.error('[api] getClerkToken failed:', err.message);
    throw err;
  }
  return window.Clerk.session.getToken();
}

async function request(path, { method = 'GET', body } = {}) {
  console.log(`[api] --> ${method} ${path}`, body ? { body } : '');

  let token;
  try {
    token = await getClerkToken();
  } catch (err) {
    throw err; // already logged in getClerkToken
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    // fetch() itself threw - this is almost always "the backend isn't running"
    // or a CORS misconfiguration, not an application error.
    console.error(`[api] ✗ NETWORK ERROR on ${method} ${path}:`, networkErr.message);
    console.error('[api] Check that the backend is running and reachable at', BASE_URL);
    throw new Error(`Could not reach the server at ${BASE_URL}. Is the backend running?`);
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error(`[api] ✗ ${method} ${path} -> ${response.status}`, data);
    const error = new Error(data.error || `Request failed: ${response.status}`);
    error.status = response.status;
    error.details = data.details;
    throw error;
  }

  console.log(`[api] ✓ ${method} ${path} -> ${response.status}`);
  return data;
}

// --- Auth / account info (identity itself lives in Clerk, not here) ---
export const getCurrentOperator = () => request('/auth/me');
export const updateCompany = (payload) => request('/auth/company', { method: 'PATCH', body: payload });

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
