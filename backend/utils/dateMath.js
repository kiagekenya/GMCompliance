// utils/dateMath.js
//
// All the "count forward" math from the chore-list explanation lives here.
// Frequencies are sometimes fractional (2.5 months, 4.5 months, 7.5 months)
// so we can't just use Date.setMonth() for everything - that only handles
// whole months. We convert to days using the average month length instead.

const AVG_DAYS_PER_MONTH = 30.44;

function addFrequencyToDate(anchorDate, frequencyValue, frequencyUnit) {
  const days = frequencyUnit === 'years'
    ? frequencyValue * 365.25
    : frequencyValue * AVG_DAYS_PER_MONTH;

  const result = new Date(anchorDate);
  result.setDate(result.getDate() + Math.round(days));
  return result;
}

// Fixed 3-month action window, regardless of the item's cycle length - a
// 12-month item, a 15-month item, and a 36-month item all start their
// "due" window (and their escalating reminders) exactly 3 months before
// the due date, no more and no less. This intentionally does NOT scale
// with frequency (an earlier version divided frequency by 4, which meant a
// 15-month item got a 3.75-month window and 4 reminders instead of 3 -
// that's the bug this fixed value corrects).
function computeActionWindowMonths() {
  return 3;
}

// Only call this for items NOT manually set to 'started' or 'done' - those
// two are operator-controlled states that the automatic scheduler must
// never silently overwrite (see services/schedulingEngine.js).
//
// everCompleted matters a lot here: a due date can ALWAYS trigger 'due' or
// 'past_due' automatically - that's the entire point of the app, warning
// about upcoming/missed deadlines regardless of history. But 'compliant'
// (the green, reassuring state) may ONLY appear for an item that has
// actually been completed at least once - never as a default for
// "nothing's happened yet and the math says there's time." An item that's
// never been done and isn't due soon shows 'pending' instead - distinct
// from 'compliant' on purpose.
function computeStatus(nextDueDate, actionWindowMonths, everCompleted = false) {
  if (!nextDueDate) return 'pending';

  const now = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilDue = Math.ceil((new Date(nextDueDate) - now) / msPerDay);
  const actionWindowDays = (actionWindowMonths || 0) * AVG_DAYS_PER_MONTH;

  if (daysUntilDue < 0) return 'past_due';
  if (daysUntilDue <= actionWindowDays) return 'due';   // inside the Action Window - notifications active
  return everCompleted ? 'compliant' : 'pending';        // Passive Window - but only "compliant" if it's real
}

// Escalating reminder checkpoints: one per calendar month inside the action
// window, ending on the 1st of the due month itself. E.g. a 12-month item
// (3-month action window) due in December gets checkpoints at Oct 1, Nov 1,
// Dec 1. actionWindowMonths can be fractional (e.g. 2.5) - rounded to the
// nearest whole number of monthly checkpoints, minimum 1, since "reminder
// every calendar month" only makes sense as a whole-month count.
function computeReminderCheckpoints(nextDueDate, actionWindowMonths) {
  if (!nextDueDate) return [];
  const numCheckpoints = Math.max(1, Math.round(actionWindowMonths || 0));
  const due = new Date(nextDueDate);
  const checkpoints = [];
  for (let i = numCheckpoints - 1; i >= 0; i -= 1) {
    checkpoints.push(new Date(due.getFullYear(), due.getMonth() - i, 1));
  }
  return checkpoints;
}

// Every place that needs an item's ACTUAL reminder schedule (not just the
// computed default) should go through this, not computeReminderCheckpoints
// directly - customReminderDates (see models/ComplianceItem.js) is a full
// override for the current cycle, set via the "EDIT REMINDERS" UI. Falls
// back to the computed monthly checkpoints when there's no override.
function resolveReminderCheckpoints(customReminderDates, nextDueDate, actionWindowMonths) {
  if (Array.isArray(customReminderDates) && customReminderDates.length > 0) {
    return [...customReminderDates].map((d) => new Date(d)).sort((a, b) => a - b);
  }
  return computeReminderCheckpoints(nextDueDate, actionWindowMonths);
}

module.exports = {
  addFrequencyToDate, computeActionWindowMonths, computeStatus,
  computeReminderCheckpoints, resolveReminderCheckpoints,
};
