// routes/vendorPortal/getOperators.js
// GET /api/vendor-portal/operators
// The marketplace: every operator on the platform, with their FULL list of
// active compliance items (every regulation that applies to them, whatever
// its current status - not just ones currently due/past_due) - so a vendor
// can see the actual regulations an operator needs help with and offer to
// take on a specific one, not just "the operator exists." Deliberately
// excludes assignedContactId / assignedVendorId / notes / evidence - only
// the item itself (category, title, citation, status, due date, and its
// own id for a per-regulation connection request) is exposed, never
// internal contact or file data.

const Operator = require('../../models/Operator');
const ComplianceItem = require('../../models/ComplianceItem');
const asyncHandler = require('../../utils/asyncHandler');

const getOperators = asyncHandler(async (req, res) => {
  const operators = await Operator.find({}, 'companyName county location');

  const allItems = await ComplianceItem.find({ isRemoved: false })
    .populate('requirementId', 'category categoryName title sourceRegulation')
    .sort({ nextDueDate: 1 });

  const itemsByOperator = {};
  allItems.forEach((item) => {
    if (!item.requirementId) return;
    const key = String(item.operatorId);
    if (!itemsByOperator[key]) itemsByOperator[key] = [];
    itemsByOperator[key].push({
      complianceItemId: item._id,
      category: item.requirementId.category,
      categoryName: item.requirementId.categoryName,
      title: item.requirementId.title,
      sourceRegulation: item.requirementId.sourceRegulation,
      status: item.status,
      nextDueDate: item.nextDueDate,
    });
  });

  const result = operators.map((op) => ({
    operatorId: op._id,
    companyName: op.companyName,
    county: op.county,
    location: op.location,
    items: itemsByOperator[String(op._id)] || [],
  }));

  res.json({ operators: result });
});

module.exports = getOperators;
