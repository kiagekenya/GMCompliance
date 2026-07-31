// routes/vendors/deleteVendor.js
// DELETE /api/vendors/:id

const Vendor = require('../../models/Vendor');
const ComplianceItem = require('../../models/ComplianceItem');
const asyncHandler = require('../../utils/asyncHandler');

const deleteVendor = asyncHandler(async (req, res) => {
  const deleted = await Vendor.findOneAndDelete({ _id: req.params.id, operatorId: req.operatorId });
  if (!deleted) return res.status(404).json({ error: 'Vendor not found' });

  // unassign this vendor from any compliance items pointing at it, so the
  // dashboard doesn't show a dangling reference
  await ComplianceItem.updateMany(
    { operatorId: req.operatorId, assignedVendorId: deleted._id },
    { $set: { assignedVendorId: null } }
  );

  res.json({ deleted: true });
});

module.exports = deleteVendor;
