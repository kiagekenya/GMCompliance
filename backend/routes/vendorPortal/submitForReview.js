// routes/vendorPortal/submitForReview.js
//
// POST /api/vendor-portal/tasks/:id/submit
// The explicit "send the whole thing to the operator" action - separate on
// purpose from routes/vendorPortal/uploadEvidence.js (which only saves a
// draft file) and updateTask.js (which only saves draft notes/date). A
// vendor can attach files and edit notes over several visits without
// notifying anyone; only clicking SUBMIT FOR REVIEW here flags the item
// (pendingSubmittedByAssignee) and emails the operator - see
// services/notificationService.js's notifySubmissionForReview.

const ComplianceItem = require('../../models/ComplianceItem');
const RegulatoryRequirement = require('../../models/RegulatoryRequirement');
const { notifySubmissionForReview } = require('../../services/notificationService');
const asyncHandler = require('../../utils/asyncHandler');

const submitForReview = asyncHandler(async (req, res) => {
  const item = await ComplianceItem.findOne({ _id: req.params.id, assignedVendorId: { $in: req.vendorIds } });
  if (!item) return res.status(404).json({ error: 'Task not found' });

  if (!(item.pendingEvidenceUrls || []).length) {
    return res.status(422).json({ error: 'Attach at least one file before submitting.' });
  }
  if (!item.pendingCompletedDate) {
    item.pendingCompletedDate = new Date();
  }

  // A fresh round: last time's reviewer comment (if any) no longer applies
  // once new work has been submitted on top of it.
  item.pendingSubmittedByAssignee = true;
  item.pendingReviewedAt = null;
  item.reviewerComment = '';
  item.reviewerCommentAt = null;
  await item.save();

  console.log(`[vendor-portal] vendor ${req.vendorEmail}: submitted task ${item._id} for review`);

  const requirement = await RegulatoryRequirement.findById(item.requirementId);
  notifySubmissionForReview(item, requirement, req.vendorUser.fullName || req.vendorUser.email)
    .catch((err) => console.error(`[vendor-portal] notifySubmissionForReview failed for item ${item._id}:`, err.message));

  const populated = await ComplianceItem.findById(item._id).populate('requirementId', 'title sourceRegulation');
  res.json(populated);
});

module.exports = submitForReview;
