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

  // Tracks which monthly reminder checkpoint (see utils/dateMath.js's
  // computeReminderCheckpoints) was last emailed, so the daily job in
  // schedulingEngine.js doesn't resend the same month's reminder every day
  // it runs. Reset to null in recordCompletion so the next cycle starts
  // fresh.
  lastReminderCheckpointSentAt: { type: Date, default: null },

  // pending        = never yet completed. nextDueDate IS computed and shown
  //                  from creation - only anchorDate/lastCompletedDate stay
  //                  null until a real completion happens. This is the
  //                  DEFAULT for every new item, and deliberately distinct
  //                  from 'compliant' - due-date math is informational from
  //                  day one, but the green "compliant" state has to be
  //                  earned by an actual completion, never assumed.
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
  assignedAt: { type: Date, default: null }, // when the CURRENT owner was assigned - NOT a completion date

  // "Pending" fields: filled in by whoever did the work (via the EDIT panel),
  // but NOT yet finalized. Nothing here changes status or writes to the
  // audit archive. MARK COMPLIANT (a separate, gated action - see
  // completeItem.js) is what a second person clicks once these look right;
  // that's what actually finalizes things and clears these back to null.
  pendingCompletedDate: { type: Date, default: null },
  // Mixed, not a strict subdocument schema: some already-existing items may
  // have plain filename-string entries from before real file storage
  // existed. New entries are objects: { originalName, storedName, mimeType,
  // size, uploadedBy: 'assignee'|'admin', uploadedAt }. App code on both
  // ends checks typeof entry === 'string' for the legacy case. See
  // utils/evidenceStorage.js.
  pendingEvidenceUrls: { type: [mongoose.Schema.Types.Mixed], default: [] },
  pendingNotes: { type: String, default: '' },

  // Lets an assigned person (who may have no system account at all) submit
  // evidence through a plain link, no login required. Regenerated every
  // time the assignment changes, so an old link can't be reused for a new
  // assignee. See routes/public/ for the unauthenticated endpoints this backs.
  uploadToken: { type: String, default: null, unique: true, sparse: true },

  // Set true (and pendingReviewedAt reset to null) only by the public
  // submit route (routes/public/submitUpload.js) - the admin's own direct
  // attach (routes/complianceItems/uploadEvidence.js) never touches these,
  // since an admin attaching their own evidence doesn't need a "review"
  // notification. pendingReviewedAt is stamped the moment the admin opens
  // this item's detail page (see RequirementDetail.jsx) - that's what
  // clears the "needs review" badge/notification.
  pendingSubmittedByAssignee: { type: Boolean, default: false },
  pendingReviewedAt: { type: Date, default: null },

  lastCompletedDate: { type: Date, default: null },
  // Mixed, not a strict subdocument schema - see the comment on
  // pendingEvidenceUrls above for why (legacy string entries must not
  // throw a cast error).
  completedEvidenceUrls: { type: [mongoose.Schema.Types.Mixed], default: [] },
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
