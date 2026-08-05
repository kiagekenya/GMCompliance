// routes/complianceItems/confirmItems.js
//
// POST /api/compliance-items/confirm
// The operator has reviewed the suggested list and confirms which items go
// onto their calendar. Body shape:
//
// {
//   "items": [
//     { "requirementId": "..." },
//     { "requirementId": "...", "frequencyVariantId": "..." },
//     { "requirementId": "...",
//       "operatorDefinedFrequencyValue": 24, "operatorDefinedFrequencyUnit": "months",
//       "operatorDefinedJustification": "Per Section 4.2 of our OQ plan" }
//   ]
// }
//
// IMPORTANT: items are created with a real nextDueDate, computed immediately
// from today - so the operator can see at a glance when each requirement is
// next due, right from the moment the calendar is generated. What does NOT
// happen automatically: anchorDate stays null (no "last completed" date
// exists until a person sets one), and status can only ever land on
// 'pending', 'due', or 'past_due' at creation time - NEVER 'compliant'.
// 'compliant' is reserved exclusively for an item that has actually been
// completed at least once (see dateMath.computeStatus's everCompleted flag).
// This is the balance: due-date math is useful information from day one,
// but the reassuring green "compliant" state has to be earned by a real
// completion, never assumed.
//
// This is also idempotent: upserts on (operatorId, requirementId,
// frequencyVariantId) instead of blind insertMany, so calling this twice
// (e.g. a returning user's browser re-running setup) updates the existing
// items rather than creating duplicates. See the unique index on
// ComplianceItem for the DB-level guarantee behind this.

const { computeInitialSchedule } = require('../../services/schedulingEngine');

const RegulatoryRequirement = require('../../models/RegulatoryRequirement');
const ComplianceItem = require('../../models/ComplianceItem');
const asyncHandler = require('../../utils/asyncHandler');

const confirmItems = asyncHandler(async (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    console.warn(`[compliance-items/confirm] operator ${req.operatorId}: request body had no items - frontend likely received 0 suggested requirements. Check GET /requirements/suggested logs for this operator.`);
    return res.status(422).json({ error: 'items array is required' });
  }

  const requirementIds = items.map((i) => i.requirementId);
  const requirements = await RegulatoryRequirement.find({ _id: { $in: requirementIds } });
  const requirementsById = new Map(requirements.map((r) => [String(r._id), r]));

  const validationErrors = [];
  const upserts = [];

  for (const item of items) {
    const requirement = requirementsById.get(String(item.requirementId));
    if (!requirement) {
      validationErrors.push({ requirementId: item.requirementId, error: 'Unknown requirement' });
      continue;
    }

    // Operator-defined requirements with no value supplied go live flagged
    // as 'awaiting_input' instead of blocking the whole confirm request -
    // the operator sets their own interval later, from that requirement's
    // own page (see routes/complianceItems/setFrequency.js). An explicit
    // operatorDefinedFrequencyValue in the request is still honored if
    // ever supplied, for backward compatibility.
    const isUnresolvedOperatorDefined = requirement.frequencyResolution === 'operator_defined'
      && !item.operatorDefinedFrequencyValue;

    let nextDueDate = null;
    let actionWindowMonths = null;
    let status = 'awaiting_input';
    let frequencyValue = null;
    let frequencyUnit = null;

    if (!isUnresolvedOperatorDefined) {
      frequencyValue = item.operatorDefinedFrequencyValue
        || findVariantFrequency(requirement, item.frequencyVariantId)
        || requirement.frequencyValue;
      frequencyUnit = item.operatorDefinedFrequencyUnit
        || findVariantUnit(requirement, item.frequencyVariantId)
        || requirement.frequencyUnit
        || 'months';

      // today is used ONLY as the reference point for "when's it next due" math -
      // it is deliberately NOT stored as anchorDate/lastCompletedDate, since
      // nothing has actually been completed yet.
      ({ nextDueDate, actionWindowMonths, status } = computeInitialSchedule(
        new Date(), frequencyValue, frequencyUnit, false
      ));
    }

    upserts.push({
      updateOne: {
        filter: {
          operatorId: req.operatorId,
          requirementId: requirement._id,
          frequencyVariantId: item.frequencyVariantId || null,
        },
        update: {
          $setOnInsert: {
            // only applied when this exact item doesn't already exist -
            // re-confirming never resets an item someone has already
            // completed or is tracking progress on
            operatorId: req.operatorId,
            requirementId: requirement._id,
            frequencyVariantId: item.frequencyVariantId || null,
            variantLabel: findVariantLabel(requirement, item.frequencyVariantId),
            resolvedFrequencyValue: frequencyValue,
            resolvedFrequencyUnit: frequencyUnit,
            requiresOperatorInput: isUnresolvedOperatorDefined,
            operatorDefinedJustification: item.operatorDefinedJustification || null,
            anchorDate: null,
            nextDueDate,
            actionWindowMonths,
            status,
          },
        },
        upsert: true,
      },
    });
  }

  if (validationErrors.length > 0) {
    console.warn(`[compliance-items/confirm] operator ${req.operatorId}: rejected, ${validationErrors.length} validation error(s)`, validationErrors);
    return res.status(422).json({ error: 'Some items could not be confirmed', details: validationErrors });
  }

  const result = await ComplianceItem.bulkWrite(upserts);
  console.log(`[compliance-items/confirm] operator ${req.operatorId}: ${result.upsertedCount} new items created, ${upserts.length - result.upsertedCount} already existed (no-op)`);

  const items_ = await ComplianceItem.find({ operatorId: req.operatorId, requirementId: { $in: requirementIds } });
  res.status(201).json({ createdCount: result.upsertedCount, items: items_ });
});

function findVariantFrequency(requirement, variantId) {
  if (!variantId) return null;
  const v = requirement.frequencyVariants.id(variantId);
  return v ? v.frequencyValue : null;
}
function findVariantUnit(requirement, variantId) {
  if (!variantId) return null;
  const v = requirement.frequencyVariants.id(variantId);
  return v ? v.frequencyUnit : null;
}
function findVariantLabel(requirement, variantId) {
  if (!variantId) return null;
  const v = requirement.frequencyVariants.id(variantId);
  return v ? v.variantLabel : null;
}

module.exports = confirmItems;
