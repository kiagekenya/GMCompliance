// middleware/clerkAuth.js
//
// Replaces the old custom-JWT middleware. The frontend sends Clerk's own
// session token as a Bearer header (see src/api/client.js on the frontend -
// it pulls this from window.Clerk.session.getToken()). We verify it against
// Clerk directly using CLERK_SECRET_KEY, then find-or-create the matching
// Operator document, since Clerk only knows about identity, not our
// app-specific data (company name, subscription, role).

const { verifyToken } = require('@clerk/backend');
const Operator = require('../models/Operator');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  let claims;
  try {
    claims = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
  } catch (err) {
    console.error(`[auth] token verification failed: ${err.message}`);
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
