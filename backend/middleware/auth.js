// middleware/auth.js
//
// Checks the Authorization: Bearer <token> header, verifies it, and attaches
// req.operatorId + req.operatorRole so every route downstream knows who's
// asking without re-checking the token itself.

const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.operatorId = decoded.operatorId;
    req.operatorRole = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Use after requireAuth. Blocks viewers from write-actions like confirming
// a calendar or editing contacts.
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.operatorRole)) {
      return res.status(403).json({ error: `Requires role: ${allowedRoles.join(' or ')}` });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
