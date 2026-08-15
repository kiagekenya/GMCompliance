// models/VendorProfile.js
//
// A vendor's OWN self-reported company info - independent of any operator
// relationship, one document per VendorUser. This is what makes the vendor
// portal a two-sided marketplace instead of a task inbox: an operator's
// per-operator Vendor contact entry (models/Vendor.js) only ever holds what
// the OPERATOR typed in about the vendor; this holds what the VENDOR says
// about themselves, and is what operators see when browsing the vendor
// directory or viewing a vendor's profile.
//
// Existence of this document (or lack of it) is what gates the onboarding
// wizard in the vendor portal - a brand new VendorUser has no VendorProfile
// yet, so they land on the setup form instead of an empty task list.

const mongoose = require('mongoose');

const vendorProfileSchema = new mongoose.Schema({
  vendorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'VendorUser', required: true, unique: true },
  companyName: { type: String, required: true },
  phone: { type: String, default: '' },
  website: { type: String, default: '' },
  // Subset of RegulatoryRequirement.categoryName values, e.g. "Corrosion Control" -
  // what kind of compliance work this vendor offers, used both to show on
  // their profile and to help operators filter the directory.
  serviceCategories: [{ type: String }],
  serviceArea: { type: String, default: '' }, // free text: counties/regions served
  yearsInBusiness: { type: Number, default: null },
  certifications: { type: String, default: '' },
  description: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('VendorProfile', vendorProfileSchema);
