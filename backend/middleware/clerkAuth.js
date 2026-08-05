// middleware/clerkAuth.js
//
// Replaces the old custom-JWT middleware. The frontend sends Clerk's own
// session token as a Bearer header (see src/api/client.js on the frontend -
// it pulls this from window.Clerk.session.getToken()).
//
// IMPORTANT: verification uses CLERK_JWT_KEY (a static PEM public key from
// your Clerk dashboard), not the network-fetched JWKS approach. The JWKS
// approach requires the backend to reach Clerk's API over HTTPS on every
// single request - if that network path is blocked (corporate firewall,
// VPN, restrictive proxy - common on Windows dev machines), you get exactly
// "Failed to resolve JWK during verification" and later "fetch failed".
// The static key does verification entirely offline, so this can't happen.
//
// Get CLERK_JWT_KEY from: Clerk Dashboard -> your app -> Configure ->
// API Keys -> Advanced -> "JWT public key" (starts with "-----BEGIN
// PUBLIC KEY-----"). Also double check CLERK_SECRET_KEY (backend) and
// REACT_APP_CLERK_PUBLISHABLE_KEY (frontend) are copied from the SAME
// Clerk application/environment - a mismatch between them causes the
// exact same symptom.

const { verifyToken } = require('@clerk/backend');
const Operator = require('../models/Operator');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  if (!process.env.CLERK_JWT_KEY) {
    console.error('[auth] CLERK_JWT_KEY is not set in .env - see middleware/clerkAuth.js comment for where to get it. Falling back to network-based verification, which is what was failing before.');
  }

  let claims;
  try {
    claims = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY,
      jwtKey: process.env.CLERK_JWT_KEY, // if set, verification is fully offline - no network call
    });
  } catch (err) {
    console.error(`[auth] token verification failed: ${err.message}`);
    if (err.message?.includes('fetch') || err.message?.includes('JWK')) {
      console.error('[auth] This looks like a network issue reaching Clerk\'s API. Set CLERK_JWT_KEY in .env to verify offline instead (see comment at the top of this file).');
    }
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }

  const clerkUserId = claims.sub; // Clerk puts the user id in the standard JWT "sub" claim

  let operator = await Operator.findOne({ clerkUserId });
  if (!operator) {
    // First time we've seen this Clerk user - create their Operator record.
    // companyName/county/location start as defaults and get filled in by
    // SystemInit's Step 1 (see routes/auth/updateCompany.js).
    operator = await Operator.create({
      clerkUserId,
      email: claims.email || '',
    });
    console.log(`[auth] created new Operator record for Clerk user ${clerkUserId}`);
  }

  if (!operator.subscriptionActive) {
    return res.status(403).json({ error: 'Subscription is not active. Contact Galaxy Midstream Services.' });
  }

  req.operatorId = operator._id;
  req.operatorRole = operator.role;
  req.operator = operator;
  next();
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.operatorRole)) {
      return res.status(403).json({ error: `Requires role: ${allowedRoles.join(' or ')}` });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
