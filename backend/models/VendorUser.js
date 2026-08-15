// models/VendorUser.js
//
// A vendor/contractor's own login identity - separate from Operator, and
// independent of any specific operator relationship. A person can sign up
// as a vendor before any operator has ever heard of them.
//
// What actually connects a VendorUser to real work is NOT stored here -
// it's resolved at request time by matching this record's email against
// Vendor documents (the per-operator contact entries operators create in
// Settings/Vendors) that have hasPortalAccess: true. See
// middleware/vendorAuth.js. A VendorUser can therefore be linked to
// multiple operators at once, or to none yet.

const mongoose = require('mongoose');

const vendorUserSchema = new mongoose.Schema({
  clerkUserId: { type: String, required: true, unique: true },
  email: { type: String, required: true },
  fullName: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('VendorUser', vendorUserSchema);
