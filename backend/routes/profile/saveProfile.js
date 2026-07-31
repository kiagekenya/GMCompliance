// routes/profile/saveProfile.js
//
// POST /api/profile
// Creates or updates the operator's pipeline profile. This is Step 1 of
// setup - every field here corresponds to a question in
// pipeline_profile_form_spec.json. Upsert so re-submitting the form (e.g.
// operator edits their answers later) just updates the same document.

const PipelineProfile = require('../../models/PipelineProfile');
const asyncHandler = require('../../utils/asyncHandler');

const ALLOWED_FIELDS = [
  'segmentName', 'assetType', 'pipeMaterial', 'classLocation',
  'hasRegulatingStations', 'vaultVolumeGreater200cf', 'hasControlRoom',
  'isOdorized', 'transportsCorrosiveGas', 'hasHighConsequenceAreas',
  'servesPublicSchools', 'hasBusinessDistricts', 'hasNonBusinessAssets',
  'isCathodicallyProtected', 'hasCpRectifiers', 'hasInterferenceBonds',
  'isBareUnprotectedSteel', 'hasExposedOnshoreSteel', 'isOffshore',
  'hasWeldedPiping', 'welderRequalPath',
];

const saveProfile = asyncHandler(async (req, res) => {
  if (!req.body.assetType || !req.body.pipeMaterial) {
    return res.status(422).json({ error: 'assetType and pipeMaterial are required' });
  }

  if (req.body.hasWeldedPiping && !req.body.welderRequalPath) {
    return res.status(422).json({ error: 'welderRequalPath is required when hasWeldedPiping is true' });
  }

  const update = {};
  for (const field of ALLOWED_FIELDS) {
    if (req.body[field] !== undefined) update[field] = req.body[field];
  }

  const profile = await PipelineProfile.findOneAndUpdate(
    { operatorId: req.operatorId },
    { $set: update },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  res.json(profile);
});

module.exports = saveProfile;
