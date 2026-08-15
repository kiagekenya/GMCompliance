// routes/vendorPortal/getTasks.js
// GET /api/vendor-portal/tasks
// Cross-operator by design - a vendor can work for more than one operator,
// so this is scoped to assignedVendorId IN req.vendorIds (every
// hasPortalAccess Vendor record matching their email, across ALL
// operators), not to a single operatorId like every other route in this
// app. Same reminderCheckpoints resolution as the operator's getItems.js,
// for the same "frontend does zero date math" reason.

const ComplianceItem = require('../../models/ComplianceItem');
const { resolveReminderCheckpoints } = require('../../utils/dateMath');
const asyncHandler = require('../../utils/asyncHandler');

const getTasks = asyncHandler(async (req, res) => {
  if (req.vendorIds.length === 0) {
    return res.json({ tasks: [] });
  }

  const docs = await ComplianceItem.find({ assignedVendorId: { $in: req.vendorIds }, isRemoved: false })
    .populate('requirementId', 'title category categoryName sourceRegulation description referenceUrl')
    .populate({ path: 'operatorId', select: 'companyName' })
    .sort({ nextDueDate: 1 });

  const tasks = docs.map((doc) => ({
    ...doc.toObject(),
    operatorCompanyName: doc.operatorId?.companyName || 'Unknown operator',
    reminderCheckpoints: doc.status === 'due'
      ? resolveReminderCheckpoints(doc.customReminderDates, doc.nextDueDate, doc.actionWindowMonths)
      : [],
  }));

  res.json({ tasks });
});

module.exports = getTasks;
