/**
 * analysisData
 *
 * Shared, backend-agnostic helpers for rendering a DERMAINTEL
 * prediction: condition/tier color tokens and a couple of small,
 * transparently-labeled client-side presentation helpers (risk tier
 * normalization, a plain-language note about the environmental
 * inputs). Nothing in this file invents or stores prediction data —
 * every actual classification, confidence, risk score, tier, and
 * recommendation comes from the Express backend's response shape.
 */

export const SUPPORTED_CONDITIONS = ['Acne', 'Alopecia', 'Eczema', 'Healthy Skin'];

/**
 * Shared color "tone" per condition, used for badges/swatches across
 * Scan & Analyze, Results, History, and Pipeline. Falls back to
 * 'neutral' for any condition string the badge helpers don't
 * recognize, so an unexpected backend label never breaks styling.
 */
export const CONDITION_TONE = {
  Acne: 'moderate',
  Alopecia: 'info',
  Eczema: 'elevated',
  'Healthy Skin': 'low',
};

export function conditionTone(condition) {
  return CONDITION_TONE[condition] ?? 'neutral';
}

export const RISK_TIERS = {
  LOW: 'low',
  MODERATE: 'moderate',
  ELEVATED: 'elevated',
};

export const RISK_TIER_LABEL = {
  [RISK_TIERS.LOW]: 'Low',
  [RISK_TIERS.MODERATE]: 'Moderate',
  [RISK_TIERS.ELEVATED]: 'Elevated',
};

/**
 * classifyRiskTier
 *
 * A score-based fallback only — used to pick a valid badge tone/CSS
 * class when the backend's own risk.tier string doesn't match one of
 * the three known tiers. The backend's tier text itself is always
 * displayed as returned; this never overrides it.
 */
export function classifyRiskTier(score) {
  if (score < 34) return RISK_TIERS.LOW;
  if (score < 67) return RISK_TIERS.MODERATE;
  return RISK_TIERS.ELEVATED;
}

/**
 * normalizeTier
 *
 * Maps whatever tier string the backend returns to one of
 * 'low' | 'moderate' | 'elevated' for badge tone / chart color
 * purposes (case-insensitive). Falls back to a score-based guess so
 * styling never breaks, while the raw backend string is still shown
 * to the user as the actual label.
 */
export function normalizeTier(tier, score) {
  const lower = String(tier ?? '').toLowerCase();
  if (lower === RISK_TIERS.LOW || lower === RISK_TIERS.MODERATE || lower === RISK_TIERS.ELEVATED) {
    return lower;
  }
  return classifyRiskTier(Number(score) || 0);
}

/**
 * formatConfidence
 *
 * The backend's confidence value type (0-1 fraction vs. 0-100
 * percentage) isn't pinned down by the Express/Flask contract, so
 * this normalizes either into a percentage for display without
 * inventing a value.
 */
export function formatConfidence(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return num <= 1 ? num * 100 : num;
}

/**
 * formatTierLabel
 * Normalizes casing on whatever tier string the backend returns
 * ("low", "Low", "LOW" -> "Low") without changing its meaning.
 */
export function formatTierLabel(tier) {
  const str = String(tier ?? '').trim();
  if (!str) return 'Unknown';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * generateRiskExplanation
 *
 * A short, transparent sentence describing which environmental inputs
 * (as submitted by the user) line up with the backend's risk tier.
 * This is a plain-language restatement of the inputs already shown
 * elsewhere on the page — not a clinical assessment and not a value
 * computed by the MLP itself.
 */
export function generateRiskExplanation(environment, tier) {
  const notes = [];
  if (environment.humidity <= 35) notes.push('low ambient humidity');
  if (environment.humidity >= 80) notes.push('high ambient humidity');
  if (environment.uvIndex >= 6) notes.push('elevated UV exposure');
  if (environment.aqi >= 100) notes.push('reduced air quality');
  if (environment.stress >= 7) notes.push('a high reported stress level');

  if (notes.length === 0) {
    return 'Environmental conditions submitted with this scan are within a comfortable range.';
  }

  const tierPhrase =
    tier === RISK_TIERS.ELEVATED
      ? 'consistent with the elevated risk tier returned by the model'
      : tier === RISK_TIERS.MODERATE
      ? 'consistent with the moderate risk tier returned by the model'
      : 'noted, though the returned risk tier remains low';

  return `The submitted context includes ${notes.join(' and ')}, ${tierPhrase}.`;
}
