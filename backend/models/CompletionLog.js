// models/CompletionLog.js
//
// Permanent, never-deleted record of every time a compliance item got marked
// done. This is what the operator hands an inspector during an audit.

const mongoose = require('mongoose');

const completionLogSchema = new mongoose.Schema({
  complianceItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'ComplianceItem', required: true },
  operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Operator', required: true },
  completedDate: { type: Date, required: true },
  completedByContactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', default: null },
  evidenceUrl: { type: String, default: null },
  notes: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('CompletionLog', completionLogSchema);
