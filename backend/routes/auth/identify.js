// routes/auth/identify.js
//
// POST /api/auth/identify
// Mounted directly in server.js, NOT behind requireAuth - that middleware
// auto-creates an Operator record as a side effect, which is exactly wrong
// here for someone who chose "Vendor" at the login screen. This route uses
// the lower-level verifyClerkToken instead and decides for itself.
//
// Body: { intendedRole: 'operator' | 'vendor' } - the choice made on the
// login screen (frontend/src/App.js), stashed in sessionStorage and sent
// once right after Clerk auth succeeds.
//
// A RETURNING user's stored identity always wins over whatever they click -
// this only ever creates a new record for a Clerk user seen for the first
// time. That's what stops a misclick on a later visit from reassigning
// someone's role.

const { verifyClerkToken } = require('../../middleware/clerkAuth');
const { fetchClerkUserProfile } = require('../../utils/clerkClient');
const Operator = require('../../models/Operator');
const VendorUser = require('../../models/VendorUser');
const asyncHandler = require('../../utils/asyncHandler');

const identify = asyncHandler(async (req, res) => {
  let claims;
  try {
    claims = await verifyClerkToken(req);
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message });
  }

  const clerkUserId = claims.sub;

  const [existingOperator, existingVendorUser] = await Promise.all([
    Operator.findOne({ clerkUserId }),
    VendorUser.findOne({ clerkUserId }),
  ]);

  if (existingOperator) {
    return res.json({ role: 'operator' });
  }
  if (existingVendorUser) {
    return res.json({ role: 'vendor' });
  }

  // Brand new Clerk user - create based on what they chose. Session token
  // claims don't reliably include email/name (depends on Clerk dashboard
  // JWT template config), so fall back to the Backend API - this matters a
  // lot more for VendorUser than Operator, since email is the actual key
  // used to match a vendor's login against the Vendor records operators
  // create (see middleware/vendorAuth.js), not just a display field.
  let email = claims.email || '';
  let fullName = claims.name || '';
  if (!email) {
    ({ email, fullName } = await fetchClerkUserProfile(clerkUserId));
  }

  const intendedRole = req.body.intendedRole === 'vendor' ? 'vendor' : 'operator';

  if (intendedRole === 'vendor') {
    if (!email) {
      console.error(`[auth] could not resolve an email for new vendor ${clerkUserId} - refusing to create an unmatchable VendorUser`);
      return res.status(422).json({ error: 'Could not read your email address from your account. Please contact support.' });
    }
    await VendorUser.create({ clerkUserId, email, fullName });
    console.log(`[auth] created new VendorUser record for Clerk user ${clerkUserId} (${email})`);
    return res.json({ role: 'vendor' });
  }

  await Operator.create({ clerkUserId, email });
  console.log(`[auth] created new Operator record for Clerk user ${clerkUserId} (via identify)`);
  res.json({ role: 'operator' });
});

module.exports = identify;
