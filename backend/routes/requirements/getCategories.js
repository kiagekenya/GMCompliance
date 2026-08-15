// routes/requirements/getCategories.js
// GET /api/requirements/categories
// The fixed catalog category list - used by the operator side when browsing
// the vendor directory (filtering by service category). Mirrors
// routes/vendorPortal/getServiceCategories.js, sharing the same query via
// utils/serviceCategories.js.

const { listServiceCategories } = require('../../utils/serviceCategories');
const asyncHandler = require('../../utils/asyncHandler');

const getCategories = asyncHandler(async (req, res) => {
  res.json({ categories: await listServiceCategories() });
});

module.exports = getCategories;
