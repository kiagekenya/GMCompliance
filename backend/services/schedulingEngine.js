// services/schedulingEngine.js
//
// Two jobs:
//  1) computeInitialSchedule - used once, when a compliance item is first
//     confirmed (has an anchor date and a resolved frequency).
//  2) recalculateAllStatuses - meant to run daily (see server.js cron note),
//     re-checking every item's status against today's date. Never touches
//     items currently 'started' or 'done' - those are operator-controlled.
//  3) recordCompletion - what happens when an item is marked done: log it
//     permanently, then roll the anchor forward and compute the NEXT cycle.

const ComplianceItem = require('../models/ComplianceItem');
const CompletionLog = require('../models/CompletionLog');
const { addFrequencyToDate, computeActionWindowMonths, computeStatus } = require('../utils/dateMath');

function computeInitialSchedule(anchorDate, frequencyValue, frequencyUnit) {
  const nextDueDate = addFrequencyToDate(anchorDate, frequencyValue, frequencyUnit);
  const actionWindowMonths = computeActionWindowMonths(frequencyValue, frequencyUnit);
  const status = computeStatus(nextDueDate, actionWindowMonths);
  return { nextDueDate, actionWindowMonths, status };
}

async function recalculateAllStatuses() {
  const items = await ComplianceItem.find({
    status: { $nin: ['started', 'done', 'awaiting_input'] },
    nextDueDate: { $ne: null },
  });

  let updated = 0;
  for (const item of items) {
    const newStatus = computeStatus(item.nextDueDate, item.actionWindowMonths);
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

  const { nextDueDate, actionWindowMonths, status } = computeInitialSchedule(completedDate, frequencyValue, frequencyUnit);
  complianceItem.nextDueDate = nextDueDate;
  complianceItem.actionWindowMonths = actionWindowMonths;
  complianceItem.status = status; // goes back to 'compliant' for the next cycle, unless somehow already overdue

  await complianceItem.save();
  return complianceItem;
}

module.exports = { computeInitialSchedule, recalculateAllStatuses, recordCompletion };
