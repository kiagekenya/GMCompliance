// routes/vendorPortal/requestDueDate.js
//
// POST /api/vendor-portal/tasks/:id/request-due-date
// A vendor assigned to a task has no way to know when it's due until the
// operator sets a real baseline last-completed date (see
// backend/services/baselineScheduling.js) - nextDueDate stays null until
// then, on purpose (no fake placeholder). Rather than leave the vendor
// stuck looking at a blank due date, this sends one direct email asking
// the operator to go set it.

const ComplianceItem = require('../../models/ComplianceItem');
const Operator = require('../../models/Operator');
const RegulatoryRequirement = require('../../models/RegulatoryRequirement');
const { sendEmail } = require('../../services/emailService');
const asyncHandler = require('../../utils/asyncHandler');

const requestDueDate = asyncHandler(async (req, res) => {
  const item = await ComplianceItem.findOne({ _id: req.params.id, assignedVendorId: { $in: req.vendorIds } });
  if (!item) return res.status(404).json({ error: 'Task not found' });

  if (item.nextDueDate) {
    return res.status(422).json({ error: 'This task already has a due date set' });
  }

  const [operator, requirement] = await Promise.all([
    Operator.findById(item.operatorId),
    RegulatoryRequirement.findById(item.requirementId),
  ]);

  const vendorLabel = req.vendorUser.fullName || req.vendorUser.email;

  if (!operator?.email) {
    console.log(`[vendor-portal] ${vendorLabel} requested a due date on item ${item._id} but the operator has no email on file`);
    return res.status(422).json({ error: 'No email on file for this operator' });
  }

  const result = await sendEmail({
    to: operator.email,
    subject: `${vendorLabel} needs a due date set: ${requirement?.title || 'a regulation'}`,
    text: `Hi,

${vendorLabel} is assigned to the following regulation, but it has no due
date yet:

  ${requirement?.title || 'Requirement'}
  ${requirement?.sourceRegulation || ''}

Log in and open Settings > Baseline last-completed dates to set when this
was actually last done - that's what calculates the real due date and
reminder schedule ${vendorLabel} will work from.

- Galaxy Compliance Assistant
`,
  });
  console.log(`[vendor-portal] due-date request email to ${operator.email}: ${result.sent ? 'sent' : 'not sent (' + result.reason + ')'}`);

  res.json({ requested: true });
});

module.exports = requestDueDate;
