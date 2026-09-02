// routes/vendorPortal/uploadEvidence.js
// POST /api/vendor-portal/tasks/:id/evidence
// A DRAFT attach only - same as the admin's own direct attach
// (routes/complianceItems/uploadEvidence.js), deliberately does NOT flag
// pendingSubmittedByAssignee. A vendor with an authenticated session can
// come back and add/remove files over multiple visits before they're ready;
// only the explicit SUBMIT FOR REVIEW action (routes/vendorPortal/submitForReview.js)
// actually notifies the operator. This is what used to notify on every
// single file attach - moved out so "save this file" and "send the whole
// thing to the operator" are two distinct, explicit actions.

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
  await item.save();

  console.log(`[vendor-portal] vendor ${req.vendorEmail}: attached ${newEntries.length} file(s) to task ${item._id}`);

  const populated = await ComplianceItem.findById(item._id).populate('requirementId', 'title sourceRegulation');
  res.status(201).json(populated);
});

module.exports = uploadEvidence;
