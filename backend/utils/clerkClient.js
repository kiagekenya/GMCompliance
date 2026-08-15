// utils/clerkClient.js
//
// Clerk session token claims don't reliably include email/name in this
// setup (depends on JWT template configuration on the Clerk dashboard,
// which isn't guaranteed) - relying on claims.email alone silently produced
// an empty string, harmless for the optional Operator.email field but a
// hard crash for VendorUser.email (required, since it's the key used to
// match a vendor's login against the Vendor records operators create).
//
// This talks to Clerk's Backend API directly (using CLERK_SECRET_KEY,
// already required elsewhere) to fetch the real, verified email as a
// fallback whenever the token claims don't have it.

const { createClerkClient } = require('@clerk/backend');

const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// Returns { email, fullName } - both '' if genuinely unavailable (never
// throws, so a lookup failure here doesn't block sign-in).
async function fetchClerkUserProfile(clerkUserId) {
  try {
    const user = await clerkClient.users.getUser(clerkUserId);
    const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || '';
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ');
    return { email, fullName };
  } catch (err) {
    console.error(`[auth] fetchClerkUserProfile failed for ${clerkUserId}:`, err.message);
    return { email: '', fullName: '' };
  }
}

module.exports = { fetchClerkUserProfile };
