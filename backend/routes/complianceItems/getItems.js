// routes/complianceItems/getItems.js
//
// GET /api/compliance-items
// This is the real replacement for the frontend's hardcoded INITIAL_REQUIREMENTS
// array. Every date and status here was already computed server-side (at
// confirm time, or by the daily recalculation job) - the frontend does zero
// date math of its own.

const ComplianceItem = require('../../models/ComplianceItem');
const asyncHandler = require('../../utils/asyncHandler');

const getItems = asyncHandler(async (req, res) => {
  const items = await ComplianceItem.find({ operatorId: req.operatorId, isRemoved: false })
    .populate('requirementId', 'title category categoryName sourceRegulation description removable referenceUrl')
    .sort({ nextDueDate: 1 });

  res.json({ items });
});

module.exports = getItems;
