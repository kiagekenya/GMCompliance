// routes/vendorPortal/updateTask.js
// PATCH /api/vendor-portal/tasks/:id
// Deliberately narrow compared to the admin's updateItemStatus.js - a
// vendor can only touch notes and the date they say they completed the
// work, never reassign, remove, or otherwise change the item itself.
// Ownership is assignedVendorId IN req.vendorIds, not operatorId.

const ComplianceItem = require('../../models/ComplianceItem');
const asyncHandler = require('../../utils/asyncHandler');

const updateTask = asyncHandler(async (req, res) => {
  const item = await ComplianceItem.findOne({ _id: req.params.id, assignedVendorId: { $in: req.vendorIds } });
  if (!item) return res.status(404).json({ error: 'Task not found' });

  if (req.body.pendingNotes !== undefined) {
    item.pendingNotes = req.body.pendingNotes || '';
  }
  if (req.body.completedDate) {
    item.pendingCompletedDate = new Date(req.body.completedDate);
  }

  await item.save();
  console.log(`[vendor-portal] vendor ${req.vendorEmail}: updated draft on task ${item._id}`);

  const populated = await ComplianceItem.findById(item._id).populate('requirementId', 'title sourceRegulation');
  res.json(populated);
});

module.exports = updateTask;
