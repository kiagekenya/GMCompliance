// routes/vendorPortal/startCollaboration.js
//
// POST /api/vendor-portal/requests/:id/start-collaboration
// The second handshake, only for a vendor-initiated request tied to a
// specific regulation (complianceItemId) that the operator already
// accepted. 'accepted' only means the two sides are connected - it does
// NOT put the vendor on the operator's calendar yet. This is the vendor
// clicking "I'm ready to start this now" from their Requests page: it
// emails the operator directly (not just an in-app row) and stamps
// collaborationRequestedAt so the operator's side can show a CONFIRM
// COLLABORATION button (see routes/vendorDirectory/confirmCollaboration.js,
// which is what actually assigns the vendor on the ComplianceItem).

const ConnectionRequest = require('../../models/ConnectionRequest');
const Operator = require('../../models/Operator');
const { sendEmail } = require('../../services/emailService');
const asyncHandler = require('../../utils/asyncHandler');

const startCollaboration = asyncHandler(async (req, res) => {
  const request = await ConnectionRequest.findOne({ _id: req.params.id, vendorUserId: req.vendorUser._id })
    .populate({ path: 'complianceItemId', select: 'requirementId', populate: { path: 'requirementId', select: 'title sourceRegulation' } });
  if (!request) return res.status(404).json({ error: 'Request not found' });

  if (request.status !== 'accepted') {
    return res.status(422).json({ error: 'This request has not been accepted yet' });
  }
  if (!request.complianceItemId) {
    return res.status(422).json({ error: 'This request is not tied to a specific regulation' });
  }
  if (request.collaborationRequestedAt) {
    return res.status(422).json({ error: "Already sent - waiting on the operator to confirm" });
  }

  request.collaborationRequestedAt = new Date();
  await request.save();

  const operator = await Operator.findById(request.operatorId);
  const regulation = request.complianceItemId.requirementId;
  const vendorLabel = req.vendorUser.fullName || req.vendorUser.email;

  if (operator?.email) {
    const result = await sendEmail({
      to: operator.email,
      subject: `${vendorLabel} is ready to start: ${regulation?.title || 'a regulation'}`,
      text: `Hi,

${vendorLabel} confirmed they're ready to start work on:

  ${regulation?.title || 'Requirement'}
  ${regulation?.sourceRegulation || ''}

Log in and open Vendors > Requests from vendors to confirm the collaboration -
that officially assigns them on your compliance calendar and sends them the
evidence upload link.

- Galaxy Compliance Assistant
`,
    });
    console.log(`[vendor-portal] start-collaboration email to ${operator.email}: ${result.sent ? 'sent' : 'not sent (' + result.reason + ')'}`);
  }

  res.json({ request });
});

module.exports = startCollaboration;
