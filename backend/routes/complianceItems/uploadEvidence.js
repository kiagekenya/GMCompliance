// routes/complianceItems/uploadEvidence.js
//
// POST /api/compliance-items/:id/evidence
// The admin's own "attach evidence directly" action (as opposed to an
// assignee submitting through their public link - see
// routes/public/submitUpload.js). Real files land on disk via the
// itemUpload multer middleware (see routes/complianceItems/index.js)
// before this handler runs.
//
// Deliberately does NOT set pendingSubmittedByAssignee - an admin
// attaching their own evidence doesn't need a "needs review" notification
// for themselves.

const path = require('path');
const ComplianceItem = require('../../models/ComplianceItem');
const asyncHandler = require('../../utils/asyncHandler');
const { buildEvidenceEntry } = require('../../utils/evidenceStorage');

const uploadEvidence = asyncHandler(async (req, res) => {
  const item = await ComplianceItem.findOne({ _id: req.params.id, operatorId: req.operatorId });
  if (!item) return res.status(404).json({ error: 'Compliance item not found' });

  const files = req.files || [];
  if (files.length === 0) {
    return res.status(422).json({ error: 'No files were attached' });
  }

  const destinationSubdir = path.join('items', String(item._id));
  const newEntries = files.map((f) => buildEvidenceEntry(f, destinationSubdir, 'admin'));

  item.pendingEvidenceUrls = [...(item.pendingEvidenceUrls || []), ...newEntries];
  if (item.pendingEvidenceUrls.length > 0 && !item.pendingCompletedDate) {
    item.pendingCompletedDate = new Date();
  }
  await item.save();

  console.log(`[compliance-items] operator ${req.operatorId}: admin attached ${newEntries.length} file(s) to item ${item._id}`);
  res.status(201).json(item);
});

module.exports = uploadEvidence;
