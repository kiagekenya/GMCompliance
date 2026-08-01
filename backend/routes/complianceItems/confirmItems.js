// routes/complianceItems/confirmItems.js
//
// POST /api/compliance-items/confirm
// The operator has reviewed the suggested list and sends back their final
// choices (with any non-core removals applied). Body shape:
//
// {
//   "items": [
//     { "requirementId": "...", "anchorDate": "2026-03-01" },
//     { "requirementId": "...", "frequencyVariantId": "...", "anchorDate": "2026-01-15" },
//     { "requirementId": "...", "anchorDate": "2026-01-01",
//       "operatorDefinedFrequencyValue": 24, "operatorDefinedFrequencyUnit": "months",
//       "operatorDefinedJustification": "Per Section 4.2 of our OQ plan" }
//   ]
// }
//
// This is the concrete "the app enforces you set one" mechanism: any
// operator_defined requirement missing operatorDefinedFrequencyValue gets
// rejected with a 422 naming exactly which item is missing it.

const RegulatoryRequirement = require('../../models/RegulatoryRequirement');
const ComplianceItem = require('../../models/ComplianceItem');
const { computeInitialSchedule } = require('../../services/schedulingEngine');
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
  const docsToInsert = [];

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

    if (!item.anchorDate) {
      validationErrors.push({ requirementId: item.requirementId, title: requirement.title, error: 'anchorDate is required' });
      continue;
    }

    const frequencyValue = item.operatorDefinedFrequencyValue
      || findVariantFrequency(requirement, item.frequencyVariantId)
      || requirement.frequencyValue;
    const frequencyUnit = item.operatorDefinedFrequencyUnit
      || findVariantUnit(requirement, item.frequencyVariantId)
      || requirement.frequencyUnit
      || 'months';

    const anchorDate = new Date(item.anchorDate);
    const { nextDueDate, actionWindowMonths, status } = computeInitialSchedule(anchorDate, frequencyValue, frequencyUnit);

    docsToInsert.push({
      operatorId: req.operatorId,
      requirementId: requirement._id,
      frequencyVariantId: item.frequencyVariantId || null,
      variantLabel: findVariantLabel(requirement, item.frequencyVariantId),
      resolvedFrequencyValue: frequencyValue,
      resolvedFrequencyUnit: frequencyUnit,
      requiresOperatorInput: false,
      operatorDefinedJustification: item.operatorDefinedJustification || null,
      anchorDate,
      nextDueDate,
      actionWindowMonths,
      status,
    });
  }

  if (validationErrors.length > 0) {
    console.warn(`[compliance-items/confirm] operator ${req.operatorId}: rejected, ${validationErrors.length} validation error(s)`, validationErrors);
    return res.status(422).json({ error: 'Some items could not be confirmed', details: validationErrors });
  }

  const created = await ComplianceItem.insertMany(docsToInsert);
  console.log(`[compliance-items/confirm] operator ${req.operatorId}: confirmed ${created.length} compliance items`);
  res.status(201).json({ createdCount: created.length, items: created });
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
