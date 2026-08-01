// models/ComplianceItem.js
//
// The operator's actual personal calendar. One document per chore they've
// confirmed. This is what the dashboard reads - never the master catalog
// directly, so one operator's customizations never touch shared data.

const mongoose = require('mongoose');

const complianceItemSchema = new mongoose.Schema({
  operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Operator', required: true },
  requirementId: { type: mongoose.Schema.Types.ObjectId, ref: 'RegulatoryRequirement', required: true },

  // which embedded frequencyVariant (by its _id) resolved this item, if any
  frequencyVariantId: { type: mongoose.Schema.Types.ObjectId, default: null },
  variantLabel: { type: String, default: null }, // denormalized copy for easy display, e.g. "Class 3 location"

  resolvedFrequencyValue: { type: Number, default: null },
  resolvedFrequencyUnit: { type: String, default: null },

  requiresOperatorInput: { type: Boolean, default: false },
  operatorDefinedJustification: { type: String, default: null },

  customFrequencyValue: { type: Number, default: null }, // optional admin override, must be <= resolvedFrequencyValue

  anchorDate: { type: Date, default: null },
  nextDueDate: { type: Date, default: null },
  actionWindowMonths: { type: Number, default: null },

  // pending        = created but never yet completed - no anchor/due date exists.
  //                  THIS IS THE DEFAULT for every new item. It is deliberately
  //                  not "compliant" - a freshly created item means nothing has
  //                  actually been done yet, only that it's been added to track.
  // awaiting_input = reserved for operator_defined items missing a frequency
  //                  (in practice this shouldn't occur - confirmItems.js
  //                  validates the value exists before an item is ever created)
  // compliant      = Passive Window - completed at least once, not due soon
  // due            = Action Window - within actionWindowMonths of nextDueDate
  // started        = operator manually marked work in progress (holds until 'done')
  // done           = just completed; scheduler immediately recomputes the NEXT
  //                  cycle's dates and resets status back to 'compliant'
  // past_due       = nextDueDate has passed with no action
  status: {
    type: String,
    enum: ['pending', 'awaiting_input', 'compliant', 'due', 'started', 'done', 'past_due'],
    default: 'pending',
  },

  isRemoved: { type: Boolean, default: false }, // operator removed a non-core suggestion

  assignedVendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null },
  assignedContactId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contact', default: null }, // internal employee, as an alternative to a vendor
  lastCompletedDate: { type: Date, default: null },
  completedEvidenceUrl: { type: String, default: null },
}, { timestamps: true });

complianceItemSchema.index({ operatorId: 1, nextDueDate: 1 });

// Guarantees, at the database level, that one operator can never end up
// with two compliance items for the same requirement+variant combination -
// backs up the upsert logic in confirmItems.js so this holds even if that
// route is ever called concurrently or from somewhere else later.
complianceItemSchema.index(
  { operatorId: 1, requirementId: 1, frequencyVariantId: 1 },
  { unique: true }
);

module.exports = mongoose.model('ComplianceItem', complianceItemSchema);
