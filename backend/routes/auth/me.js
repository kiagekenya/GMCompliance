// routes/auth/me.js
//
// GET /api/auth/me
// Returns the Operator record for whoever's Clerk session token was sent.
// The frontend calls this right after sign-in to know if Step 1 setup
// (company name, etc.) has already been done or still needs to happen.

const asyncHandler = require('../../utils/asyncHandler');

const me = asyncHandler(async (req, res) => {
  res.json({ operator: req.operator });
});

module.exports = me;
