// routes/public/getUploadInfo.js
//
// GET /api/public/upload/:token
// Deliberately has NO auth middleware - the whole point of this link is
// that the assigned person may not have a system account. Anyone with the
// exact token (a 48-character random string, effectively unguessable) can
// see basic context about what they're being asked to upload for.

const ComplianceItem = require('../../models/ComplianceItem');
const asyncHandler = require('../../utils/asyncHandler');

const getUploadInfo = asyncHandler(async (req, res) => {
  const item = await ComplianceItem.findOne({ uploadToken: req.params.token })
    .populate('requirementId', 'title sourceRegulation categoryName');

  if (!item) {
    console.warn(`[public/upload] unknown or expired token: ${req.params.token}`);
    return res.status(404).json({ error: 'This upload link is invalid or has expired. Ask the admin to re-assign this task to get a new link.' });
  }

  res.json({
    title: item.requirementId?.title,
    sourceRegulation: item.requirementId?.sourceRegulation,
    categoryName: item.requirementId?.categoryName,
    nextDueDate: item.nextDueDate,
    alreadySubmitted: (item.pendingEvidenceUrls || []).length > 0,
    existingFiles: item.pendingEvidenceUrls || [],
  });
});

module.exports = getUploadInfo;
