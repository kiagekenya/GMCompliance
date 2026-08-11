// models/PipelineProfile.js
//
// One document per operator (or per pipeline segment, if an operator has
// more than one - segmentName distinguishes them). This is the answer sheet
// to every question in pipeline_profile_form_spec.json. The applicability
// engine reads this to decide which of the 42 requirements apply.

const mongoose = require('mongoose');

const pipelineProfileSchema = new mongoose.Schema({
  operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Operator', required: true },
  segmentName: { type: String, default: null },

  // 'Both' means this profile matches every Asset_Type/Pipe_Material smart
  // filter clause regardless of value - see utils/expressionEvaluator.js.
  assetType: { type: String, enum: ['Distribution', 'Transmission', 'Both'], required: true },
  pipeMaterial: { type: String, enum: ['Steel', 'Plastic', 'Both'], required: true },
  classLocation: { type: Number, enum: [1, 2, 3, 4], default: null },

  hasRegulatingStations: { type: Boolean, default: false },
  vaultVolumeGreater200cf: { type: Boolean, default: false },
  hasControlRoom: { type: Boolean, default: false },

  isOdorized: { type: Boolean, default: false },
  transportsCorrosiveGas: { type: Boolean, default: false },
  hasHighConsequenceAreas: { type: Boolean, default: false },

  servesPublicSchools: { type: Boolean, default: false },
  hasBusinessDistricts: { type: Boolean, default: false },
  hasNonBusinessAssets: { type: Boolean, default: false },

  isCathodicallyProtected: { type: Boolean, default: false },
  hasCpRectifiers: { type: Boolean, default: false },
  hasInterferenceBonds: { type: Boolean, default: false },
  isBareUnprotectedSteel: { type: Boolean, default: false },
  hasExposedOnshoreSteel: { type: Boolean, default: false },
  isOffshore: { type: Boolean, default: false },

  hasWeldedPiping: { type: Boolean, default: false },
  welderRequalPath: { type: String, enum: ['destructive_test_path', 'annual_path', null], default: null },
}, { timestamps: true });

module.exports = mongoose.model('PipelineProfile', pipelineProfileSchema);
