// services/schedulingEngine.js
//
// Three jobs:
//  1) computeInitialSchedule - computes nextDueDate/actionWindow/status from
//     any anchor date + frequency. Used both when an item is first created
//     (anchor = today, everCompleted = false, so status can only ever land
//     on 'pending'/'due'/'past_due' - never a false 'compliant') AND after a
//     real completion (anchor = the real completion date, everCompleted =
//     true, so a far-off next date correctly shows 'compliant').
//  2) recalculateAllStatuses - runs daily, re-checking every item's status
//     against today's date. Never touches items currently 'started' or
//     'done' - those are operator-controlled.
//  3) recordCompletion - what happens when an item is marked done for real:
//     log it permanently, then roll the anchor forward for the NEXT cycle.

const ComplianceItem = require('../models/ComplianceItem');
const CompletionLog = require('../models/CompletionLog');
const { addFrequencyToDate, computeActionWindowMonths, computeStatus, resolveReminderCheckpoints } = require('../utils/dateMath');
const { notifyStatusTransition, notifyReminderCheckpoint } = require('./notificationService');

function computeInitialSchedule(anchorDate, frequencyValue, frequencyUnit, everCompleted = false) {
  const nextDueDate = addFrequencyToDate(anchorDate, frequencyValue, frequencyUnit);
  const actionWindowMonths = computeActionWindowMonths(frequencyValue, frequencyUnit);
  const status = computeStatus(nextDueDate, actionWindowMonths, everCompleted);
  return { nextDueDate, actionWindowMonths, status };
}

// Past-due escalation only fires on the TRANSITION into 'past_due' - a
// single-shot email, not repeated daily. The pre-due 'due' window instead
// gets an escalating reminder once per calendar-month checkpoint inside the
// action window (see utils/dateMath.js's computeReminderCheckpoints) -
// deduped against lastReminderCheckpointSentAt so the same month's
// reminder never goes out twice, regardless of how often this runs.
async function recalculateAllStatuses(operatorId = null) {
  const filter = {
    status: { $nin: ['started', 'done'] },
    nextDueDate: { $ne: null },
  };
  if (operatorId) filter.operatorId = operatorId;

  const items = await ComplianceItem.find(filter)
    .populate('requirementId', 'title sourceRegulation')
    .populate('assignedContactId', 'fullName email')
    .populate('assignedVendorId', 'companyName personnelName email');

  let updated = 0;
  let notified = 0;
  const now = new Date();

  for (const item of items) {
    const everCompleted = Boolean(item.lastCompletedDate);
    const previousStatus = item.status;
    const newStatus = computeStatus(item.nextDueDate, item.actionWindowMonths, everCompleted);
    let changed = false;

    if (newStatus !== previousStatus) {
      item.status = newStatus;
      changed = true;
      updated += 1;

      const isNewlyPastDue = newStatus === 'past_due' && previousStatus !== 'past_due';
      if (isNewlyPastDue && item.requirementId) {
        await notifyStatusTransition(item, item.requirementId, newStatus);
        notified += 1;
      }
    }

    if (newStatus === 'due' && item.requirementId) {
      const checkpoints = resolveReminderCheckpoints(item.customReminderDates, item.nextDueDate, item.actionWindowMonths);
      const dueCheckpoints = checkpoints.filter((c) => c <= now);
      const latestCheckpoint = dueCheckpoints[dueCheckpoints.length - 1];
      const alreadySent = item.lastReminderCheckpointSentAt
        && latestCheckpoint
        && item.lastReminderCheckpointSentAt.getTime() === latestCheckpoint.getTime();

      if (latestCheckpoint && !alreadySent) {
        await notifyReminderCheckpoint(item, item.requirementId, checkpoints, latestCheckpoint);
        item.lastReminderCheckpointSentAt = latestCheckpoint;
        changed = true;
        notified += 1;
      }
    }

    if (changed) await item.save();
  }
  return { checked: items.length, updated, notified };
}

async function recordCompletion(complianceItem, { completedDate, completedByContactId, completedByName, evidenceUrls, notes }) {
  await CompletionLog.create({
    complianceItemId: complianceItem._id,
    operatorId: complianceItem.operatorId,
    completedDate,
    completedByContactId: completedByContactId || null,
    completedByName: completedByName || '',
    evidenceUrls: evidenceUrls || [],
    notes: notes || '',
  });

  const frequencyValue = complianceItem.customFrequencyValue || complianceItem.resolvedFrequencyValue;
  const frequencyUnit = complianceItem.resolvedFrequencyUnit || 'months';

  complianceItem.lastCompletedDate = completedDate;
  complianceItem.anchorDate = completedDate;
  complianceItem.completedEvidenceUrls = evidenceUrls || [];
  // Fresh start for the next cycle's reminder checkpoints.
  complianceItem.lastReminderCheckpointSentAt = null;
  complianceItem.customReminderDates = null;

  // everCompleted = true here, always - this function only ever runs for a
  // real completion, so a far-off next date correctly shows 'compliant'.
  const { nextDueDate, actionWindowMonths, status } = computeInitialSchedule(completedDate, frequencyValue, frequencyUnit, true);
  complianceItem.nextDueDate = nextDueDate;
  complianceItem.actionWindowMonths = actionWindowMonths;
  complianceItem.status = status;

  await complianceItem.save();
  return complianceItem;
}

module.exports = { computeInitialSchedule, recalculateAllStatuses, recordCompletion };
