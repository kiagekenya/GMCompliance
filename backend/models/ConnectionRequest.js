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
  initiatedBy: { type: String, enum: ['vendor', 'operator'], required: true },
  message: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'accepted', 'declined'], default: 'pending' },
  respondedAt: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('ConnectionRequest', connectionRequestSchema);
