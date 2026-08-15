// middleware/vendorAuth.js
//
// Auth for the vendor portal - a completely separate identity from
// Operator (see models/VendorUser.js). Resolves the logged-in vendor's
// email against every Vendor document (across ALL operators - a vendor can
// work for more than one) that has hasPortalAccess: true, and sets
// req.vendorIds / req.vendorEmail / req.vendorRecords for routes to use.
//
// Deliberately does NOT auto-create a VendorUser here - that only happens
// in routes/auth/identify.js, at the moment someone explicitly chooses
// "Vendor" at the login screen. A request here with no VendorUser at all
// means this Clerk account was never registered as a vendor.

const { verifyClerkToken } = require('./clerkAuth');
const VendorUser = require('../models/VendorUser');
const Vendor = require('../models/Vendor');

async function requireVendorAuth(req, res, next) {
  let claims;
  try {
    claims = await verifyClerkToken(req);
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message });
  }

  const vendorUser = await VendorUser.findOne({ clerkUserId: claims.sub });
  if (!vendorUser) {
    return res.status(403).json({ error: 'This account is not registered as a vendor.' });
  }

  const vendorRecords = await Vendor.find({ email: vendorUser.email, hasPortalAccess: true })
    .populate('operatorId', 'companyName');

  req.vendorUser = vendorUser;
  req.vendorEmail = vendorUser.email;
  req.vendorRecords = vendorRecords;
  req.vendorIds = vendorRecords.map((v) => v._id);
  next();
}

module.exports = { requireVendorAuth };
