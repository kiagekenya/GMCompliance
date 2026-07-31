// models/Operator.js
//
// The account that logs in. One Operator = one pipeline company.
// Subscription is managed by Galaxy staff (per the requirements doc,
// there's no self-serve payment - Galaxy sets subscriptionEndsAt manually).

const mongoose = require('mongoose');

const operatorSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  county: { type: String },
  location: { type: String },

  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  emailVerified: { type: Boolean, default: false },

  role: { type: String, enum: ['admin', 'editor', 'viewer'], default: 'admin' },

  subscriptionActive: { type: Boolean, default: true },
  subscriptionEndsAt: { type: Date, default: null }, // null = no end date set yet (e.g. trial pending Galaxy config)

  phmsaApplicable: { type: Boolean, default: true },
  trrcApplicable: { type: Boolean, default: true },
  notes: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Operator', operatorSchema);
