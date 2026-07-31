// models/Vendor.js
//
// Third-party contractors an operator can assign field-work requirements to
// (odorant checks, cathodic protection testing, etc).

const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Operator', required: true },
  companyName: { type: String, required: true },
  personnelName: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  serviceScope: { type: String, default: '' },
  hasPortalAccess: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Vendor', vendorSchema);
