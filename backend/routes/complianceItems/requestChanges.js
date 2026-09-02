// routes/complianceItems/requestChanges.js
//
// POST /api/compliance-items/:id/request-changes
// The "not quite - fix this" counterpart to completeItem.js's MARK
// COMPLIANT: the admin reviewed a submission and it isn't ready. Leaves a
// comment for whoever's assigned (contact or vendor), emails them
// directly, and clears the "needs review" badge - the assignee has to
// resubmit (routes/vendorPortal/submitForReview.js or the public upload
// link) before it reappears, at which point the comment is cleared for the
// new round.

const ComplianceItem = require('../../models/ComplianceItem');
const { sendEmail } = require('../../services/emailService');
const asyncHandler = require('../../utils/asyncHandler');

const requestChanges = asyncHandler(async (req, res) => {
  const { comment } = req.body;
  if (!comment || !comment.trim()) {
    return res.status(422).json({ error: 'A comment is required so the assignee knows what to fix' });
  }

  const item = await ComplianceItem.findOne({ _id: req.params.id, operatorId: req.operatorId })
    .populate('assignedContactId', 'fullName email')
    .populate('assignedVendorId', 'companyName personnelName email')
    .populate('requirementId', 'title sourceRegulation');
  if (!item) return res.status(404).json({ error: 'Compliance item not found' });

  item.reviewerComment = comment.trim();
  item.reviewerCommentAt = new Date();
  // It HAS been reviewed - just not accepted - so the "needs review" badge
  // clears the same way MARK COMPLIANT would, without touching status.
  item.pendingReviewedAt = new Date();
  await item.save();

  const email = item.assignedContactId?.email || item.assignedVendorId?.email;
  const name = item.assignedContactId?.fullName || item.assignedVendorId?.personnelName || item.assignedVendorId?.companyName;

  if (email) {
    const result = await sendEmail({
      to: email,
      subject: `Changes requested: ${item.requirementId?.title || 'a compliance task'}`,
      text: `Hi ${name || ''},

Your submission for the following was reviewed, but needs changes before it
can be marked compliant:

  ${item.requirementId?.title || 'Requirement'}
  ${item.requirementId?.sourceRegulation || ''}

Comment from the reviewer:
  "${comment.trim()}"

Please make the correction and resubmit.

- Galaxy Compliance Assistant
`,
    });
    console.log(`[compliance-items] request-changes email to ${email}: ${result.sent ? 'sent' : 'not sent (' + result.reason + ')'}`);
  } else {
    console.log(`[compliance-items] operator ${req.operatorId}: request-changes on item ${item._id} but no assignee email on file`);
  }

  res.json(item);
});

module.exports = requestChanges;
