// models/RegulatoryRequirement.js
//
// The master rulebook. One document per compliance requirement (42 total,
// seeded from seed/regulatory_catalog_seed.json). This collection is GLOBAL
// and shared across every operator - never write operator-specific data here.
//
// frequencyResolution tells the applicability engine how to get the real
// frequency for this requirement:
//   "fixed"              -> use frequencyValue/frequencyUnit directly
//   "variant_by_profile" -> pick ONE entry from frequencyVariants that matches
//                           the operator's profile field named in resolvedByProfileField
//   "variant_expand_all" -> spawn ONE compliance item per entry in frequencyVariants
//   "operator_defined"   -> no fixed answer exists; the operator must type in
//                           their own number before this item can go live

const mongoose = require('mongoose');

const frequencyVariantSchema = new mongoose.Schema({
  resolvedByProfileField: { type: String, default: null }, // e.g. "classLocation", "welderRequalPath". null for expand_all rows
  variantKey: { type: String, required: true },             // e.g. "class_3", "affected_public"
  variantLabel: { type: String, required: true },            // human-readable, shown in the UI
  pipelineTypeOverride: { type: String, default: null },      // "Distribution" | "Transmission" | "Both" | null
  frequencyValue: { type: Number, required: true },
  frequencyUnit: { type: String, required: true, default: 'months' },
}, { _id: true });

const regulatoryRequirementSchema = new mongoose.Schema({
  category: { type: Number, required: true },        // 1-6
  categoryName: { type: String, required: true },
  sourceRegulation: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },

  frequencyValue: { type: Number, default: null },
  frequencyUnit: { type: String, default: 'months' },
  anchorType: { type: String, required: true },        // rolling | calendar_fixed_date | operator_defined | trigger_event | variable_by_class

  removable: { type: Boolean, required: true, default: true },
  pipelineType: { type: String, required: true },       // Distribution | Transmission | Both
  pipeMaterial: { type: String, required: true },       // Steel | Plastic | Both
  smartFilterExpression: { type: String, required: true },

  frequencyResolution: {
    type: String,
    required: true,
    enum: ['fixed', 'variant_by_profile', 'variant_expand_all', 'operator_defined'],
    default: 'fixed',
  },
  suggestedDefaultFrequencyValue: { type: Number, default: null },
  suggestedDefaultFrequencyUnit: { type: String, default: null },

  frequencyVariants: [frequencyVariantSchema],

  referenceUrl: { type: String, default: null },
  version: { type: Number, default: 1 },
  effectiveDate: { type: Date, default: Date.now },
  supersededBy: { type: mongoose.Schema.Types.ObjectId, ref: 'RegulatoryRequirement', default: null },
}, { timestamps: true });

module.exports = mongoose.model('RegulatoryRequirement', regulatoryRequirementSchema);
