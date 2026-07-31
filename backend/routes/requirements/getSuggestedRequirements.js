// routes/requirements/getSuggestedRequirements.js
//
// GET /api/requirements/suggested
// This is the real replacement for the frontend's MasterLedgerInit.jsx fake
// confirmation screen. Reads the operator's saved profile, runs it through
// the applicability engine, and returns the filtered + frequency-resolved
// list the operator reviews before confirming their calendar.

const PipelineProfile = require('../../models/PipelineProfile');
const { getSuggestedItems } = require('../../services/applicabilityEngine');
const asyncHandler = require('../../utils/asyncHandler');

const getSuggestedRequirements = asyncHandler(async (req, res) => {
  const profile = await PipelineProfile.findOne({ operatorId: req.operatorId });

  if (!profile) {
    return res.status(422).json({ error: 'Complete the pipeline profile (Step 1) before requesting suggested requirements' });
  }

  const suggestedItems = await getSuggestedItems(profile);
  res.json({ suggestedItems });
});

module.exports = getSuggestedRequirements;
