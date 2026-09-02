// routes/vendorPortal/requests.js
// GET/POST /api/vendor-portal/requests, PATCH /api/vendor-portal/requests/:id
// The vendor's half of the two-way connection-request system - covers both
// requests this vendor sent to operators (initiatedBy: 'vendor') and
// requests operators sent to this vendor (initiatedBy: 'operator'). See
// routes/vendorDirectory/requests.js for the operator's mirror half, and
// utils/connectionRequests.js for what happens on accept.

const ConnectionRequest = require('../../models/ConnectionRequest');
const Operator = require('../../models/Operator');
const ComplianceItem = require('../../models/ComplianceItem');
const { sendEmail } = require('../../services/emailService');
const asyncHandler = require('../../utils/asyncHandler');
const { acceptConnectionRequest } = require('../../utils/connectionRequests');

const listRequests = asyncHandler(async (req, res) => {
  const requests = await ConnectionRequest.find({ vendorUserId: req.vendorUser._id })
    .populate('operatorId', 'companyName county location')
    .populate({ path: 'complianceItemId', select: 'requirementId', populate: { path: 'requirementId', select: 'title sourceRegulation categoryName' } })
    .sort({ createdAt: -1 });
  res.json({ requests });
});

const createRequest = asyncHandler(async (req, res) => {
  const { operatorId, message, complianceItemId } = req.body;
  if (!operatorId) {
    return res.status(422).json({ error: 'operatorId is required' });
  }
  const operator = await Operator.findById(operatorId);
  if (!operator) {
    return res.status(404).json({ error: 'Operator not found' });
  }
  // A referenced item, if any, must actually belong to this operator -
  // otherwise a vendor could tag an unrelated operator's regulation.
  let regulationLabel = '';
  if (complianceItemId) {
    const item = await ComplianceItem.findOne({ _id: complianceItemId, operatorId }).populate('requirementId', 'title sourceRegulation');
    if (!item) {
      return res.status(422).json({ error: 'That regulation does not belong to this operator' });
    }
    if (item.requirementId) {
      regulationLabel = `\n  Re: ${item.requirementId.title} (${item.requirementId.sourceRegulation})\n`;
    }
  }

  const request = await ConnectionRequest.create({
    vendorUserId: req.vendorUser._id,
    operatorId,
    complianceItemId: complianceItemId || null,
    initiatedBy: 'vendor',
    message: message || '',
  });

  if (operator.email) {
    const result = await sendEmail({
      to: operator.email,
      subject: `${req.vendorUser.fullName || req.vendorUser.email} wants to collaborate with you`,
      text: `Hi,

${req.vendorUser.fullName || req.vendorUser.email} sent you a collaboration request on Galaxy Compliance Assistant:
${regulationLabel}
  "${message || '(no message)'}"

Log in and open Vendors > Requests from vendors to accept or decline.

- Galaxy Compliance Assistant
`,
    });
    console.log(`[vendor-portal] request email to ${operator.email}: ${result.sent ? 'sent' : 'not sent (' + result.reason + ')'}`);
  }

  res.status(201).json({ request });
});

const respondToRequest = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['accepted', 'declined'].includes(status)) {
    return res.status(422).json({ error: "status must be 'accepted' or 'declined'" });
  }

  const request = await ConnectionRequest.findOne({ _id: req.params.id, vendorUserId: req.vendorUser._id });
  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }
  // A vendor can only respond to a request an OPERATOR sent them - their own
  // outgoing (vendor-initiated) requests just wait on the operator instead.
  if (request.initiatedBy !== 'operator' || request.status !== 'pending') {
    return res.status(403).json({ error: 'This request cannot be responded to' });
  }

  if (status === 'accepted') {
    await acceptConnectionRequest(request);
  } else {
    request.status = 'declined';
    request.respondedAt = new Date();
    await request.save();
  }

  res.json({ request });
});

module.exports = { listRequests, createRequest, respondToRequest };
