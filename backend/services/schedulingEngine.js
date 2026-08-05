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
const { addFrequencyToDate, computeActionWindowMonths, computeStatus } = require('../utils/dateMath');
const { notifyStatusTransition } = require('./notificationService');

function computeInitialSchedule(anchorDate, frequencyValue, frequencyUnit, everCompleted = false) {
  const nextDueDate = addFrequencyToDate(anchorDate, frequencyValue, frequencyUnit);
  const actionWindowMonths = computeActionWindowMonths(frequencyValue, frequencyUnit);
  const status = computeStatus(nextDueDate, actionWindowMonths, everCompleted);
  return { nextDueDate, actionWindowMonths, status };
}

// Emails only fire on a TRANSITION into 'due' or 'past_due' (checked by
// comparing against the status already stored before this run) - not every
// single day an item remains in that state, so people aren't spammed daily
// for the same outstanding item.
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
  for (const item of items) {
    const everCompleted = Boolean(item.lastCompletedDate);
    const previousStatus = item.status;
    const newStatus = computeStatus(item.nextDueDate, item.actionWindowMonths, everCompleted);

    if (newStatus !== previousStatus) {
      item.status = newStatus;
      await item.save();
      updated += 1;

      const isNewlyDue = newStatus === 'due' && previousStatus !== 'due';
      const isNewlyPastDue = newStatus === 'past_due' && previousStatus !== 'past_due';
      if ((isNewlyDue || isNewlyPastDue) && item.requirementId) {
        await notifyStatusTransition(item, item.requirementId, newStatus);
        notified += 1;
      }
    }
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
