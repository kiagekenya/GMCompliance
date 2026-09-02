// routes/vendorDirectory/confirmCollaboration.js
//
// POST /api/vendor-directory/requests/:id/confirm-collaboration
// The operator's half of the second handshake (see
// routes/vendorPortal/startCollaboration.js for the vendor's half, which
// has to run first). Only once the vendor has confirmed they're ready to
// start does this become available. Confirming is what actually assigns
// the vendor on the ComplianceItem - the exact same outcome as assigning
// any contact/vendor from RequirementDetail.jsx
// (routes/complianceItems/updateItemStatus.js): a fresh upload link,
// generated and emailed to the vendor, so this page now shows all the same
// details a normal assignee would get.

const crypto = require('crypto');
const ConnectionRequest = require('../../models/ConnectionRequest');
const ComplianceItem = require('../../models/ComplianceItem');
const Vendor = require('../../models/Vendor');
const VendorUser = require('../../models/VendorUser');
const RegulatoryRequirement = require('../../models/RegulatoryRequirement');
const { computeReminderCheckpoints } = require('../../utils/dateMath');
const { sendEmail } = require('../../services/emailService');
const asyncHandler = require('../../utils/asyncHandler');

const confirmCollaboration = asyncHandler(async (req, res) => {
  const request = await ConnectionRequest.findOne({ _id: req.params.id, operatorId: req.operatorId });
  if (!request) return res.status(404).json({ error: 'Request not found' });

  if (request.status !== 'accepted') {
    return res.status(422).json({ error: 'This request has not been accepted yet' });
  }
  if (!request.complianceItemId) {
    return res.status(422).json({ error: 'This request is not tied to a specific regulation' });
  }
  if (!request.collaborationRequestedAt) {
    return res.status(422).json({ error: 'The vendor has not asked to start yet' });
  }
  if (request.collaborationConfirmedAt) {
    return res.status(422).json({ error: 'This collaboration is already confirmed' });
  }

  const vendorUser = await VendorUser.findById(request.vendorUserId);
  if (!vendorUser) return res.status(404).json({ error: 'Vendor account no longer exists' });

  const vendorRecord = await Vendor.findOne({ operatorId: req.operatorId, email: vendorUser.email });
  if (!vendorRecord) return res.status(404).json({ error: 'Vendor is not on your vendor list yet' });

  const item = await ComplianceItem.findOne({ _id: request.complianceItemId, operatorId: req.operatorId });
  if (!item) return res.status(404).json({ error: 'That regulation no longer exists on your calendar' });

  // Identical to what routes/complianceItems/updateItemStatus.js does for a
  // manual vendor assignment: one owner at a time, a fresh upload link
  // (invalidates any old one), assignedAt stamped now.
  item.assignedVendorId = vendorRecord._id;
  item.assignedContactId = null;
  item.assignedAt = new Date();
  item.uploadToken = crypto.randomBytes(24).toString('hex');
  await item.save();

  request.collaborationConfirmedAt = new Date();
  await request.save();

  if (vendorRecord.email) {
    const requirement = await RegulatoryRequirement.findById(item.requirementId);
    const uploadLink = `${process.env.FRONTEND_ORIGIN || 'http://localhost:3000'}/upload/${item.uploadToken}`;

    // No fake placeholder here either (see baselineScheduling.js) - if the
    // operator hasn't set a real baseline date yet, say so plainly instead
    // of a blank/misleading due date, and give the vendor a path forward
    // (they can ask from their task page - routes/vendorPortal/requestDueDate.js).
    let scheduleText;
    if (item.nextDueDate) {
      const dueText = new Date(item.nextDueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      const checkpoints = computeReminderCheckpoints(item.nextDueDate, item.actionWindowMonths);
      const reminderText = checkpoints.length > 0
        ? checkpoints.map((d) => `  - ${d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`).join('\n')
        : '  (none scheduled yet)';
      scheduleText = `Due: ${dueText}\n\nYou'll be reminded starting on these dates:\n${reminderText}`;
    } else {
      scheduleText = "Due date: not yet set - the operator hasn't entered when this was last actually done. You can ask them to set it from this task's page in your Vendor Portal.";
    }

    const result = await sendEmail({
      to: vendorRecord.email,
      subject: `Collaboration confirmed: ${requirement?.title || 'a compliance task'}`,
      text: `Hi ${vendorRecord.personnelName || vendorRecord.companyName || ''},

The operator confirmed the collaboration - you're now the assignee for:

  ${requirement?.title || 'Requirement'}
  ${requirement?.sourceRegulation || ''}

${scheduleText}

When you've completed this, please upload your evidence here:
  ${uploadLink}

You can also track this from your Vendor Portal task list.

- Galaxy Compliance Assistant
`,
    });
    console.log(`[vendor-directory] collaboration-confirmed email to ${vendorRecord.email}: ${result.sent ? 'sent' : 'not sent (' + result.reason + ')'}`);
  }

  const populatedRequest = await ConnectionRequest.findById(request._id)
    .populate('vendorUserId', 'email fullName')
    .populate({ path: 'complianceItemId', select: 'requirementId', populate: { path: 'requirementId', select: 'title sourceRegulation categoryName' } });

  res.json({ request: populatedRequest, item });
});

module.exports = confirmCollaboration;
