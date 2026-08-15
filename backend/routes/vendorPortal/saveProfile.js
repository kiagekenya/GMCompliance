// routes/vendorPortal/saveProfile.js
// PUT /api/vendor-portal/profile
// Upsert by vendorUserId - used both by the first-time onboarding wizard and
// by the "MY PROFILE" edit page later. companyName is the only required field.

const VendorProfile = require('../../models/VendorProfile');
const asyncHandler = require('../../utils/asyncHandler');

const saveProfile = asyncHandler(async (req, res) => {
  const { companyName, phone, website, serviceCategories, serviceArea, yearsInBusiness, certifications, description } = req.body;

  if (!companyName) {
    return res.status(422).json({ error: 'companyName is required' });
  }

  const profile = await VendorProfile.findOneAndUpdate(
    { vendorUserId: req.vendorUser._id },
    {
      vendorUserId: req.vendorUser._id,
      companyName,
      phone: phone || '',
      website: website || '',
      serviceCategories: Array.isArray(serviceCategories) ? serviceCategories : [],
      serviceArea: serviceArea || '',
      yearsInBusiness: yearsInBusiness || null,
      certifications: certifications || '',
      description: description || '',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  res.json({ profile });
});

module.exports = saveProfile;
