// routes/complianceItems/updateItemStatus.js
//
// PATCH /api/compliance-items/:id
// For metadata edits that are NOT "mark compliant" (that's completeItem.js,
// since it triggers the scheduling engine and writes to the audit archive):
// assigning who's responsible for this item, or removing a non-core item.
// Assigning a contact clears any vendor assignment and vice versa - an item
// has exactly one owner at a time.

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

  await item.save();
  console.log(`[compliance-items] operator ${req.operatorId}: updated item ${item._id} assignment`);

  const populated = await ComplianceItem.findById(item._id)
    .populate('assignedContactId', 'fullName title')
    .populate('assignedVendorId', 'companyName personnelName');
  res.json(populated);
});

module.exports = updateItemStatus;
