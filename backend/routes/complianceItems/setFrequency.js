// routes/complianceItems/setFrequency.js
//
// POST /api/compliance-items/:id/set-frequency
// For requirements with no fixed regulatory interval (frequencyResolution
// 'operator_defined'), the item goes live from confirmItems.js flagged
// 'awaiting_input' with no due date. This is where the operator supplies
// their own interval, from the requirement's own page - not blocked during
// setup. If this item was somehow already completed for real before its
// frequency was known (lastCompletedDate already set), the due date is
// recomputed from that real date immediately. Otherwise it moves to
// 'awaiting_baseline', same as every other item at creation - no
// placeholder due date counted from today; the operator still supplies a
// real last-completed date via Settings > Baseline last-completed dates
// (see services/baselineScheduling.js) before a due date appears.

const { computeInitialSchedule } = require('../../services/schedulingEngine');
const ComplianceItem = require('../../models/ComplianceItem');
const asyncHandler = require('../../utils/asyncHandler');

const setFrequency = asyncHandler(async (req, res) => {
  const { frequencyValue, frequencyUnit } = req.body;

  if (!frequencyValue || Number(frequencyValue) <= 0) {
    return res.status(422).json({ error: 'frequencyValue must be a positive number' });
  }

  const item = await ComplianceItem.findOne({ _id: req.params.id, operatorId: req.operatorId });
  if (!item) return res.status(404).json({ error: 'Compliance item not found' });

  item.resolvedFrequencyValue = Number(frequencyValue);
  item.resolvedFrequencyUnit = frequencyUnit || 'months';
  item.requiresOperatorInput = false;

  if (item.lastCompletedDate) {
    const { nextDueDate, actionWindowMonths, status } = computeInitialSchedule(
      item.lastCompletedDate, item.resolvedFrequencyValue, item.resolvedFrequencyUnit, true
    );
    item.nextDueDate = nextDueDate;
    item.actionWindowMonths = actionWindowMonths;
    item.status = status;
  } else {
    item.nextDueDate = null;
    item.actionWindowMonths = null;
    item.status = 'awaiting_baseline';
  }

  await item.save();
  console.log(`[compliance-items] operator ${req.operatorId}: set frequency on item ${item._id} to ${item.resolvedFrequencyValue} ${item.resolvedFrequencyUnit}`);

  const populated = await ComplianceItem.findById(item._id)
    .populate('assignedContactId', 'fullName title')
    .populate('assignedVendorId', 'companyName personnelName');
  res.json(populated);
});

module.exports = setFrequency;
