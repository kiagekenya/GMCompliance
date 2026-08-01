// src/api/client.js
//
// Every backend call in the app goes through here. Auth is now handled by
// Clerk - there's no custom-issued JWT or localStorage token anymore.
// window.Clerk is the global Clerk SDK instance that <ClerkProvider> sets
// up (see src/index.js); getToken() returns the current session's JWT,
// which our backend verifies with @clerk/backend (see
// middleware/clerkAuth.js on the server).

const BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:4000/api";

async function getClerkToken() {
  if (!window.Clerk || !window.Clerk.session) {
    throw new Error("Not signed in - no active Clerk session");
  }
  return window.Clerk.session.getToken();
}

async function request(path, { method = "GET", body } = {}) {
  const token = await getClerkToken();
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

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

// --- Auth / account info (identity itself lives in Clerk, not here) ---
export const getCurrentOperator = () => request("/auth/me");
export const updateCompany = (payload) =>
  request("/auth/company", { method: "PATCH", body: payload });

// --- Pipeline profile ---
export const getProfile = () => request("/profile");
export const saveProfile = (payload) =>
  request("/profile", { method: "POST", body: payload });

// --- Requirements (applicability engine) ---
export const getSuggestedRequirements = () =>
  request("/requirements/suggested");

// --- Compliance items (the operator's calendar) ---
export const confirmComplianceItems = (items) =>
  request("/compliance-items/confirm", { method: "POST", body: { items } });
export const getComplianceItems = () => request("/compliance-items");
export const updateComplianceItem = (id, payload) =>
  request(`/compliance-items/${id}`, { method: "PATCH", body: payload });
export const completeComplianceItem = (id, payload) =>
  request(`/compliance-items/${id}/complete`, {
    method: "POST",
    body: payload,
  });

// --- Contacts ---
export const listContacts = () => request("/contacts");
export const addContact = (payload) =>
  request("/contacts", { method: "POST", body: payload });

// --- Vendors ---
export const listVendors = () => request("/vendors");
export const addVendor = (payload) =>
  request("/vendors", { method: "POST", body: payload });
