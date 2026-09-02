// utils/connectionRequests.js
//
// Shared by both accept endpoints - a vendor accepting a request an operator
// sent them (routes/vendorPortal/requests.js), and an operator accepting a
// request a vendor sent them (routes/vendorDirectory/requests.js). Either
// direction, acceptance has the identical effect as directly adding a
// vendor from the marketplace directory - see utils/vendorLinking.js for
// the shared logic. Also emails whichever side ORIGINALLY SENT the request,
// since up to now they only had the in-app inbox to check.

const { linkVendorToOperator } = require('./vendorLinking');
const VendorUser = require('../models/VendorUser');
const Operator = require('../models/Operator');
const { sendEmail } = require('../services/emailService');

async function acceptConnectionRequest(request) {
  const vendorRecord = await linkVendorToOperator(request.operatorId, request.vendorUserId);

  request.status = 'accepted';
  request.respondedAt = new Date();
  await request.save();

  await notifyInitiatorOfAcceptance(request, vendorRecord);

  return vendorRecord;
}

async function notifyInitiatorOfAcceptance(request, vendorRecord) {
  const operator = await Operator.findById(request.operatorId);
  const vendorUser = await VendorUser.findById(request.vendorUserId);

  const isVendorInitiated = request.initiatedBy === 'vendor';
  const toEmail = isVendorInitiated ? vendorUser?.email : operator?.email;
  const counterpartName = isVendorInitiated ? (operator?.companyName || 'The operator') : (vendorRecord.companyName || 'The vendor');
  const nextStepText = isVendorInitiated && request.complianceItemId
    ? 'Log in to your vendor portal, open REQUESTS, and click to confirm you\'re ready to start - that lets them know directly and starts the final collaboration step.'
    : 'Log in and check REQUESTS for the details.';

  if (!toEmail) {
    console.log(`[connection-requests] request ${request._id} accepted but no email on file for the initiator - skipping notification`);
    return;
  }

  const result = await sendEmail({
    to: toEmail,
    subject: `${counterpartName} accepted your collaboration request`,
    text: `Hi,

${counterpartName} accepted your collaboration request on Galaxy Compliance Assistant.

${nextStepText}

- Galaxy Compliance Assistant
`,
  });
  console.log(`[connection-requests] acceptance email to ${toEmail}: ${result.sent ? 'sent' : 'not sent (' + result.reason + ')'}`);
}

module.exports = { acceptConnectionRequest };
