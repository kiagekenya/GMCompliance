// routes/complianceItems/updateItemStatus.js
//
// PATCH /api/compliance-items/:id
// This is the "EDIT" action: assign an owner, and/or fill in the draft
// completion info (date it was actually done + evidence + notes) as the
// assigned person prepares it. NOTHING here finalizes compliance or writes
// to the audit archive - that only happens via completeItem.js, which a
// (possibly different) person triggers once this looks right.

const ComplianceItem = require('../../models/ComplianceItem');
const RegulatoryRequirement = require('../../models/RegulatoryRequirement');
const asyncHandler = require('../../utils/asyncHandler');

const updateItemStatus = asyncHandler(async (req, res) => {
  const item = await ComplianceItem.findOne({ _id: req.params.id, operatorId: req.operatorId });
  if (!item) return res.status(404).json({ error: 'Compliance item not found' });

  if (req.body.isRemoved === true) {
    const requirement = await RegulatoryRequirement.findById(item.requirementId);
    if (requirement && requirement.removable === false) {
      console.warn(`[compliance-items] operator ${req.operatorId}: blocked removal of core item ${item._id}`);
      return res.status(403).json({ error: 'This is a core requirement and cannot be removed' });
    }
    item.isRemoved = true;
    await item.save();
    console.log(`[compliance-items] operator ${req.operatorId}: removed item ${item._id}`);
    return res.json(item);
  }

  if (req.body.assignedContactId !== undefined) {
    item.assignedContactId = req.body.assignedContactId || null;
    item.assignedVendorId = null; // one owner at a time
  }
  if (req.body.assignedVendorId !== undefined) {
    item.assignedVendorId = req.body.assignedVendorId || null;
    item.assignedContactId = null;
  }
  if (req.body.customFrequencyValue !== undefined) {
    item.customFrequencyValue = req.body.customFrequencyValue;
  }

  // Draft completion info - the assigned person's prep work, not yet final
  if (req.body.pendingCompletedDate !== undefined) {
    item.pendingCompletedDate = req.body.pendingCompletedDate ? new Date(req.body.pendingCompletedDate) : null;
  }
  if (req.body.pendingEvidenceUrl !== undefined) {
    item.pendingEvidenceUrl = req.body.pendingEvidenceUrl || null;
  }
  if (req.body.pendingNotes !== undefined) {
    item.pendingNotes = req.body.pendingNotes || '';
  }

  await item.save();
  console.log(`[compliance-items] operator ${req.operatorId}: edited item ${item._id}`);

  const populated = await ComplianceItem.findById(item._id)
    .populate('assignedContactId', 'fullName title')
    .populate('assignedVendorId', 'companyName personnelName');
  res.json(populated);
});

module.exports = updateItemStatus;
