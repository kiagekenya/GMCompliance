// routes/vendorPortal/saveProfile.js
// PUT /api/vendor-portal/profile
// Upsert by vendorUserId - used both by the first-time onboarding wizard and
// by the "MY PROFILE" edit page later. companyName is the only required field.
// A welcome email goes out exactly once, the first time this vendor ever
// saves a profile (detected by checking existence before the upsert) - a
// later "MY PROFILE" edit never re-sends it.

const VendorProfile = require('../../models/VendorProfile');
const { sendEmail } = require('../../services/emailService');
const asyncHandler = require('../../utils/asyncHandler');

const saveProfile = asyncHandler(async (req, res) => {
  const { companyName, phone, website, serviceCategories, serviceArea, yearsInBusiness, certifications, description } = req.body;

  if (!companyName) {
    return res.status(422).json({ error: 'companyName is required' });
  }

  const isFirstTime = !(await VendorProfile.exists({ vendorUserId: req.vendorUser._id }));

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

  if (isFirstTime && req.vendorUser.email) {
    const result = await sendEmail({
      to: req.vendorUser.email,
      subject: 'Welcome to Galaxy Compliance Assistant',
      text: `Hi ${req.vendorUser.fullName || ''},

Your vendor account for ${companyName} is set up. Operators on the platform
can now find you and reach out, and you can browse operators yourself under
FIND OPERATORS to offer help with specific regulations.

- Galaxy Compliance Assistant
`,
    });
    console.log(`[vendor-portal] welcome email to ${req.vendorUser.email}: ${result.sent ? 'sent' : 'not sent (' + result.reason + ')'}`);
  }

  res.json({ profile });
});

module.exports = saveProfile;
