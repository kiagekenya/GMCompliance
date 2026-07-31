// routes/vendors/updateVendor.js
// PATCH /api/vendors/:id

const Vendor = require('../../models/Vendor');
const asyncHandler = require('../../utils/asyncHandler');

const EDITABLE_FIELDS = ['companyName', 'personnelName', 'email', 'phone', 'serviceScope', 'hasPortalAccess'];

const updateVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findOne({ _id: req.params.id, operatorId: req.operatorId });
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

  for (const field of EDITABLE_FIELDS) {
    if (req.body[field] !== undefined) vendor[field] = req.body[field];
  }

  await vendor.save();
  res.json(vendor);
});

module.exports = updateVendor;
