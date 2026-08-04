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

function computeInitialSchedule(anchorDate, frequencyValue, frequencyUnit, everCompleted = false) {
  const nextDueDate = addFrequencyToDate(anchorDate, frequencyValue, frequencyUnit);
  const actionWindowMonths = computeActionWindowMonths(frequencyValue, frequencyUnit);
  const status = computeStatus(nextDueDate, actionWindowMonths, everCompleted);
  return { nextDueDate, actionWindowMonths, status };
}

async function recalculateAllStatuses() {
  const items = await ComplianceItem.find({
    status: { $nin: ['started', 'done'] },
    nextDueDate: { $ne: null },
  });

  let updated = 0;
  for (const item of items) {
    const everCompleted = Boolean(item.lastCompletedDate);
    const newStatus = computeStatus(item.nextDueDate, item.actionWindowMonths, everCompleted);
    if (newStatus !== item.status) {
      item.status = newStatus;
      await item.save();
      updated += 1;
    }
  }
  return { checked: items.length, updated };
}

async function recordCompletion(complianceItem, { completedDate, completedByContactId, completedByName, evidenceUrl, notes }) {
  await CompletionLog.create({
    complianceItemId: complianceItem._id,
    operatorId: complianceItem.operatorId,
    completedDate,
    completedByContactId: completedByContactId || null,
    completedByName: completedByName || '',
    evidenceUrl: evidenceUrl || null,
    notes: notes || '',
  });

  const frequencyValue = complianceItem.customFrequencyValue || complianceItem.resolvedFrequencyValue;
  const frequencyUnit = complianceItem.resolvedFrequencyUnit || 'months';

  complianceItem.lastCompletedDate = completedDate;
  complianceItem.anchorDate = completedDate;
  complianceItem.completedEvidenceUrl = evidenceUrl || null;

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
