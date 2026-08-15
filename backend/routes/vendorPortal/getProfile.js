// routes/vendorPortal/getProfile.js
// GET /api/vendor-portal/profile
// Returns null when the vendor hasn't set one up yet - that's what the
// frontend uses to decide whether to show the onboarding wizard.

const VendorProfile = require('../../models/VendorProfile');
const asyncHandler = require('../../utils/asyncHandler');

const getProfile = asyncHandler(async (req, res) => {
  const profile = await VendorProfile.findOne({ vendorUserId: req.vendorUser._id });
  res.json({ profile: profile || null });
});

module.exports = getProfile;
