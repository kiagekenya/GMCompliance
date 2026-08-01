// routes/complianceItems/completeItem.js
//
// POST /api/compliance-items/:id/complete
// The ONE action that actually marks something compliant. Logs permanently
// to CompletionLog (the Audit Archive), then recomputes the next cycle's
// due date/status for real, going forward from the real completion date.

const ComplianceItem = require('../../models/ComplianceItem');
const { recordCompletion } = require('../../services/schedulingEngine');
const asyncHandler = require('../../utils/asyncHandler');

const completeItem = asyncHandler(async (req, res) => {
  const item = await ComplianceItem.findOne({ _id: req.params.id, operatorId: req.operatorId });
  if (!item) return res.status(404).json({ error: 'Compliance item not found' });

  const completedDate = req.body.completedDate ? new Date(req.body.completedDate) : new Date();

  const updated = await recordCompletion(item, {
    completedDate,
    completedByContactId: req.body.completedByContactId || null,
    completedByName: req.body.completedByName || '',
    evidenceUrl: req.body.evidenceUrl || null,
    notes: req.body.notes || '',
  });

  console.log(`[compliance-items] operator ${req.operatorId}: completed item ${item._id}, next due ${updated.nextDueDate}, status now ${updated.status}`);

  const populated = await ComplianceItem.findById(updated._id)
    .populate('assignedContactId', 'fullName title')
    .populate('assignedVendorId', 'companyName personnelName');
  res.json(populated);
});

module.exports = completeItem;
