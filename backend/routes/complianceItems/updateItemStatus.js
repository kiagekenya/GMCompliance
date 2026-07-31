// routes/complianceItems/updateItemStatus.js
//
// PATCH /api/compliance-items/:id
// For everyday edits that aren't "mark done" (that has its own route below
// since it triggers the scheduling engine): marking work as started, editing
// the anchor date, removing a non-core suggested item, or reassigning a vendor.

const ComplianceItem = require('../../models/ComplianceItem');
const RegulatoryRequirement = require('../../models/RegulatoryRequirement');
const asyncHandler = require('../../utils/asyncHandler');

const EDITABLE_FIELDS = ['status', 'assignedVendorId', 'customFrequencyValue'];

const updateItemStatus = asyncHandler(async (req, res) => {
  const item = await ComplianceItem.findOne({ _id: req.params.id, operatorId: req.operatorId });
  if (!item) return res.status(404).json({ error: 'Compliance item not found' });

  if (req.body.isRemoved === true) {
    const requirement = await RegulatoryRequirement.findById(item.requirementId);
    if (requirement && requirement.removable === false) {
      return res.status(403).json({ error: 'This is a core requirement and cannot be removed' });
    }
    item.isRemoved = true;
    await item.save();
    return res.json(item);
  }

  for (const field of EDITABLE_FIELDS) {
    if (req.body[field] !== undefined) item[field] = req.body[field];
  }

  await item.save();
  res.json(item);
});

module.exports = updateItemStatus;
