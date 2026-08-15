// routes/vendorPortal/uploadEvidence.js
// POST /api/vendor-portal/tasks/:id/evidence
// Functionally the same action as the public upload link
// (routes/public/submitUpload.js) - a vendor submitting evidence flags the
// item for the admin's review (pendingSubmittedByAssignee), it never marks
// anything compliant. The difference is this is a real authenticated
// session instead of a one-off token, so a vendor can come back and see
// everything they're assigned to in one place.

const path = require('path');
const ComplianceItem = require('../../models/ComplianceItem');
const asyncHandler = require('../../utils/asyncHandler');
const { buildEvidenceEntry } = require('../../utils/evidenceStorage');

const uploadEvidence = asyncHandler(async (req, res) => {
  const item = await ComplianceItem.findOne({ _id: req.params.id, assignedVendorId: { $in: req.vendorIds } });
  if (!item) return res.status(404).json({ error: 'Task not found' });

  const files = req.files || [];
  if (files.length === 0) {
    return res.status(422).json({ error: 'No files were attached' });
  }

  const destinationSubdir = path.join('items', String(item._id));
  const newEntries = files.map((f) => buildEvidenceEntry(f, destinationSubdir, 'assignee'));

  item.pendingEvidenceUrls = [...(item.pendingEvidenceUrls || []), ...newEntries];
  if (item.pendingEvidenceUrls.length > 0 && !item.pendingCompletedDate) {
    item.pendingCompletedDate = new Date();
  }
  item.pendingSubmittedByAssignee = true;
  item.pendingReviewedAt = null;
  await item.save();

  console.log(`[vendor-portal] vendor ${req.vendorEmail}: attached ${newEntries.length} file(s) to task ${item._id}`);

  const populated = await ComplianceItem.findById(item._id).populate('requirementId', 'title sourceRegulation');
  res.status(201).json(populated);
});

module.exports = uploadEvidence;
