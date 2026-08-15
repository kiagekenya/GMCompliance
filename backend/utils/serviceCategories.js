// utils/serviceCategories.js
//
// The fixed list of compliance categories from the global regulatory
// catalog, e.g. { category: 1, categoryName: "Corrosion Control" } - used to
// populate the service-category checkboxes on a vendor's profile form, on
// both the operator side (routes/requirements/getCategories.js) and the
// vendor-portal side (routes/vendorPortal/getServiceCategories.js). Kept
// here once so neither route duplicates the aggregation query.

const RegulatoryRequirement = require('../models/RegulatoryRequirement');

async function listServiceCategories() {
  const rows = await RegulatoryRequirement.aggregate([
    { $group: { _id: { category: '$category', categoryName: '$categoryName' } } },
    { $sort: { '_id.category': 1 } },
  ]);
  return rows.map((r) => ({ category: r._id.category, categoryName: r._id.categoryName }));
}

module.exports = { listServiceCategories };
