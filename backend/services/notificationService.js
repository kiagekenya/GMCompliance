// services/notificationService.js
//
// Three kinds of emails live here:
//  1. Escalating monthly reminders while an item sits inside its action
//     window (notifyReminderCheckpoint) - triggered from schedulingEngine's
//     daily recalculation, once per calendar-month checkpoint (see
//     utils/dateMath.js's computeReminderCheckpoints), not every single day.
//  2. Past-due escalation (notifyStatusTransition) - a single-shot email to
//     the assignee AND the top of the escalation ladder the moment status
//     crosses into 'past_due'.
//  3. Completion confirmation (notifyCompletion) - sent once, right after
//     an item is marked compliant, telling the assignee the new due date
//     and the reminder dates for the next cycle.

const Contact = require('../models/Contact');
const { sendEmail } = require('./emailService');

async function notifyStatusTransition(item, requirement, newStatus) {
  if (newStatus === 'past_due') {
    await notifyAssignee(item, requirement);
    await notifyTopOfHierarchy(item, requirement);
  }
}

const formatLongDate = (d) => new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

// One calendar-month checkpoint inside the action window - see
// schedulingEngine.js's recalculateAllStatuses for how this is deduped
// against lastReminderCheckpointSentAt so it only fires once per checkpoint.
async function notifyReminderCheckpoint(item, requirement, checkpoints, currentCheckpoint) {
  const email = item.assignedContactId?.email || item.assignedVendorId?.email;
  const name = item.assignedContactId?.fullName || item.assignedVendorId?.personnelName;
  if (!email) {
    console.log(`[notifications] item ${item._id} hit a reminder checkpoint but has no assignee to notify`);
    return;
  }

  const checkpointIndex = checkpoints.findIndex((c) => c.getTime() === currentCheckpoint.getTime());
  const isFinal = checkpointIndex === checkpoints.length - 1;
  const dueText = item.nextDueDate ? formatLongDate(item.nextDueDate) : 'unknown';

  const result = await sendEmail({
    to: email,
    subject: isFinal ? `Due this month: ${requirement.title}` : `Reminder: ${requirement.title} is coming due`,
    text: `Hi ${name || ''},

This is reminder ${checkpointIndex + 1} of ${checkpoints.length} for:

  ${requirement.title}
  ${requirement.sourceRegulation}
  Due: ${dueText}

Please complete this and submit your evidence as soon as possible.

- Galaxy Compliance Assistant
`,
  });
  console.log(`[notifications] reminder ${checkpointIndex + 1}/${checkpoints.length} to ${email} for item ${item._id}: ${result.sent ? 'sent' : 'not sent (' + result.reason + ')'}`);
}

// Sent once, right after MARK COMPLIANT - confirms it and tells the
// assignee when they'll hear from the system again.
async function notifyCompletion(item, requirement, reminderCheckpoints) {
  const email = item.assignedContactId?.email || item.assignedVendorId?.email;
  const name = item.assignedContactId?.fullName || item.assignedVendorId?.personnelName;
  if (!email) {
    console.log(`[notifications] item ${item._id} was marked compliant but has no assignee to notify`);
    return;
  }

  const dueText = item.nextDueDate ? formatLongDate(item.nextDueDate) : 'not yet set';
  const reminderText = (reminderCheckpoints || []).map((d) => `  - ${formatLongDate(d)}`).join('\n') || '  (none scheduled)';

  const result = await sendEmail({
    to: email,
    subject: `Marked compliant: ${requirement.title}`,
    text: `Hi ${name || ''},

Thanks - the following has been reviewed and marked compliant:

  ${requirement.title}
  ${requirement.sourceRegulation}

Next due date: ${dueText}

You'll be reminded again starting on these dates:
${reminderText}

- Galaxy Compliance Assistant
`,
  });
  console.log(`[notifications] completion confirmation to ${email} for item ${item._id}: ${result.sent ? 'sent' : 'not sent (' + result.reason + ')'}`);
}

// Only ever called for the past_due transition now - the pre-due 'due'
// window uses notifyReminderCheckpoint instead (see above).
async function notifyAssignee(item, requirement) {
  const email = item.assignedContactId?.email || item.assignedVendorId?.email;
  const name = item.assignedContactId?.fullName || item.assignedVendorId?.personnelName;
  if (!email) {
    console.log(`[notifications] item ${item._id} is past due but has no assignee to notify`);
    return;
  }

  const dueText = item.nextDueDate ? formatLongDate(item.nextDueDate) : 'unknown';

  const result = await sendEmail({
    to: email,
    subject: `OVERDUE: ${requirement.title}`,
    text: `Hi ${name || ''},

This requirement is now PAST DUE:

  ${requirement.title}
  ${requirement.sourceRegulation}
  Due: ${dueText}

Please complete this and submit your evidence as soon as possible.

- Galaxy Compliance Assistant
`,
  });
  console.log(`[notifications] past_due reminder to ${email} for item ${item._id}: ${result.sent ? 'sent' : 'not sent (' + result.reason + ')'}`);
}

async function notifyTopOfHierarchy(item, requirement) {
  const topContact = await Contact.findOne({ operatorId: item.operatorId }).sort({ escalationLevel: -1 });
  if (!topContact) {
    console.log(`[notifications] item ${item._id} is past due but no escalation contacts exist to notify`);
    return;
  }

  const result = await sendEmail({
    to: topContact.email,
    subject: `ESCALATION: ${requirement.title} is overdue`,
    text: `Hi ${topContact.fullName},

A compliance requirement has passed its due date with no completion recorded:

  ${requirement.title}
  ${requirement.sourceRegulation}
  Assigned to: ${item.assignedContactId?.fullName || item.assignedVendorId?.companyName || 'nobody currently assigned'}

As the top of the escalation ladder for this account, you're being notified
because this is now overdue.

- Galaxy Compliance Assistant
`,
  });
  console.log(`[notifications] escalation to ${topContact.email} (level ${topContact.escalationLevel}) for item ${item._id}: ${result.sent ? 'sent' : 'not sent (' + result.reason + ')'}`);
}

module.exports = { notifyStatusTransition, notifyReminderCheckpoint, notifyCompletion };
