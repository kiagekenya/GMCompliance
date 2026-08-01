// routes/complianceItems/getItems.js
//
// GET /api/compliance-items
// The dashboard feed. Every date and status here was already computed
// server-side - the frontend does zero date math of its own. Assignment
// fields are populated so the frontend can show a real name directly,
// instead of a bare ObjectId.

const ComplianceItem = require('../../models/ComplianceItem');
const asyncHandler = require('../../utils/asyncHandler');

const getItems = asyncHandler(async (req, res) => {
  const items = await ComplianceItem.find({ operatorId: req.operatorId, isRemoved: false })
    .populate('requirementId', 'title category categoryName sourceRegulation description removable referenceUrl')
    .populate('assignedContactId', 'fullName title')
    .populate('assignedVendorId', 'companyName personnelName')
    .sort({ nextDueDate: 1 });

  res.json({ items });
});

module.exports = getItems;
