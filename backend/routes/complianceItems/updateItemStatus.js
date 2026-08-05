// routes/complianceItems/updateItemStatus.js
//
// PATCH /api/compliance-items/:id
// This is the "EDIT" action: assign an owner, and/or fill in the draft
// completion info (date it was actually done + evidence + notes) as the
// assigned person prepares it. NOTHING here finalizes compliance or writes
// to the audit archive - that only happens via completeItem.js, which a
// (possibly different) person triggers once this looks right.
//
// Assigning someone new generates a fresh public upload link and emails it
// to them - they may have no system login at all, so this is their only
// way to submit evidence. The admin still reviews and clicks MARK COMPLIANT
// separately; this link only ever fills in the draft, never finalizes it.

const crypto = require('crypto');
const ComplianceItem = require('../../models/ComplianceItem');
const RegulatoryRequirement = require('../../models/RegulatoryRequirement');
const Contact = require('../../models/Contact');
const Vendor = require('../../models/Vendor');
const { sendEmail } = require('../../services/emailService');
const asyncHandler = require('../../utils/asyncHandler');

const updateItemStatus = asyncHandler(async (req, res) => {
  const item = await ComplianceItem.findOne({ _id: req.params.id, operatorId: req.operatorId });
  if (!item) return res.status(404).json({ error: 'Compliance item not found' });

  if (req.body.isRemoved === true) {
    const requirement = await RegulatoryRequirement.findById(item.requirementId);
    if (requirement && requirement.removable === false) {
      console.warn(`[compliance-items] operator ${req.operatorId}: blocked removal of core item ${item._id}`);
      return res.status(403).json({ error: 'This is a core requirement and cannot be removed' });
    }
    item.isRemoved = true;
    await item.save();
    console.log(`[compliance-items] operator ${req.operatorId}: removed item ${item._id}`);
    return res.json(item);
  }

  let newlyAssignedEmail = null;
  let newlyAssignedName = null;

  if (req.body.assignedContactId !== undefined) {
    item.assignedContactId = req.body.assignedContactId || null;
    item.assignedVendorId = null; // one owner at a time
    item.assignedAt = item.assignedContactId ? new Date() : null;
    if (item.assignedContactId) {
      const contact = await Contact.findById(item.assignedContactId);
      if (contact) { newlyAssignedEmail = contact.email; newlyAssignedName = contact.fullName; }
    }
  }
  if (req.body.assignedVendorId !== undefined) {
    item.assignedVendorId = req.body.assignedVendorId || null;
    item.assignedContactId = null;
    item.assignedAt = item.assignedVendorId ? new Date() : null;
    if (item.assignedVendorId) {
      const vendor = await Vendor.findById(item.assignedVendorId);
      if (vendor) { newlyAssignedEmail = vendor.email; newlyAssignedName = vendor.personnelName || vendor.companyName; }
    }
  }
  if (req.body.customFrequencyValue !== undefined) {
    item.customFrequencyValue = req.body.customFrequencyValue;
  }

  // Opening the requirement's detail page (see RequirementDetail.jsx) fires
  // this - it's what clears the "needs review" badge/notification once the
  // admin has actually seen an assignee's submission.
  if (req.body.acknowledgeReview === true) {
    item.pendingReviewedAt = new Date();
  }

  // No manual date picker for this anymore (see RequirementDetail.jsx) -
  // a date only means something once real evidence exists. If evidence is
  // being attached here without an explicit date, default to today rather
  // than asking the admin to pick one during what's really an assignment
  // action. The assignee's own public upload link still lets THEM pick the
  // real date they did the work, which is more accurate when available.
  if (req.body.pendingEvidenceUrls !== undefined) {
    item.pendingEvidenceUrls = Array.isArray(req.body.pendingEvidenceUrls) ? req.body.pendingEvidenceUrls : [];
    if (item.pendingEvidenceUrls.length > 0 && !item.pendingCompletedDate) {
      item.pendingCompletedDate = new Date();
    }
  }
  if (req.body.pendingNotes !== undefined) {
    item.pendingNotes = req.body.pendingNotes || '';
  }

  // A fresh assignment gets a fresh upload link - old links shouldn't stay
  // valid for whoever was assigned before.
  if (newlyAssignedEmail) {
    item.uploadToken = crypto.randomBytes(24).toString('hex');
  }

  await item.save();
  console.log(`[compliance-items] operator ${req.operatorId}: edited item ${item._id}`);

  if (newlyAssignedEmail) {
    const requirement = await RegulatoryRequirement.findById(item.requirementId);
    const uploadLink = `${process.env.FRONTEND_ORIGIN || 'http://localhost:3000'}/upload/${item.uploadToken}`;
    const dueText = item.nextDueDate ? new Date(item.nextDueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'not yet set';

    const result = await sendEmail({
      to: newlyAssignedEmail,
      subject: `You've been assigned: ${requirement?.title || 'a compliance task'}`,
      text: `Hi ${newlyAssignedName || ''},

You've been assigned responsibility for the following compliance requirement:

  ${requirement?.title || 'Requirement'}
  ${requirement?.sourceRegulation || ''}
  Due: ${dueText}

When you've completed this, please upload your evidence here:
  ${uploadLink}

You don't need an account to use that link. Once you submit, an admin will
review it and mark this as compliant on their end.

- Galaxy Compliance Assistant
`,
    });
    console.log(`[compliance-items] assignment email to ${newlyAssignedEmail}: ${result.sent ? 'sent' : 'not sent (' + result.reason + ')'}`);
  }

  const populated = await ComplianceItem.findById(item._id)
    .populate('assignedContactId', 'fullName title')
    .populate('assignedVendorId', 'companyName personnelName');
  res.json(populated);
});

module.exports = updateItemStatus;
