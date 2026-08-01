// routes/requirements/getSuggestedRequirements.js
//
// GET /api/requirements/suggested
// This is the real replacement for the frontend's MasterLedgerInit.jsx fake
// confirmation screen. Reads the operator's saved profile, runs it through
// the applicability engine, and returns the filtered + frequency-resolved
// list the operator reviews before confirming their calendar.

const PipelineProfile = require('../../models/PipelineProfile');
const RegulatoryRequirement = require('../../models/RegulatoryRequirement');
const { getSuggestedItems } = require('../../services/applicabilityEngine');
const asyncHandler = require('../../utils/asyncHandler');

const getSuggestedRequirements = asyncHandler(async (req, res) => {
  const profile = await PipelineProfile.findOne({ operatorId: req.operatorId });

  if (!profile) {
    console.warn(`[requirements] operator ${req.operatorId} has no PipelineProfile yet`);
    return res.status(422).json({ error: 'Complete the pipeline profile (Step 1) before requesting suggested requirements' });
  }

  // The single most common integration failure: someone forgot to run
  // `npm run seed`, or seeded a different MONGO_URI than the one the app
  // is actually connected to right now. Detect it explicitly instead of
  // silently returning an empty list that only surfaces as a confusing
  // 422 three steps later, at compliance-items/confirm.
  const catalogCount = await RegulatoryRequirement.countDocuments();
  if (catalogCount === 0) {
    console.error('[requirements] RegulatoryRequirement collection is EMPTY. Did you run `npm run seed`? Check MONGO_URI matches between the seed run and the running server.');
    return res.status(503).json({
      error: 'The regulatory catalog has not been loaded into the database yet. Run "npm run seed" in the backend, then try again.',
    });
  }

  const suggestedItems = await getSuggestedItems(profile);
  console.log(`[requirements] operator ${req.operatorId}: ${catalogCount} catalog rows checked, ${suggestedItems.length} matched profile`, {
    assetType: profile.assetType, pipeMaterial: profile.pipeMaterial,
  });

  if (suggestedItems.length === 0) {
    console.warn(`[requirements] operator ${req.operatorId}: 0 matches despite ${catalogCount} catalog rows - check smartFilterExpression parsing / profile field names`);
  }

  res.json({ suggestedItems });
});

module.exports = getSuggestedRequirements;
