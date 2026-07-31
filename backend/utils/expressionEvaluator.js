// utils/expressionEvaluator.js
//
// Reads a Smart Filter Code string exactly as written in the source PDF,
// e.g.  "Is_Cathodically_Protected == True AND Has_Non_Business_Assets == True"
// or simply "Core", and checks it against one operator's PipelineProfile document.
//
// Deliberately tiny: only supports AND-joined clauses of the form
// FIELD OP VALUE, where OP is one of == != >= <= > <
// This covers every expression in the actual catalog - no need for a full
// expression-language parser.

function evaluateExpression(expression, profile) {
  const trimmed = expression.trim();

  if (trimmed.toLowerCase() === 'core') {
    return true; // Core = always applies, non-removable, no conditions to check
  }

  const clauses = trimmed.split(/\s+AND\s+/i);
  return clauses.every((clause) => evaluateClause(clause.trim(), profile));
}

function evaluateClause(clause, profile) {
  const match = clause.match(/^([A-Za-z_]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
  if (!match) {
    console.warn(`Could not parse smart filter clause: "${clause}"`);
    return false;
  }

  const [, rawField, operator, rawValue] = match;
  const profileKey = snakeCaseFieldToProfileKey(rawField);
  const profileValue = profile[profileKey];
  const targetValue = parseLiteral(rawValue.trim());

  switch (operator) {
    case '==': return profileValue == targetValue; // eslint-disable-line eqeqeq
    case '!=': return profileValue != targetValue; // eslint-disable-line eqeqeq
    case '>=': return Number(profileValue) >= Number(targetValue);
    case '<=': return Number(profileValue) <= Number(targetValue);
    case '>':  return Number(profileValue) > Number(targetValue);
    case '<':  return Number(profileValue) < Number(targetValue);
    default:   return false;
  }
}

// "Is_Cathodically_Protected" -> "isCathodicallyProtected" (matches PipelineProfile field names)
function snakeCaseFieldToProfileKey(field) {
  const parts = field.split('_');
  return parts[0].toLowerCase() + parts.slice(1).map(p => p[0].toUpperCase() + p.slice(1).toLowerCase()).join('');
}

function parseLiteral(raw) {
  if (raw.startsWith('"') && raw.endsWith('"')) return raw.slice(1, -1);
  if (raw === 'True') return true;
  if (raw === 'False') return false;
  if (!isNaN(Number(raw))) return Number(raw);
  return raw;
}

module.exports = { evaluateExpression };
