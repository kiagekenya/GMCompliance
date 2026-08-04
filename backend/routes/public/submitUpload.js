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

  const { evidenceUrl, notes, completedDate } = req.body;
  if (!evidenceUrl) {
    return res.status(422).json({ error: 'Please attach a file before submitting.' });
  }

  item.pendingEvidenceUrl = evidenceUrl;
  item.pendingNotes = notes || '';
  item.pendingCompletedDate = completedDate ? new Date(completedDate) : new Date();
  await item.save();

  console.log(`[public/upload] evidence submitted for item ${item._id} via public link`);
  res.json({ submitted: true, message: 'Thanks - your submission has been recorded. An admin will review it shortly.' });
});

module.exports = submitUpload;
