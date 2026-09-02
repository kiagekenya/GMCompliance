// models/ConnectionRequest.js
//
// The two-way marketplace handshake: a vendor can ask an operator "we can do
// X and Y for you", or an operator can ask a vendor "we need you for our
// compliance work" - same model, direction tracked by initiatedBy. Accepting
// either direction has the identical effect (see utils/connectionRequests.js's
// acceptConnectionRequest): it creates/updates the operator's Vendor contact
// record for that vendor's email with hasPortalAccess: true - the same
// outcome an operator gets today by manually adding a vendor in
// Settings/Vendors, just triggered by acceptance instead of a form.

const mongoose = require('mongoose');

const connectionRequestSchema = new mongoose.Schema({
  vendorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorUser', required: true },
  operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Operator', required: true },
  // Optional - lets a vendor-initiated request point at the specific
  // ComplianceItem they're offering to help with ("we can do THIS for
  // you"), instead of only a generic pitch at the operator. Null for a
  // general inquiry not tied to one regulation.
  complianceItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'ComplianceItem', default: null },
  initiatedBy: { type: String, enum: ['vendor', 'operator'], required: true },
  message: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  respondedAt: { type: Date, default: null },

  // Second handshake, only meaningful once status is 'accepted' AND
  // complianceItemId is set (a specific-regulation offer, not a general
  // inquiry) - see routes/vendorPortal/startCollaboration.js and
  // routes/vendorDirectory/confirmCollaboration.js. 'accepted' only means
  // the two sides are now connected (a Vendor contact record exists); it
  // does NOT assign anyone to the regulation. The vendor confirming
  // they're ready to start (collaborationRequestedAt), then the operator
  // confirming back (collaborationConfirmedAt), is what actually sets
  // ComplianceItem.assignedVendorId - same real assignment RequirementDetail
  // uses for any other assignee, upload link included.
  collaborationRequestedAt: { type: Date, default: null },
  collaborationConfirmedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('ConnectionRequest', connectionRequestSchema);
