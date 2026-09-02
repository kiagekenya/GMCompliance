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
  completedByName: { type: String, default: '' }, // free text fallback - doesn't require an existing Contact record
  // Mixed, not a strict subdocument schema: older entries are plain filename
  // strings (from before real file storage existed), newer ones are objects
  // { originalName, storedName, mimeType, size, uploadedBy, uploadedAt } -
  // see utils/evidenceStorage.js. A strict schema would throw a cast error
  // loading any pre-existing string-only entry.
  evidenceUrls: { type: [mongoose.Schema.Types.Mixed], default: [] },
  notes: { type: String, default: '' },
  // true only for entries written by services/baselineScheduling.js's
  // confirmBaseline - an operator declaring "this was really last done on
  // X" with no evidence attached, as opposed to a normal completion logged
  // through the evidence-gated routes/complianceItems/completeItem.js flow.
  // Lets the audit archive show which is which.
  isBaseline: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('CompletionLog', completionLogSchema);
