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

  // Baseline date-setting workflow (see services/baselineScheduling.js).
  // nextDueDate above starts out counted from "today" purely as a
  // placeholder (see confirmItems.js) - it is NOT a claim that the
  // requirement was actually done today. These fields hold an operator's
  // proposed correction - "this was really last done on X" - and the
  // due date that produces, staged here until the operator reviews and
  // confirms it. Nothing on the live schedule (nextDueDate/status/
  // anchorDate above) changes until confirmBaseline runs; confirming moves
  // these values up and clears the four fields back to null.
  baselineProposedLastCompletedDate: { type: Date, default: null },
  baselineProposedNextDueDate: { type: Date, default: null },
  baselineProposedActionWindowMonths: { type: Number, default: null },
  baselineProposedStatus: { type: String, default: null },
  baselineProposedAt: { type: Date, default: null }, // when the proposal was made, not confirmed
  baselineConfirmedAt: { type: Date, default: null }, // when a baseline was last confirmed, if ever

  // Tracks which monthly reminder checkpoint (see utils/dateMath.js's
  // computeReminderCheckpoints) was last emailed, so the daily job in
  // schedulingEngine.js doesn't resend the same month's reminder every day
  // it runs. Reset to null in recordCompletion so the next cycle starts
  // fresh.
  lastReminderCheckpointSentAt: { type: Date, default: null },

  // Full override of the reminder schedule for the CURRENT cycle only -
  // null/empty means "use the computed monthly checkpoints" (see
  // utils/dateMath.js's resolveReminderCheckpoints, which every place that
  // reads an item's reminder schedule goes through). Reset to null in
  // recordCompletion so each new cycle starts back at the computed default.
  customReminderDates: { type: [Date], default: null },

  // awaiting_baseline = the DEFAULT for every new item with a known
  //                  frequency. nextDueDate/actionWindowMonths are left
  //                  null on purpose - no placeholder due date is ever
  //                  shown, since a date counted from "whenever the
  //                  calendar happened to be generated" is fake and
  //                  confusing to a first-time user. Stays in this state
  //                  until services/baselineScheduling.js's confirmBaseline
  //                  runs (operator supplies the real last-completed date),
  //                  which is what first populates nextDueDate for real.
  // awaiting_input = frequency itself isn't even known yet (operator_defined
  //                  requirement with no value supplied). Set the interval
  //                  first (routes/complianceItems/setFrequency.js) - that
  //                  moves it to awaiting_baseline, not straight to a date.
  // pending        = legacy/manual states only now; nextDueDate IS present.
  //                  Deliberately distinct from 'compliant' - due-date math
  //                  can be shown once known, but the green "compliant"
  //                  state has to be earned by an actual completion.
  // compliant      = Passive Window - completed at least once, not due soon
  // due            = Action Window - within actionWindowMonths of nextDueDate
  // started        = operator manually marked work in progress (holds until 'done')
  // done           = just completed; scheduler immediately recomputes the NEXT
  //                  cycle's dates and resets status back to 'compliant'
  // past_due       = nextDueDate has passed with no action
  status: {
    type: String,
    enum: ['pending', 'awaiting_input', 'awaiting_baseline', 'compliant', 'due', 'started', 'done', 'past_due'],
    default: 'awaiting_baseline',
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
