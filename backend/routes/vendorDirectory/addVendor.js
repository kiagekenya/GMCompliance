// routes/vendorDirectory/addVendor.js
// POST /api/vendor-directory/:vendorUserId/add
// The operator's ONE way to add a vendor now: pick a real, self-registered
// vendor from the directory (routes/vendorDirectory/list.js) and add them
// directly - no retyping their info, no separate manual "Add Vendor" form
// creating a second, possibly-inconsistent copy of the same vendor's data.
// See utils/vendorLinking.js for what this actually does.

const { linkVendorToOperator } = require('../../utils/vendorLinking');
const asyncHandler = require('../../utils/asyncHandler');

const addVendorFromDirectory = asyncHandler(async (req, res) => {
  const vendor = await linkVendorToOperator(req.operatorId, req.params.vendorUserId);
  res.status(201).json({ vendor });
});

module.exports = addVendorFromDirectory;
