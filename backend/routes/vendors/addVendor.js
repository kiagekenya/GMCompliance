// routes/vendors/addVendor.js
// POST /api/vendors
// Vendor configuration is optional (Step 4 in the setup wizard), so there's
// no minimum count here, unlike contacts.

const Vendor = require('../../models/Vendor');
const asyncHandler = require('../../utils/asyncHandler');

const addVendor = asyncHandler(async (req, res) => {
  const { companyName, personnelName, email, phone, serviceScope, hasPortalAccess } = req.body;

  if (!companyName) {
    return res.status(422).json({ error: 'companyName is required' });
  }

  const vendor = await Vendor.create({
    operatorId: req.operatorId, companyName, personnelName, email, phone, serviceScope, hasPortalAccess,
  });

  res.status(201).json(vendor);
});

module.exports = addVendor;
