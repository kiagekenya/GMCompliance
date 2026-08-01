// models/Operator.js
//
// The account record. Identity (email, password, sessions) is entirely
// owned by Clerk now - this document only stores the app-specific bits
// Clerk doesn't know about: company name, subscription state, and role.
// clerkUserId links it back to the Clerk user (e.g. "user_2abc...").
//
// A row here gets created automatically, on first authenticated request,
// by middleware/clerkAuth.js - there is no separate "signup" endpoint
// anymore, since Clerk's hosted UI handles account creation before the
// app ever sees the person.

const mongoose = require('mongoose');

const operatorSchema = new mongoose.Schema({
  clerkUserId: { type: String, required: true, unique: true },
  email: { type: String, default: '' }, // copied from Clerk at creation time, for display only

  companyName: { type: String, default: 'New Operator' },
  county: { type: String, default: '' },
  location: { type: String, default: '' },

  role: { type: String, enum: ['admin', 'editor', 'viewer'], default: 'admin' },

  subscriptionActive: { type: Boolean, default: true },
  subscriptionEndsAt: { type: Date, default: null },

  phmsaApplicable: { type: Boolean, default: true },
  trrcApplicable: { type: Boolean, default: true },
  notes: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Operator', operatorSchema);
