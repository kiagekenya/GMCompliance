// routes/vendorDirectory/list.js
// GET /api/vendor-directory
// Every vendor's self-reported profile - the directory operators browse to
// find/vet vendors, independent of the operator's own per-operator Vendor
// contact list (models/Vendor.js). The frontend cross-references these by
// email against existing Vendor rows to show a "View Profile" link without
// a second lookup.

const VendorProfile = require('../../models/VendorProfile');
const asyncHandler = require('../../utils/asyncHandler');

const listVendorDirectory = asyncHandler(async (req, res) => {
  const profiles = await VendorProfile.find({}).populate('vendorUserId', 'email fullName');
  res.json({ profiles });
});

module.exports = listVendorDirectory;
