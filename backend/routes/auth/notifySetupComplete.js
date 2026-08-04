// routes/auth/notifySetupComplete.js
//
// POST /api/auth/notify-setup-complete
// Called once, right after SystemInit finishes (profile + contacts + vendors
// all saved). Sends the operator a plain-language summary email: what kind
// of pipeline they registered, roughly how many requirements will be
// tracked, and - importantly - who gets notified and roughly when, so they
// have a written record of what they just set up without digging back
// through the UI.

const PipelineProfile = require('../../models/PipelineProfile');
const Contact = require('../../models/Contact');
const ComplianceItem = require('../../models/ComplianceItem');
const { sendEmail } = require('../../services/emailService');
const asyncHandler = require('../../utils/asyncHandler');

const notifySetupComplete = asyncHandler(async (req, res) => {
  const [profile, contacts, itemCount] = await Promise.all([
    PipelineProfile.findOne({ operatorId: req.operatorId }),
    Contact.find({ operatorId: req.operatorId }).sort({ escalationLevel: 1 }),
    ComplianceItem.countDocuments({ operatorId: req.operatorId, isRemoved: false }),
  ]);

  const escalationLines = contacts
    .map((c) => `  ${c.escalationLevel}. ${c.fullName} (${c.title || 'no title'}) - notified ${c.escalationLevel === 1 ? 'first' : c.escalationLevel === contacts.length ? 'last, on overdue items' : 'as things escalate'}`)
    .join('\n');

  const text = `Hi,

Your Galaxy Compliance Assistant calendar for ${req.operator.companyName} is now set up.

WHAT WAS CONFIGURED
  Pipeline type: ${profile?.assetType || 'not set'}
  Pipe material: ${profile?.pipeMaterial || 'not set'}
  Tracked requirements: ${itemCount}

WHEN YOU'LL BE NOTIFIED
Each requirement has its own timeline based on its regulatory frequency.
As a requirement's due date gets close (inside its "action window" - usually
about 1/4 of its total cycle), it starts showing as due, and reminders begin.
If it passes with nothing done, it's flagged past due.

WHO GETS NOTIFIED, IN ORDER
${escalationLines || '  No contacts on file yet - add some from the Escalation Ladder page.'}

You can review or change any of this any time from the dashboard.

- Galaxy Compliance Assistant
`;

  const result = await sendEmail({
    to: req.operator.email,
    subject: `Your compliance calendar for ${req.operator.companyName} is ready`,
    text,
  });

  console.log(`[auth] setup-complete email for operator ${req.operatorId}: ${result.sent ? 'sent' : 'not sent (' + result.reason + ')'}`);
  res.json({ emailed: result.sent, reason: result.reason });
});

module.exports = notifySetupComplete;
