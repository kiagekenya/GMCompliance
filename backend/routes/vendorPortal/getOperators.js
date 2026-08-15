// routes/vendorPortal/getOperators.js
// GET /api/vendor-portal/operators
// The marketplace: every operator on the platform, with their open
// compliance gaps (status due or past_due) - so a vendor can see who needs
// what and pitch their services. Deliberately excludes assignedContactId /
// assignedVendorId / notes / evidence - only the gap itself (category,
// title, citation, status, due date) is exposed, never internal contact or
// file data.

const Operator = require('../../models/Operator');
const ComplianceItem = require('../../models/ComplianceItem');
const asyncHandler = require('../../utils/asyncHandler');

const getOperators = asyncHandler(async (req, res) => {
  const operators = await Operator.find({}, 'companyName county location');

  const gapItems = await ComplianceItem.find({ status: { $in: ['due', 'past_due'] }, isRemoved: false })
    .populate('requirementId', 'category categoryName title sourceRegulation');

  const gapsByOperator = {};
  gapItems.forEach((item) => {
    if (!item.requirementId) return;
    const key = String(item.operatorId);
    if (!gapsByOperator[key]) gapsByOperator[key] = [];
    gapsByOperator[key].push({
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
    gaps: gapsByOperator[String(op._id)] || [],
  }));

  res.json({ operators: result });
});

module.exports = getOperators;
