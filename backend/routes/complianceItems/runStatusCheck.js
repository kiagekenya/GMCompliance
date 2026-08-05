// routes/complianceItems/runStatusCheck.js
//
// POST /api/compliance-items/run-status-check
// Manually runs the same daily job that normally fires once every 24 hours
// (see server.js). Exists specifically so you can verify the notification
// system actually works without waiting up to a day for the real timer -
// click it, then check the backend console (or your inbox, if SMTP is
// configured) immediately.

const { recalculateAllStatuses } = require('../../services/schedulingEngine');
const asyncHandler = require('../../utils/asyncHandler');

const runStatusCheck = asyncHandler(async (req, res) => {
  console.log(`[compliance-items] operator ${req.operatorId}: manually triggered status check`);
  const result = await recalculateAllStatuses(req.operatorId);
  console.log(`[compliance-items] manual status check complete: ${result.checked} checked, ${result.updated} status changes, ${result.notified} notification(s) sent`);
  res.json(result);
});

module.exports = runStatusCheck;
