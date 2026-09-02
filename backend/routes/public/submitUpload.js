// routes/public/submitUpload.js
//
// POST /api/public/upload/:token
// Fills in the SAME "pending" draft fields the admin's EDIT panel uses -
// this deliberately does NOT call the completion/audit-archive flow. An
// assignee submitting evidence only ever prepares the draft; an admin still
// has to review it and click MARK COMPLIANT on their end. That's the whole
// point of the two-step design - a public, unauthenticated link can never
// directly mark something compliant.
//
// Real files land on disk via the publicUpload multer middleware (see
// routes/public/index.js) before this handler runs - req.files is the
// array of saved files, each turned into a real evidence entry here. Also
// flags pendingSubmittedByAssignee so the admin's dashboard shows a
// "needs review" notification (see models/ComplianceItem.js), and emails
// the operator directly (see notificationService.notifySubmissionForReview) -
// the in-app badge alone was easy to miss.

const path = require('path');
const ComplianceItem = require('../../models/ComplianceItem');
const RegulatoryRequirement = require('../../models/RegulatoryRequirement');
const { notifySubmissionForReview } = require('../../services/notificationService');
const asyncHandler = require('../../utils/asyncHandler');
const { buildEvidenceEntry } = require('../../utils/evidenceStorage');

const submitUpload = asyncHandler(async (req, res) => {
  const item = await ComplianceItem.findOne({ uploadToken: req.params.token })
    .populate('assignedContactId', 'fullName')
    .populate('assignedVendorId', 'companyName personnelName');

  if (!item) {
    console.warn(`[public/upload] submit attempt with unknown/expired token: ${req.params.token}`);
    return res.status(404).json({ error: 'This upload link is invalid or has expired.' });
  }

  const files = req.files || [];
  if (files.length === 0) {
    return res.status(422).json({ error: 'Please attach at least one file before submitting.' });
  }

  const destinationSubdir = path.join('public', req.params.token);
  const newEntries = files.map((f) => buildEvidenceEntry(f, destinationSubdir, 'assignee'));

  // Append rather than overwrite - if they submit again later (e.g. adding
  // a second document), the first one isn't silently lost.
  item.pendingEvidenceUrls = [...(item.pendingEvidenceUrls || []), ...newEntries];
  item.pendingNotes = req.body.notes || item.pendingNotes || '';
  item.pendingCompletedDate = req.body.completedDate ? new Date(req.body.completedDate) : new Date();

  // Every new submission (re)flags this for admin review, even if a
  // previous submission was already reviewed. A fresh round also clears
  // out any earlier reviewer comment - it was about the last submission,
  // not this new one.
  item.pendingSubmittedByAssignee = true;
  item.pendingReviewedAt = null;
  item.reviewerComment = '';
  item.reviewerCommentAt = null;

  await item.save();

  console.log(`[public/upload] ${newEntries.length} file(s) submitted for item ${item._id} via public link (${item.pendingEvidenceUrls.length} total)`);

  const submitterName = item.assignedContactId?.fullName || item.assignedVendorId?.personnelName || item.assignedVendorId?.companyName;
  const requirement = await RegulatoryRequirement.findById(item.requirementId);
  notifySubmissionForReview(item, requirement, submitterName)
    .catch((err) => console.error(`[public/upload] notifySubmissionForReview failed for item ${item._id}:`, err.message));

  res.json({ submitted: true, message: 'Thanks - your submission has been recorded. An admin will review it shortly.' });
});

module.exports = submitUpload;
