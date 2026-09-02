// services/baselineScheduling.js
//
// The operator's own entry point for backdating a requirement's real-world
// history, instead of the calendar assuming "today" is when everything last
// happened. confirmItems.js's initial nextDueDate is counted from the day
// the calendar was generated purely as a placeholder - useful to show
// something immediately, but wrong the moment the requirement was actually
// last done on some other date (which is true for almost every item on
// day one). This file is how an operator corrects that, item by item, on
// their own schedule - not something forced during initial setup.
//
// Two-step, deliberately mirroring the draft -> confirm shape already used
// by routes/complianceItems/completeItem.js for real completions:
//   1) proposeBaseline - operator supplies the date they actually last did
//      this requirement. The system computes what that implies for the
//      next due date, but only stages it (baselineProposed* fields on
//      ComplianceItem) - the live schedule is untouched.
//   2) confirmBaseline - operator reviews the proposed next due date and
//      explicitly confirms it. Only then does it become the item's real
//      anchorDate/nextDueDate/status (visible everywhere the calendar
//      reads those fields - the dashboard, the ledger, the requirement
//      detail page - with zero changes needed to any of them), and only
//      then is a CompletionLog entry written, flagged isBaseline: true so
//      the audit archive can tell "operator-declared history" apart from
//      a real evidence-backed completion.

const CompletionLog = require('../models/CompletionLog');
const { computeInitialSchedule } = require('./schedulingEngine');

function proposeBaseline(item, lastCompletedDate) {
  const frequencyValue = item.customFrequencyValue || item.resolvedFrequencyValue;
  const frequencyUnit = item.resolvedFrequencyUnit || 'months';

  if (!frequencyValue) {
    const err = new Error('This requirement has no review interval set yet - set one before choosing a baseline date.');
    err.status = 422;
    throw err;
  }
  if (!(lastCompletedDate instanceof Date) || Number.isNaN(lastCompletedDate.getTime())) {
    const err = new Error('lastCompletedDate is not a valid date.');
    err.status = 422;
    throw err;
  }
  if (lastCompletedDate.getTime() > Date.now()) {
    const err = new Error('Last completed date cannot be in the future.');
    err.status = 422;
    throw err;
  }

  // everCompleted = true: a real completion is being declared, so the
  // resulting status is allowed to land on 'compliant', same as any other
  // real completion (see dateMath.computeStatus).
  const { nextDueDate, actionWindowMonths, status } = computeInitialSchedule(
    lastCompletedDate, frequencyValue, frequencyUnit, true
  );

  item.baselineProposedLastCompletedDate = lastCompletedDate;
  item.baselineProposedNextDueDate = nextDueDate;
  item.baselineProposedActionWindowMonths = actionWindowMonths;
  item.baselineProposedStatus = status;
  item.baselineProposedAt = new Date();
  return item;
}

function clearBaseline(item) {
  item.baselineProposedLastCompletedDate = null;
  item.baselineProposedNextDueDate = null;
  item.baselineProposedActionWindowMonths = null;
  item.baselineProposedStatus = null;
  item.baselineProposedAt = null;
  return item;
}

async function confirmBaseline(item, { confirmedByName } = {}) {
  if (!item.baselineProposedNextDueDate || !item.baselineProposedLastCompletedDate) {
    const err = new Error('No proposed baseline date to confirm - propose one first.');
    err.status = 422;
    throw err;
  }

  await CompletionLog.create({
    complianceItemId: item._id,
    operatorId: item.operatorId,
    completedDate: item.baselineProposedLastCompletedDate,
    completedByName: confirmedByName || '',
    evidenceUrls: [],
    notes: 'Baseline date - declared by the operator, not verified through the evidence workflow.',
    isBaseline: true,
  });

  item.lastCompletedDate = item.baselineProposedLastCompletedDate;
  item.anchorDate = item.baselineProposedLastCompletedDate;
  item.nextDueDate = item.baselineProposedNextDueDate;
  item.actionWindowMonths = item.baselineProposedActionWindowMonths;
  item.status = item.baselineProposedStatus;
  item.baselineConfirmedAt = new Date();

  clearBaseline(item);
  await item.save();
  return item;
}

module.exports = { proposeBaseline, clearBaseline, confirmBaseline };
