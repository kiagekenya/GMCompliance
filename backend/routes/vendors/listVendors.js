// routes/vendors/listVendors.js
// GET /api/vendors

const Vendor = require('../../models/Vendor');
const asyncHandler = require('../../utils/asyncHandler');

const listVendors = asyncHandler(async (req, res) => {
  const vendors = await Vendor.find({ operatorId: req.operatorId });
  res.json({ vendors });
});

module.exports = listVendors;
