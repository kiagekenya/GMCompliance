// routes/vendorDirectory/requests.js
// GET/POST /api/vendor-directory/requests, PATCH /api/vendor-directory/requests/:id
// The operator's half of the two-way connection-request system - mirrors
// routes/vendorPortal/requests.js exactly, just scoped to req.operatorId
// instead of a vendor identity. See utils/connectionRequests.js for what
// happens on accept.

const ConnectionRequest = require('../../models/ConnectionRequest');
const VendorUser = require('../../models/VendorUser');
const asyncHandler = require('../../utils/asyncHandler');
const { acceptConnectionRequest } = require('../../utils/connectionRequests');

const listRequests = asyncHandler(async (req, res) => {
  const requests = await ConnectionRequest.find({ operatorId: req.operatorId })
    .populate('vendorUserId', 'email fullName')
    .populate({ path: 'complianceItemId', select: 'requirementId', populate: { path: 'requirementId', select: 'title sourceRegulation categoryName' } })
    .sort({ createdAt: -1 });
  res.json({ requests });
});

const createRequest = asyncHandler(async (req, res) => {
  const { vendorUserId, message } = req.body;
  if (!vendorUserId) {
    return res.status(422).json({ error: 'vendorUserId is required' });
  }
  const vendorUser = await VendorUser.findById(vendorUserId);
  if (!vendorUser) {
    return res.status(404).json({ error: 'Vendor not found' });
  }

  const request = await ConnectionRequest.create({
    vendorUserId,
    operatorId: req.operatorId,
    initiatedBy: 'operator',
    message: message || '',
  });

  res.status(201).json({ request });
});

const respondToRequest = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['accepted', 'declined'].includes(status)) {
    return res.status(422).json({ error: "status must be 'accepted' or 'declined'" });
  }

  const request = await ConnectionRequest.findOne({ _id: req.params.id, operatorId: req.operatorId });
  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }
  // An operator can only respond to a request a VENDOR sent them - their own
  // outgoing (operator-initiated) requests just wait on the vendor instead.
  if (request.initiatedBy !== 'vendor' || request.status !== 'pending') {
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
