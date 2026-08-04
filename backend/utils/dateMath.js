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

// Default action window = 1/4 of the frequency period, per the requirements doc
// ("for a 12 month-cadence requirement... at month-9" = 3 months = 12/4).
function computeActionWindowMonths(frequencyValue, frequencyUnit) {
  const valueInMonths = frequencyUnit === 'years' ? frequencyValue * 12 : frequencyValue;
  return Math.round((valueInMonths / 4) * 100) / 100;
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

module.exports = { addFrequencyToDate, computeActionWindowMonths, computeStatus };
