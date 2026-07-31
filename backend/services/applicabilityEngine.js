// services/applicabilityEngine.js
//
// This is "step 3" from the flow diagram: given one operator's PipelineProfile,
// go through every requirement in the master catalog, check whether it applies,
// and figure out what frequency it should run on. Returns a flat list of
// "suggested items" ready to show the operator for review (or to write
// straight into ComplianceItem documents once they confirm).

const RegulatoryRequirement = require('../models/RegulatoryRequirement');
const { evaluateExpression } = require('../utils/expressionEvaluator');

async function getSuggestedItems(profile) {
  const requirements = await RegulatoryRequirement.find({});
  const suggestions = [];

  for (const req of requirements) {
    if (!evaluateExpression(req.smartFilterExpression, profile)) {
      continue; // does not apply to this operator's pipeline at all
    }

    if (req.frequencyResolution === 'fixed') {
      suggestions.push(buildSuggestion(req, {
        frequencyValue: req.frequencyValue,
        frequencyUnit: req.frequencyUnit,
        requiresOperatorInput: false,
      }));
    }

    else if (req.frequencyResolution === 'operator_defined') {
      suggestions.push(buildSuggestion(req, {
        frequencyValue: null,
        frequencyUnit: null,
        requiresOperatorInput: true,
        suggestedDefaultFrequencyValue: req.suggestedDefaultFrequencyValue,
        suggestedDefaultFrequencyUnit: req.suggestedDefaultFrequencyUnit,
      }));
    }

    else if (req.frequencyResolution === 'variant_by_profile') {
      const variant = resolveSingleVariant(req, profile);
      if (variant) {
        suggestions.push(buildSuggestion(req, {
          frequencyVariantId: variant._id,
          variantLabel: variant.variantLabel,
          frequencyValue: variant.frequencyValue,
          frequencyUnit: variant.frequencyUnit,
          requiresOperatorInput: false,
        }));
      }
      // if no variant matches (e.g. profile.classLocation is null), skip silently -
      // the operator hasn't given us enough info yet; they can add it manually later.
    }

    else if (req.frequencyResolution === 'variant_expand_all') {
      for (const variant of req.frequencyVariants) {
        if (variant.pipelineTypeOverride && variant.pipelineTypeOverride !== 'Both'
            && variant.pipelineTypeOverride !== profile.assetType) {
          continue; // this audience-variant doesn't apply to this operator's asset type
        }
        suggestions.push(buildSuggestion(req, {
          frequencyVariantId: variant._id,
          variantLabel: variant.variantLabel,
          frequencyValue: variant.frequencyValue,
          frequencyUnit: variant.frequencyUnit,
          requiresOperatorInput: false,
        }));
      }
    }
  }

  return suggestions;
}

function resolveSingleVariant(req, profile) {
  const fieldName = req.frequencyVariants[0]?.resolvedByProfileField;

  if (fieldName === 'classLocation') {
    return resolveClassRangeVariant(req, profile);
  }

  const profileValue = profile[fieldName];
  return req.frequencyVariants.find((v) => v.variantKey === profileValue) || null;
}

// class_1_2 needs special handling since it matches TWO possible profile values
function resolveClassRangeVariant(req, profile) {
  if (profile.classLocation === 1 || profile.classLocation === 2) {
    return req.frequencyVariants.find(v => v.variantKey === 'class_1_2') || null;
  }
  if (profile.classLocation === 3) {
    return req.frequencyVariants.find(v => v.variantKey === 'class_3') || null;
  }
  if (profile.classLocation === 4) {
    return req.frequencyVariants.find(v => v.variantKey === 'class_4') || null;
  }
  return null; // profile.classLocation not set yet
}

function buildSuggestion(req, resolved) {
  return {
    requirementId: req._id,
    title: req.title,
    category: req.category,
    categoryName: req.categoryName,
    sourceRegulation: req.sourceRegulation,
    removable: req.removable,
    frequencyResolution: req.frequencyResolution,
    ...resolved,
  };
}

module.exports = { getSuggestedItems };
