// models/Contact.js
//
// The escalation ladder. escalationLevel 1 = notified first (field/office),
// rising numbers = notified later, as a requirement gets closer to overdue.

const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Operator', required: true },
  fullName: { type: String, required: true },
  title: { type: String, default: '' },
  email: { type: String, required: true },
  phone: { type: String, default: '' },
  escalationLevel: { type: Number, required: true }, // 1 = first notified
  accessRole: { type: String, enum: ['admin', 'editor', 'viewer'], default: 'viewer' },
}, { timestamps: true });

module.exports = mongoose.model('Contact', contactSchema);
