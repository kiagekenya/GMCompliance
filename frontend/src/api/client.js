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
  const isFormData = body instanceof FormData;
  console.log(`[api] --> ${method} ${path}`, body ? { body: isFormData ? '[FormData]' : body } : '');

  let token;
  try {
    token = await getClerkToken();
  } catch (err) {
    throw err; // already logged in getClerkToken
  }

  // FormData (real file uploads) must NOT get a Content-Type header set
  // here - the browser sets its own multipart boundary automatically, and
  // overriding it breaks the upload.
  const headers = { Authorization: `Bearer ${token}` };
  if (!isFormData) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
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
export const notifySetupComplete = () => request('/auth/notify-setup-complete', { method: 'POST' });
// intendedRole: 'operator' | 'vendor' - only used the very first time this
// Clerk account is ever seen (see backend/routes/auth/identify.js). A
// returning user's real stored role always wins over this.
export const identify = (intendedRole) => request('/auth/identify', { method: 'POST', body: { intendedRole } });

// --- Vendor portal (a completely separate identity from Operator) ---
export const getVendorMe = () => request('/vendor-portal/me');
export const getVendorTasks = () => request('/vendor-portal/tasks');
export const updateVendorTask = (id, payload) => request(`/vendor-portal/tasks/${id}`, { method: 'PATCH', body: payload });
export const uploadVendorEvidence = (id, files) => {
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  return request(`/vendor-portal/tasks/${id}/evidence`, { method: 'POST', body: formData });
};

// --- Vendor marketplace: vendor side (self-reported profile, browsing
// operators' compliance gaps, and the connection-request inbox) ---
export const getVendorProfile = () => request('/vendor-portal/profile');
export const saveVendorProfile = (payload) => request('/vendor-portal/profile', { method: 'PUT', body: payload });
export const getVendorServiceCategories = () => request('/vendor-portal/service-categories');
export const getMarketplaceOperators = () => request('/vendor-portal/operators');
export const getVendorRequests = () => request('/vendor-portal/requests');
// complianceItemId is optional - set it to pitch a SPECIFIC regulation
// ("we can do this one for you") instead of a general inquiry.
export const sendVendorRequest = (operatorId, message, complianceItemId) => request('/vendor-portal/requests', { method: 'POST', body: { operatorId, message, complianceItemId } });
export const respondToVendorRequest = (id, status) => request(`/vendor-portal/requests/${id}`, { method: 'PATCH', body: { status } });

// --- Vendor marketplace: operator side (browsing vendor profiles, and the
// connection-request inbox - mirrors the vendor-side functions above) ---
export const getVendorDirectory = () => request('/vendor-directory');
export const getServiceCategories = () => request('/requirements/categories');
export const getOperatorRequests = () => request('/vendor-directory/requests');
export const sendOperatorRequest = (vendorUserId, message) => request('/vendor-directory/requests', { method: 'POST', body: { vendorUserId, message } });
export const respondToOperatorRequest = (id, status) => request(`/vendor-directory/requests/${id}`, { method: 'PATCH', body: { status } });

// --- Pipeline profile ---
export const getProfile = () => request('/profile');
export const saveProfile = (payload) => request('/profile', { method: 'POST', body: payload });

// --- Requirements (applicability engine) ---
export const getSuggestedRequirements = () => request('/requirements/suggested');

// --- Compliance items (the operator's calendar) ---
export const confirmComplianceItems = (items) => request('/compliance-items/confirm', { method: 'POST', body: { items } });
export const getComplianceItems = () => request('/compliance-items');
export const getArchive = () => request('/compliance-items/archive');
export const updateComplianceItem = (id, payload) => request(`/compliance-items/${id}`, { method: 'PATCH', body: payload });
export const completeComplianceItem = (id, payload) => request(`/compliance-items/${id}/complete`, { method: 'POST', body: payload });
export const setItemFrequency = (id, payload) => request(`/compliance-items/${id}/set-frequency`, { method: 'POST', body: payload });
// dates: array of Date/ISO strings, or [] to reset back to the auto-computed schedule.
export const setReminderDates = (id, dates) => request(`/compliance-items/${id}`, { method: 'PATCH', body: { customReminderDates: dates } });
export const runStatusCheck = () => request('/compliance-items/run-status-check', { method: 'POST' });

// --- Contacts ---
export const listContacts = () => request('/contacts');
export const addContact = (payload) => request('/contacts', { method: 'POST', body: payload });
export const updateContact = (id, payload) => request(`/contacts/${id}`, { method: 'PATCH', body: payload });
export const deleteContact = (id) => request(`/contacts/${id}`, { method: 'DELETE' });

// --- Vendors ---
export const listVendors = () => request('/vendors');
export const addVendor = (payload) => request('/vendors', { method: 'POST', body: payload });
export const updateVendor = (id, payload) => request(`/vendors/${id}`, { method: 'PATCH', body: payload });
export const deleteVendor = (id) => request(`/vendors/${id}`, { method: 'DELETE' });

// --- Evidence files ---
// The admin's own "attach evidence directly" action - a real multipart
// upload, distinct from an assignee submitting through their public link
// (see components/publicupload/PublicUpload.jsx, which posts its own
// FormData directly since that page isn't behind Clerk auth).
export const uploadEvidence = (itemId, files) => {
  const formData = new FormData();
  files.forEach((f) => formData.append('files', f));
  return request(`/compliance-items/${itemId}/evidence`, { method: 'POST', body: formData });
};

// Marks an assignee's submission as seen by the admin - fired when the
// requirement's detail page opens (see RequirementDetail.jsx). Clears the
// "needs review" badge/notification.
export const acknowledgeReview = (itemId) => request(`/compliance-items/${itemId}`, { method: 'PATCH', body: { acknowledgeReview: true } });

// Fetches an evidence file's real bytes as a Blob and returns an object URL
// to open it with (window.open(url) or an <img>/<iframe> src). A plain
// <a href> can't be used directly for this since GET /api/evidence/* is
// authenticated and a normal browser navigation can't attach the Clerk
// bearer token - it has to go through fetch() like every other call here.
export async function getEvidenceBlobUrl(storedName) {
  const token = await getClerkToken();
  let response;
  try {
    response = await fetch(`${BASE_URL}/evidence/${storedName}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch (networkErr) {
    console.error('[api] ✗ NETWORK ERROR fetching evidence:', networkErr.message);
    throw new Error(`Could not reach the server at ${BASE_URL}. Is the backend running?`);
  }
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || `Could not load file: ${response.status}`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
