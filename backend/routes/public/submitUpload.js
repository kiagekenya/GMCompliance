// routes/public/submitUpload.js
//
// POST /api/public/upload/:token
// Fills in the SAME "pending" draft fields the admin's EDIT panel uses -
// this deliberately does NOT call the completion/audit-archive flow. An
// assignee submitting evidence only ever prepares the draft; an admin still
// has to review it and click MARK COMPLIANT on their end. That's the whole
// point of the two-step design - a public, unauthenticated link can never
// directly mark something compliant.

const ComplianceItem = require('../../models/ComplianceItem');
const asyncHandler = require('../../utils/asyncHandler');

const submitUpload = asyncHandler(async (req, res) => {
  const item = await ComplianceItem.findOne({ uploadToken: req.params.token });

  if (!item) {
    console.warn(`[public/upload] submit attempt with unknown/expired token: ${req.params.token}`);
    return res.status(404).json({ error: 'This upload link is invalid or has expired.' });
  }

  const { evidenceUrls, notes, completedDate } = req.body;
  if (!Array.isArray(evidenceUrls) || evidenceUrls.length === 0) {
    return res.status(422).json({ error: 'Please attach at least one file before submitting.' });
  }

  // Append rather than overwrite - if they submit again later (e.g. adding
  // a second document), the first one isn't silently lost.
  item.pendingEvidenceUrls = [...new Set([...(item.pendingEvidenceUrls || []), ...evidenceUrls])];
  item.pendingNotes = notes || item.pendingNotes || '';
  item.pendingCompletedDate = completedDate ? new Date(completedDate) : new Date();
  await item.save();

  console.log(`[public/upload] ${evidenceUrls.length} file(s) submitted for item ${item._id} via public link (${item.pendingEvidenceUrls.length} total)`);
  res.json({ submitted: true, message: 'Thanks - your submission has been recorded. An admin will review it shortly.' });
});

module.exports = submitUpload;
