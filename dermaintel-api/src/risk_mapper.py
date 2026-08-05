"""
DERMAINTEL API - Risk Mapper
===============================

This module converts machine learning outputs into human-readable
information: it maps a continuous MLP risk score into a risk tier, and
maps a (disease, tier) combination into a short list of recommendations.

This module contains NO machine learning. It does not import
TensorFlow or NumPy, and performs no inference of any kind -- it is
pure Python, operating only on the outputs already produced by
``src.cnn_engine`` and ``src.mlp_engine``.

Risk tier thresholds are imported from ``config.py`` and are never
hardcoded here.
"""

import logging
from typing import Dict, List, Tuple

from config import TIER_LOW_MAX, TIER_MEDIUM_MAX

logger = logging.getLogger(__name__)

# Risk tier label constants, used both as return values and as lookup
# keys in the recommendation table below.
_TIER_LOW = "Low"
_TIER_MEDIUM = "Medium"
_TIER_HIGH = "High"

# Fallback recommendation used for any (disease, tier) combination not
# present in the lookup table below. Returned instead of raising an
# exception, per project requirements.
_FALLBACK_RECOMMENDATIONS: List[str] = [
    "Consult a dermatologist for personalised advice.",
]


# =====================================================================
# FUNCTION 1: score_to_tier
# =====================================================================

def score_to_tier(score: float) -> str:
    """
    Convert a continuous MLP risk score into a human-readable risk
    tier, using the thresholds defined in config.py.

    Logic:
        score <= TIER_LOW_MAX     -> "Low"
        score <= TIER_MEDIUM_MAX  -> "Medium"
        otherwise                 -> "High"

    Args:
        score: The raw continuous risk score, as returned by
            ``src.mlp_engine.predict_risk``.

    Returns:
        str: One of ``"Low"``, ``"Medium"``, or ``"High"``.
    """
    if score <= TIER_LOW_MAX:
        return _TIER_LOW

    if score <= TIER_MEDIUM_MAX:
        return _TIER_MEDIUM

    return _TIER_HIGH


# =====================================================================
# FUNCTION 2: get_recommendations
# =====================================================================

# Deterministic lookup table covering all 12 (disease, tier)
# combinations. Each entry contains 2-3 concise, medically reasonable
# recommendations, each no more than two short sentences.
_RECOMMENDATIONS: Dict[Tuple[str, str], List[str]] = {
    # --- Acne -----------------------------------------------------------
    ("Acne", _TIER_LOW): [
        "Continue a gentle daily cleansing routine.",
        "Use non-comedogenic skincare and makeup products.",
        "Monitor your skin for any new or worsening breakouts.",
    ],
    ("Acne", _TIER_MEDIUM): [
        "Consider an over-the-counter benzoyl peroxide or salicylic acid treatment.",
        "Avoid picking or squeezing lesions to reduce scarring risk.",
        "See a dermatologist if breakouts persist beyond a few weeks.",
    ],
    ("Acne", _TIER_HIGH): [
        "Consult a dermatologist.",
        "Avoid picking or squeezing lesions.",
        "Follow prescribed topical or oral treatment consistently.",
    ],
    # --- Alopecia ---------------------------------------------------------
    ("Alopecia", _TIER_LOW): [
        "Maintain a balanced diet to support healthy hair growth.",
        "Avoid excessive heat styling or tight hairstyles.",
        "Monitor hair density periodically for changes.",
    ],
    ("Alopecia", _TIER_MEDIUM): [
        "Consult a dermatologist to evaluate the cause of hair thinning.",
        "Reduce mechanical and chemical stress on the hair and scalp.",
        "Consider a gentle, dermatologist-approved scalp treatment.",
    ],
    ("Alopecia", _TIER_HIGH): [
        "Consult a dermatologist promptly for a full evaluation.",
        "Ask about clinically proven treatments such as minoxidil.",
        "Address any underlying stress, nutritional, or hormonal factors.",
    ],
    # --- Eczema -------------------------------------------------------
    ("Eczema", _TIER_LOW): [
        "Moisturize regularly with a fragrance-free emollient.",
        "Avoid known irritants and harsh soaps.",
        "Monitor your skin for flare-ups.",
    ],
    ("Eczema", _TIER_MEDIUM): [
        "Use a fragrance-free moisturizer multiple times daily.",
        "Identify and avoid personal triggers such as certain fabrics or soaps.",
        "Consider an over-the-counter hydrocortisone cream for flare-ups.",
    ],
    ("Eczema", _TIER_HIGH): [
        "Consult a dermatologist for a tailored treatment plan.",
        "Avoid scratching to prevent skin damage and infection.",
        "Use prescribed topical treatments as directed.",
    ],
    # --- Healthy --------------------------------------------------------
    ("Healthy", _TIER_LOW): [
        "Maintain your current skincare routine.",
        "Protect your skin from excessive sun exposure.",
        "Stay hydrated and monitor for any changes.",
    ],
    ("Healthy", _TIER_MEDIUM): [
        "Keep up a consistent skincare and sun-protection routine.",
        "Stay attentive to any new or changing skin symptoms.",
        "Consider a routine check-up if you have ongoing concerns.",
    ],
    ("Healthy", _TIER_HIGH): [
        "Keep up a consistent skincare and sun-protection routine.",
        "Pay close attention to any new or changing skin symptoms.",
        "Consider a dermatology check-up given elevated environmental risk factors.",
    ],
}


def get_recommendations(disease: str, tier: str) -> List[str]:
    """
    Return a short, deterministic list of recommendations for a given
    predicted disease and risk tier.

    Args:
        disease: The predicted skin condition label (e.g. one of
            ``config.CLASS_NAMES``: ``"Acne"``, ``"Alopecia"``,
            ``"Eczema"``, ``"Healthy"``).
        tier: The risk tier label, as returned by ``score_to_tier``
            (``"Low"``, ``"Medium"``, or ``"High"``).

    Returns:
        List[str]: A list of 2-3 concise recommendation strings for
        the given (disease, tier) combination. If the combination is
        not recognized, a single generic fallback recommendation is
        returned instead of raising an exception.
    """
    recommendations = _RECOMMENDATIONS.get((disease, tier))

    if recommendations is None:
        logger.warning(
            "No recommendations found for disease=%r, tier=%r; "
            "returning fallback recommendation.",
            disease,
            tier,
        )
        return list(_FALLBACK_RECOMMENDATIONS)

    return list(recommendations)