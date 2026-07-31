// routes/profile/getProfile.js
//
// GET /api/profile
// Returns the operator's saved pipeline profile, or 404 if they haven't
// completed Step 1 of setup yet (frontend should route them to the form).

const PipelineProfile = require('../../models/PipelineProfile');
const asyncHandler = require('../../utils/asyncHandler');

const getProfile = asyncHandler(async (req, res) => {
  const profile = await PipelineProfile.findOne({ operatorId: req.operatorId });

  if (!profile) {
    return res.status(404).json({ error: 'No pipeline profile set up yet' });
  }

  res.json(profile);
});

module.exports = getProfile;
