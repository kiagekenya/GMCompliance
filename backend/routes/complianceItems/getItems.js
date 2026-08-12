// routes/complianceItems/getItems.js
//
// GET /api/compliance-items
// The dashboard feed. Every date and status here was already computed
// server-side - the frontend does zero date math of its own. Assignment
// fields are populated so the frontend can show a real name directly,
// instead of a bare ObjectId.

const ComplianceItem = require('../../models/ComplianceItem');
const { resolveReminderCheckpoints } = require('../../utils/dateMath');
const asyncHandler = require('../../utils/asyncHandler');

const getItems = asyncHandler(async (req, res) => {
  const docs = await ComplianceItem.find({ operatorId: req.operatorId, isRemoved: false })
    .populate('requirementId', 'title category categoryName sourceRegulation description removable referenceUrl')
    .populate('assignedContactId', 'fullName title')
    .populate('assignedVendorId', 'companyName personnelName')
    .sort({ nextDueDate: 1 });

  // The frontend does zero date math of its own (see Dashboard.jsx's
  // reminder-progress display and the calendar's reminder dots) -
  // reminderCheckpoints is resolved here (custom override if set, else the
  // computed default) so it never has to duplicate utils/dateMath.js's logic.
  const items = docs.map((doc) => ({
    ...doc.toObject(),
    reminderCheckpoints: doc.status === 'due'
      ? resolveReminderCheckpoints(doc.customReminderDates, doc.nextDueDate, doc.actionWindowMonths)
      : [],
    hasCustomReminderDates: Boolean(doc.customReminderDates && doc.customReminderDates.length > 0),
  }));

  res.json({ items });
});

module.exports = getItems;
