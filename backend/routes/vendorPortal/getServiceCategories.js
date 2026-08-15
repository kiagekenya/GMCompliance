// routes/vendorPortal/getServiceCategories.js
// GET /api/vendor-portal/service-categories
// The fixed catalog category list, for the "services offered" checkboxes on
// the vendor profile form. See utils/serviceCategories.js.

const { listServiceCategories } = require('../../utils/serviceCategories');
const asyncHandler = require('../../utils/asyncHandler');

const getServiceCategories = asyncHandler(async (req, res) => {
  res.json({ categories: await listServiceCategories() });
});

module.exports = getServiceCategories;
