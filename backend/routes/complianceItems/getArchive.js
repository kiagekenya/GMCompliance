// routes/complianceItems/getArchive.js
//
// GET /api/compliance-items/archive
// The Audit Archive: every completion event ever logged for this operator,
// permanently, labeled with which regulation it was for and who completed
// it - exactly what an inspector would want to see. Never deletes anything;
// CompletionLog rows are write-once from completeItem.js.

const CompletionLog = require('../../models/CompletionLog');
const asyncHandler = require('../../utils/asyncHandler');

const getArchive = asyncHandler(async (req, res) => {
  const logs = await CompletionLog.find({ operatorId: req.operatorId })
    .populate({
      path: 'complianceItemId',
      select: 'requirementId',
      populate: { path: 'requirementId', select: 'title sourceRegulation categoryName' },
    })
    .populate('completedByContactId', 'fullName title')
    .sort({ completedDate: -1 });

  const entries = logs.map((log) => ({
    id: log._id,
    completedDate: log.completedDate,
    loggedAt: log.createdAt,
    regulationTitle: log.complianceItemId?.requirementId?.title || 'Unknown requirement',
    sourceRegulation: log.complianceItemId?.requirementId?.sourceRegulation || '',
    categoryName: log.complianceItemId?.requirementId?.categoryName || '',
    completedBy: log.completedByContactId?.fullName || log.completedByName || 'Unspecified',
    evidenceUrls: log.evidenceUrls || [],
    notes: log.notes,
  }));

  console.log(`[compliance-items/archive] operator ${req.operatorId}: ${entries.length} archive entries`);
  res.json({ entries });
});

module.exports = getArchive;
