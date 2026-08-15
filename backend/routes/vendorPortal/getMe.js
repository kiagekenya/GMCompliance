// routes/vendorPortal/getMe.js
// GET /api/vendor-portal/me
// The vendor's own profile plus every operator relationship their
// hasPortalAccess Vendor records grant - req.vendorRecords is already
// populated with operatorId->companyName by requireVendorAuth.

const asyncHandler = require('../../utils/asyncHandler');

const getMe = asyncHandler(async (req, res) => {
  res.json({
    email: req.vendorEmail,
    fullName: req.vendorUser.fullName,
    operators: req.vendorRecords.map((v) => ({
      operatorId: v.operatorId?._id,
      companyName: v.operatorId?.companyName || 'Unknown operator',
      vendorRecordId: v._id,
      serviceScope: v.serviceScope,
    })),
  });
});

module.exports = getMe;
