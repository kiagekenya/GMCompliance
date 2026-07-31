// routes/complianceItems/completeItem.js
//
// POST /api/compliance-items/:id/complete
// This is "step 7" from the flow diagram: someone finishes the chore, marks
// it done, and the app quietly logs proof + recalculates the NEXT due date.

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
    evidenceUrl: req.body.evidenceUrl || null,
    notes: req.body.notes || '',
  });

  res.json(updated);
});

module.exports = completeItem;
