// routes/complianceItems/completeItem.js
//
// POST /api/compliance-items/:id/complete
// The gated "confirm" step in a two-person workflow: the assigned person
// fills in the draft (via PATCH .../:id - see updateItemStatus.js), then
// someone else clicks this to finalize it. Blocked with a 422 until an
// owner is assigned AND evidence has been attached - "everything matching"
// before it's allowed to go through.
//
// This is the ONLY action that writes to the audit archive and actually
// changes status.

const ComplianceItem = require('../../models/ComplianceItem');
const { recordCompletion } = require('../../services/schedulingEngine');
const asyncHandler = require('../../utils/asyncHandler');

const completeItem = asyncHandler(async (req, res) => {
  const item = await ComplianceItem.findOne({ _id: req.params.id, operatorId: req.operatorId })
    .populate('assignedContactId', 'fullName')
    .populate('assignedVendorId', 'companyName personnelName');
  if (!item) return res.status(404).json({ error: 'Compliance item not found' });

  const hasOwner = Boolean(item.assignedContactId || item.assignedVendorId);
  const evidenceUrls = (req.body.evidenceUrls && req.body.evidenceUrls.length > 0) ? req.body.evidenceUrls : item.pendingEvidenceUrls;
  const completedDateRaw = req.body.completedDate || item.pendingCompletedDate;

  if (!hasOwner) {
    console.warn(`[compliance-items] operator ${req.operatorId}: blocked complete on ${item._id} - no owner assigned`);
    return res.status(422).json({ error: 'Assign an owner before this can be marked compliant.' });
  }
  if (!evidenceUrls || evidenceUrls.length === 0) {
    console.warn(`[compliance-items] operator ${req.operatorId}: blocked complete on ${item._id} - no evidence attached`);
    return res.status(422).json({ error: 'Attach at least one piece of evidence before this can be marked compliant.' });
  }
  if (!completedDateRaw) {
    console.warn(`[compliance-items] operator ${req.operatorId}: blocked complete on ${item._id} - no completion date`);
    return res.status(422).json({ error: 'Set the date it was completed before this can be marked compliant.' });
  }

  const completedByName = item.assignedContactId?.fullName
    || item.assignedVendorId?.personnelName
    || item.assignedVendorId?.companyName
    || '';

  const updated = await recordCompletion(item, {
    completedDate: new Date(completedDateRaw),
    completedByContactId: item.assignedContactId?._id || null,
    completedByName,
    evidenceUrls,
    notes: req.body.notes || item.pendingNotes || '',
  });

  // clear the draft now that it's finalized
  updated.pendingCompletedDate = null;
  updated.pendingEvidenceUrls = [];
  updated.pendingNotes = '';
  await updated.save();

  console.log(`[compliance-items] operator ${req.operatorId}: CONFIRMED compliant on ${item._id} (by ${completedByName}), next due ${updated.nextDueDate}`);

  const populated = await ComplianceItem.findById(updated._id)
    .populate('assignedContactId', 'fullName title')
    .populate('assignedVendorId', 'companyName personnelName');
  res.json(populated);
});

module.exports = completeItem;
