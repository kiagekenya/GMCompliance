// services/notificationService.js
//
// This is the piece that was missing: the daily status job was updating
// STATUS labels but never actually telling anyone. This module sends the
// real reminder/escalation emails, triggered from schedulingEngine's daily
// recalculation whenever an item's status crosses INTO 'due' or 'past_due'
// (not every single day it stays there - just on the transition, so people
// aren't spammed daily for the same overdue item).
//
// Escalation logic: 'due' -> email whoever is currently assigned (if
// anyone). 'past_due' -> email the assigned person AND the highest
// escalationLevel contact on file (the "head of hierarchy" - matches the
// escalation ladder concept from the original spec).

const Contact = require('../models/Contact');
const { sendEmail } = require('./emailService');

async function notifyStatusTransition(item, requirement, newStatus) {
  if (newStatus === 'due') {
    await notifyAssignee(item, requirement, 'due');
  } else if (newStatus === 'past_due') {
    await notifyAssignee(item, requirement, 'past_due');
    await notifyTopOfHierarchy(item, requirement);
  }
}

async function notifyAssignee(item, requirement, urgency) {
  const email = item.assignedContactId?.email || item.assignedVendorId?.email;
  const name = item.assignedContactId?.fullName || item.assignedVendorId?.personnelName;
  if (!email) {
    console.log(`[notifications] item ${item._id} entered ${urgency} but has no assignee to notify`);
    return;
  }

  const subject = urgency === 'past_due'
    ? `OVERDUE: ${requirement.title}`
    : `Reminder: ${requirement.title} is coming due`;

  const dueText = item.nextDueDate ? new Date(item.nextDueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'unknown';

  const result = await sendEmail({
    to: email,
    subject,
    text: `Hi ${name || ''},

${urgency === 'past_due' ? 'This requirement is now PAST DUE:' : 'This requirement is coming up:'}

  ${requirement.title}
  ${requirement.sourceRegulation}
  Due: ${dueText}

Please complete this and submit your evidence as soon as possible.

- Galaxy Compliance Assistant
`,
  });
  console.log(`[notifications] ${urgency} reminder to ${email} for item ${item._id}: ${result.sent ? 'sent' : 'not sent (' + result.reason + ')'}`);
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

module.exports = { notifyStatusTransition };
