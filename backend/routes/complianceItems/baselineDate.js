// routes/complianceItems/baselineDate.js
//
// POST   /api/compliance-items/:id/baseline-date          - propose a baseline
// POST   /api/compliance-items/:id/baseline-date/confirm  - confirm the proposal
// DELETE /api/compliance-items/:id/baseline-date          - discard the proposal
//
// See services/baselineScheduling.js for the actual date math and the
// reasoning behind the propose -> confirm split. Kept in its own file/route
// module (rather than folded into completeItem.js or confirmItems.js) since
// it's a distinct workflow: backdating history, not recording new work.

const ComplianceItem = require('../../models/ComplianceItem');
const { proposeBaseline, confirmBaseline, clearBaseline } = require('../../services/baselineScheduling');
const asyncHandler = require('../../utils/asyncHandler');

async function findOwnedItem(req, res) {
  const item = await ComplianceItem.findOne({ _id: req.params.id, operatorId: req.operatorId });
  if (!item) {
    res.status(404).json({ error: 'Compliance item not found' });
    return null;
  }
  return item;
}

const proposeBaselineDate = asyncHandler(async (req, res) => {
  const item = await findOwnedItem(req, res);
  if (!item) return;

  const { lastCompletedDate } = req.body;
  if (!lastCompletedDate) {
    return res.status(422).json({ error: 'lastCompletedDate is required' });
  }

  try {
    proposeBaseline(item, new Date(lastCompletedDate));
  } catch (err) {
    console.warn(`[compliance-items] operator ${req.operatorId}: baseline proposal rejected on ${item._id} - ${err.message}`);
    return res.status(err.status || 422).json({ error: err.message });
  }

  await item.save();
  console.log(`[compliance-items] operator ${req.operatorId}: proposed baseline date ${lastCompletedDate} on item ${item._id} -> proposed next due ${item.baselineProposedNextDueDate}`);
  res.json(item);
});

const confirmBaselineDate = asyncHandler(async (req, res) => {
  const item = await findOwnedItem(req, res);
  if (!item) return;

  try {
    await confirmBaseline(item, { confirmedByName: req.body.confirmedByName || '' });
  } catch (err) {
    console.warn(`[compliance-items] operator ${req.operatorId}: baseline confirm rejected on ${item._id} - ${err.message}`);
    return res.status(err.status || 422).json({ error: err.message });
  }

  console.log(`[compliance-items] operator ${req.operatorId}: CONFIRMED baseline date on item ${item._id}, next due now ${item.nextDueDate}`);

  const populated = await ComplianceItem.findById(item._id)
    .populate('assignedContactId', 'fullName title')
    .populate('assignedVendorId', 'companyName personnelName');
  res.json(populated);
});

const clearBaselineDate = asyncHandler(async (req, res) => {
  const item = await findOwnedItem(req, res);
  if (!item) return;

  clearBaseline(item);
  await item.save();
  console.log(`[compliance-items] operator ${req.operatorId}: discarded baseline proposal on item ${item._id}`);
  res.json(item);
});

module.exports = { proposeBaselineDate, confirmBaselineDate, clearBaselineDate };
