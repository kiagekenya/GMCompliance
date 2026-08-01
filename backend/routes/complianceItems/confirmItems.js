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
// IMPORTANT: items are created with NO anchor date and NO due date, and
// status 'pending' - NOT auto-marked compliant. A brand new install has
// completed nothing; assuming "the operator did all 42 chores today" (the
// old behavior, which defaulted anchorDate to today) is actively wrong and
// hides the exact thing this app exists to track. The real schedule for
// each item only begins once a person explicitly marks it complete for the
// first time (POST /compliance-items/:id/complete) - see schedulingEngine.js.
//
// This is also idempotent: upserts on (operatorId, requirementId,
// frequencyVariantId) instead of blind insertMany, so calling this twice
// (e.g. a returning user's browser re-running setup) updates the existing
// items rather than creating duplicates. See the unique index on
// ComplianceItem for the DB-level guarantee behind this.

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

    if (requirement.frequencyResolution === 'operator_defined' && !item.operatorDefinedFrequencyValue) {
      validationErrors.push({
        requirementId: item.requirementId,
        title: requirement.title,
        error: 'This requirement has no fixed regulatory interval - set your own interval before this item can go live.',
      });
      continue;
    }

    const frequencyValue = item.operatorDefinedFrequencyValue
      || findVariantFrequency(requirement, item.frequencyVariantId)
      || requirement.frequencyValue;
    const frequencyUnit = item.operatorDefinedFrequencyUnit
      || findVariantUnit(requirement, item.frequencyVariantId)
      || requirement.frequencyUnit
      || 'months';

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
            requiresOperatorInput: false,
            operatorDefinedJustification: item.operatorDefinedJustification || null,
            anchorDate: null,
            nextDueDate: null,
            actionWindowMonths: null,
            status: 'pending', // not started - only a real "mark complete" changes this
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
