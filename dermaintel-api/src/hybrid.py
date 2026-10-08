"""
DERMAINTEL API - Hybrid CNN/AI Classification Layer
=======================================================

This module is a comparison layer between:
    1. The existing local CNN prediction (src/cnn_engine.py) - UNCHANGED,
       never reimplemented or duplicated here.
    2. An independent image classification from a configured external AI
       provider.

This module does NOT run CNN inference itself. It receives the ORIGINAL
uploaded image bytes and the already-computed CNN prediction dict, sends
the same original image to the configured AI provider for an independent
classification, and applies a documented decision rule to select a final
condition.

The AI provider and model are fully configurable via environment
variables - nothing about the provider or model is hard-coded in this
file. See "Configuration" below.

This module is intentionally NOT wired into app.py yet. It is a
standalone, reusable function a future version of app.py could call as:

    hybrid_result = hybrid.predict(image_bytes, cnn_prediction)

DECISION RULE (documented, deliberate, not a bug):
    - If the CNN's predicted_label matches the AI provider's returned
      condition, the final condition is that shared condition.
    - If they disagree, the final condition is the AI provider's
      condition. The external AI classification is the tie-breaker in
      this hybrid layer, by explicit design.

GEMINI AVAILABILITY (confirmation layer, never a hard dependency):
    The external AI provider is a CONFIRMATION layer only, never a
    required one. If calling it or parsing its response fails for any
    reason -- missing/invalid API key or model config, network error,
    timeout, rate limiting, quota exhaustion, a malformed or empty
    response, or any other provider-side failure -- predict() silently
    falls back to the CNN's own prediction untouched (final_condition =
    cnn_label, confidence = the CNN's own reported confidence) and
    completes normally. The failure is logged server-side for
    debugging, but predict()'s return shape is IDENTICAL either way:
    callers (and the API response) never learn whether the AI provider
    was consulted, agreed, disagreed, or failed. See predict()'s
    docstring for the exact mechanism.

This module intentionally does NOT:
    - Load or run the CNN model (see src/cnn_engine.py).
    - Load or run the MLP model (see src/mlp_engine.py).
    - Compute risk tiers or recommendations (see src/risk_mapper.py).
    - Implement Grad-CAM.
    - Handle environmental/lifestyle variables or stress.
    - Touch MongoDB.
    - Define any Flask route.
    - Read files from disk or depend on a Flask request object.

CONFIGURATION:
    AI_API_KEY - required. API key for the configured external AI
        provider. Never hard-coded, never logged, never included in any
        exception message.
    AI_MODEL - required. The model identifier to use with the configured
        AI provider. Never hard-coded.

CONFIDENCE DISCLAIMER:
    The external AI provider is not asked for, and does not return, a
    clinical probability. The "confidence" value returned by predict() is
    an APPLICATION-LEVEL DECISION CONFIDENCE describing agreement between
    the two independent classifiers, optionally informed by the CNN's own
    softmax confidence. It is NOT a medical/clinical probability of any
    kind. See _compute_confidence() for the exact, documented formula.

PERFORMANCE NOTES:
    - The GenAI client is created lazily on first use and cached at
      module level for the lifetime of the process, so subsequent calls
      to predict() reuse the same client (and its underlying HTTP
      connection) instead of paying for client construction / a fresh
      handshake on every request. See _get_client().
    - The classification prompt is deliberately minimal. The structured
      `response_format` (an enum-constrained object) already mechanically
      prevents free-text explanations, multiple diagnoses, or markdown
      wrapping, so the prompt only needs to state the decision-relevant
      instructions (four classes, pick exactly one, guess if uncertain)
      rather than separately guarding against outputs the schema already
      makes impossible. This reduces input tokens the model has to
      process per request.
"""

import base64
import json
import logging
import math
import os
import re
import threading
import time
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

ALLOWED_CLASSES = ("Acne", "Alopecia", "Eczema", "Healthy")

# Environment variable names for the external AI provider. Never
# hard-coded - both the key and the model are supplied at runtime.
_AI_API_KEY_ENV_VAR = "AI_API_KEY"
_AI_MODEL_ENV_VAR = "AI_MODEL"

# Accepted MIME types for the original uploaded image, matching the
# existing app.py's own allowed image content types.
_ALLOWED_MIME_TYPES = ("image/jpeg", "image/jpg", "image/png")
_DEFAULT_MIME_TYPE = "image/jpeg"

# Deliberately minimal. The structured response_format below already
# mechanically enforces exactly-one-of-four-classes JSON output, so this
# prompt only carries the decision-relevant instructions - not repeated
# guardrails against outputs the schema already makes impossible.
_AI_PROMPT = """Classify this skin image as exactly one of: Acne, Alopecia, Eczema, Healthy.
If uncertain, still choose the single closest class."""


# ---------------------------------------------------------------------------
# Cached GenAI client (see PERFORMANCE NOTES above)
# ---------------------------------------------------------------------------

_cached_client = None
_client_init_lock = threading.Lock()


def _get_client(api_key: str):
    """
    Return a cached, reused GenAI client, creating it once on first call.

    Avoids paying for client construction (and a fresh connection
    handshake) on every predict() call. Thread-safe via a
    double-checked lock, since Flask may serve requests from multiple
    threads/workers.
    """
    global _cached_client

    if _cached_client is not None:
        return _cached_client

    with _client_init_lock:
        if _cached_client is None:
            try:
                from google import genai
            except ImportError as exc:
                raise RuntimeError(
                    "hybrid.predict() requires the AI provider SDK package, "
                    "which is not installed."
                ) from exc

            init_start = time.perf_counter()
            _cached_client = genai.Client(api_key=api_key)
            init_elapsed_ms = (time.perf_counter() - init_start) * 1000
            logger.info(
                "hybrid.predict(): GenAI client initialized (%.1f ms) - "
                "will be reused for subsequent requests.",
                init_elapsed_ms,
            )

    return _cached_client


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

def _validate_image_bytes(image_bytes: bytes) -> None:
    """Validate that non-empty image bytes were provided."""
    if not image_bytes:
        raise ValueError("hybrid.predict() received empty or missing image bytes.")


def _extract_cnn_label(cnn_prediction: Dict[str, Any]) -> str:
    """
    Extract and validate the CNN's predicted_label from the existing
    prediction structure produced by src.cnn_engine.predict().

    Does not run any CNN inference - purely reads an already-computed
    prediction dict.
    """
    if not isinstance(cnn_prediction, dict):
        raise ValueError(
            "hybrid.predict() expected 'cnn_prediction' to be a dict, got "
            f"{type(cnn_prediction).__name__}."
        )

    cnn_label = cnn_prediction.get("predicted_label")
    if cnn_label not in ALLOWED_CLASSES:
        raise ValueError(
            "hybrid.predict() received an invalid or missing CNN "
            f"'predicted_label': {cnn_label!r}. Expected one of {ALLOWED_CLASSES}."
        )

    return cnn_label


def _extract_cnn_confidence(cnn_prediction: Dict[str, Any]) -> float:
    """
    Extract and strictly validate the CNN's confidence value from the
    existing prediction structure produced by src.cnn_engine.predict().

    Requirements:
        - Must be present.
        - Must be convertible to float.
        - Must not be NaN or infinite.
        - Must fall within the inclusive range [0.0, 1.0].

    Invalid confidence is NEVER silently replaced with a default value -
    it always raises a clear ValueError instead.

    Raises:
        ValueError: If confidence is missing, non-numeric, NaN, infinite,
            negative, or greater than 1.0.
    """
    if "confidence" not in cnn_prediction or cnn_prediction.get("confidence") is None:
        raise ValueError(
            "hybrid.predict() received a CNN prediction with a missing "
            "'confidence' value."
        )

    raw_confidence = cnn_prediction["confidence"]

    try:
        confidence = float(raw_confidence)
    except (TypeError, ValueError) as exc:
        raise ValueError(
            "hybrid.predict() received a non-numeric CNN 'confidence' "
            f"value: {raw_confidence!r}."
        ) from exc

    if math.isnan(confidence) or math.isinf(confidence):
        raise ValueError(
            "hybrid.predict() received a NaN or infinite CNN 'confidence' "
            f"value: {raw_confidence!r}."
        )

    if confidence < 0.0 or confidence > 1.0:
        raise ValueError(
            "hybrid.predict() received a CNN 'confidence' value outside "
            f"the valid [0.0, 1.0] range: {confidence!r}."
        )

    return confidence


def _get_api_key() -> str:
    """
    Read the AI provider's API key from the environment. Never
    hard-coded, never logged, never included in any exception message.
    """
    api_key = os.environ.get(_AI_API_KEY_ENV_VAR)
    if not api_key:
        raise RuntimeError(
            f"{_AI_API_KEY_ENV_VAR} environment variable is not set. "
            "hybrid.predict() requires a valid AI provider API key to run."
        )
    return api_key


def _get_model_name() -> str:
    """
    Read the AI provider's model identifier from the environment. Never
    hard-coded.
    """
    model_name = os.environ.get(_AI_MODEL_ENV_VAR)
    if not model_name:
        raise RuntimeError(
            f"{_AI_MODEL_ENV_VAR} environment variable is not set. "
            "hybrid.predict() requires a configured AI model name to run."
        )
    return model_name


def _resolve_mime_type(mime_type: Optional[str]) -> str:
    """Validate and normalize the provided MIME type, defaulting if absent."""
    if mime_type is None:
        return _DEFAULT_MIME_TYPE
    normalized = mime_type.lower()
    if normalized not in _ALLOWED_MIME_TYPES:
        raise ValueError(
            "hybrid.predict() received an unsupported image MIME type: "
            f"{mime_type!r}. Expected one of {_ALLOWED_MIME_TYPES}."
        )
    return normalized


# ---------------------------------------------------------------------------
# AI provider response parsing
# ---------------------------------------------------------------------------

def _strip_code_fences(text: str) -> str:
    """
    Remove ```json ... ``` / ``` ... ``` wrappers the AI provider
    sometimes adds despite being instructed not to.
    """
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def _parse_ai_condition(raw_text: str) -> str:
    """
    Parse the AI provider's raw text response into a validated condition
    string.

    Raises:
        ValueError: If the response is not valid JSON, does not contain a
            "condition" key, or the condition is not one of the four
            allowed classes.
    """
    if not raw_text or not raw_text.strip():
        raise ValueError("hybrid.predict(): AI provider returned an empty response.")

    cleaned = _strip_code_fences(raw_text)

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"hybrid.predict(): AI provider response was not valid JSON: {exc}"
        ) from exc

    if not isinstance(parsed, dict) or "condition" not in parsed:
        raise ValueError(
            "hybrid.predict(): AI provider response JSON did not contain a "
            f"'condition' key. Got: {parsed!r}"
        )

    condition = parsed["condition"]
    if condition not in ALLOWED_CLASSES:
        raise ValueError(
            "hybrid.predict(): AI provider returned an invalid condition "
            f"{condition!r}. Expected one of {ALLOWED_CLASSES}."
        )

    return condition


# ---------------------------------------------------------------------------
# AI provider call
# ---------------------------------------------------------------------------

def _call_ai_provider(image_bytes: bytes, mime_type: str) -> str:
    """
    Send the original image to the configured AI provider and return its
    raw text response.

    Uses the current Interactions API pattern for the configured provider.
    Raises a clear exception on request failure or unexpected response
    structure - never fabricates a result.

    Reuses a cached, warm client (see _get_client()) instead of
    constructing a new one per call.
    """
    api_key = _get_api_key()
    model_name = _get_model_name()

    client = _get_client(api_key)

    encode_start = time.perf_counter()
    encoded_image = base64.b64encode(image_bytes).decode("utf-8")
    encode_elapsed_ms = (time.perf_counter() - encode_start) * 1000
    logger.info(
        "hybrid.predict(): image encoding took %.1f ms (%d bytes).",
        encode_elapsed_ms,
        len(image_bytes),
    )

    request_start = time.perf_counter()
    try:
        interaction = client.interactions.create(
            model=model_name,
            input=[
                {
                    "type": "text",
                    "text": _AI_PROMPT,
                },
                {
                    "type": "image",
                    "data": encoded_image,
                    "mime_type": mime_type,
                },
            ],
            response_format={
                "type": "object",
                "properties": {
                    "condition": {
                        "type": "string",
                        "enum": list(ALLOWED_CLASSES),
                    }
                },
                "required": ["condition"],
            },
        )
    except Exception:
        logger.exception(
            "AI provider request failed in hybrid.predict()."
        )
        raise RuntimeError(
            "hybrid.predict(): AI provider request failed. "
            "See server logs for details."
        ) from None
    finally:
        request_elapsed_ms = (time.perf_counter() - request_start) * 1000
        logger.info(
            "hybrid.predict(): external AI request took %.1f ms.",
            request_elapsed_ms,
        )

    parse_start = time.perf_counter()
    text = getattr(interaction, "output_text", None)
    parse_elapsed_ms = (time.perf_counter() - parse_start) * 1000
    logger.info(
        "hybrid.predict(): response extraction took %.1f ms.",
        parse_elapsed_ms,
    )

    if not text:
        raise RuntimeError(
            "hybrid.predict(): AI provider response did not contain "
            "any text output."
        )

    return text

# ---------------------------------------------------------------------------
# Confidence - application-level decision confidence, NOT a clinical
# probability. See module docstring.
# ---------------------------------------------------------------------------

def _compute_confidence(
    cnn_label: str, ai_label: str, cnn_confidence: float
) -> float:
    """
    Compute an application-level decision confidence for the hybrid result.

    This is NOT a medical/clinical probability. The AI provider does not
    supply a numerical probability, and none is requested or fabricated
    from it.

    Formula (documented, simple, by design):
        - If CNN and the AI provider AGREE: confidence = the CNN's own
          softmax confidence for that class. Two independent classifiers
          agreeing is treated as reinforcing the CNN's own reported
          confidence.
        - If CNN and the AI provider DISAGREE: confidence = a fixed,
          conservative value (0.5), reflecting that the final condition
          comes from the AI provider alone (per the decision rule) and
          the two classifiers did not corroborate each other. 0.5 is a
          deliberate, neutral placeholder representing genuine model
          disagreement - not a real probability estimate.

    Args:
        cnn_label: The CNN's predicted_label.
        ai_label: The AI provider's returned condition.
        cnn_confidence: The CNN's own softmax confidence for cnn_label,
            taken directly from src.cnn_engine's prediction output, after
            strict validation.

    Returns:
        float: An application-level confidence in [0.0, 1.0].
    """
    if cnn_label == ai_label:
        return float(cnn_confidence)

    _DISAGREEMENT_CONFIDENCE = 0.5
    return _DISAGREEMENT_CONFIDENCE


# ---------------------------------------------------------------------------
# PUBLIC FUNCTION
# ---------------------------------------------------------------------------

def predict(
    image_bytes: bytes,
    cnn_prediction: Dict[str, Any],
    mime_type: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Compare the existing local CNN prediction against an independent
    classification from a configured external AI provider, and return a
    final hybrid condition.

    This function does NOT run CNN inference - it expects the CNN's
    prediction to already be computed (e.g. via src.cnn_engine.predict())
    and passed in as `cnn_prediction`.

    Decision rule:
        - CNN condition == AI provider condition -> final condition =
          that condition.
        - CNN condition != AI provider condition -> final condition = the
          AI provider's condition (it is the tie-breaker in this hybrid
          layer, by deliberate design).

    GEMINI AVAILABILITY (confirmation layer, never required): if calling
    the AI provider or parsing its response fails for ANY reason --
    missing/invalid configuration, network error, timeout, rate limiting,
    quota exhaustion, a malformed/empty response, or any other
    provider-side failure -- this function silently falls back to the
    CNN's own prediction (final_condition = cnn_label, confidence =
    cnn_confidence, unmodified) and returns normally, exactly as if the
    AI provider had agreed with the CNN. The failure is logged
    server-side (see logger.warning below) for debugging, but is NEVER
    raised, returned, or otherwise exposed to the caller -- the return
    shape is identical whether the AI provider succeeded, failed, or was
    never reachable at all. This only applies to the AI-provider call and
    response parsing specifically; cnn_prediction itself (the CNN's own
    output) is still validated strictly and still raises ValueError if
    malformed, since that is a different, legitimate failure mode
    unrelated to the AI provider's availability.

    Args:
        image_bytes: The ORIGINAL uploaded image bytes (not the
            preprocessed 224x224 CNN tensor).
        cnn_prediction: The existing CNN prediction dict, as returned by
            src.cnn_engine.predict() (must contain at least
            "predicted_label" and a valid "confidence").
        mime_type: Optional MIME type of the original image
            ("image/jpeg", "image/jpg", or "image/png"). Defaults to
            "image/jpeg" if not provided.

    Returns:
        Dict[str, Any]: {
            "condition": str,    # one of ALLOWED_CLASSES
            "confidence": float, # application-level decision confidence,
                                  # NOT a clinical probability - see
                                  # _compute_confidence(). Falls back to
                                  # the CNN's own confidence, unmodified,
                                  # whenever the AI provider could not be
                                  # consulted.
        }

    Raises:
        ValueError: If image_bytes is empty or cnn_prediction is
            malformed (including an invalid confidence value) -- these
            are CNN-side/input problems, not AI-provider availability,
            and are never silently swallowed.
    """
    total_start = time.perf_counter()

    _validate_image_bytes(image_bytes)
    cnn_label = _extract_cnn_label(cnn_prediction)
    cnn_confidence = _extract_cnn_confidence(cnn_prediction)
    resolved_mime_type = _resolve_mime_type(mime_type)

    try:
        raw_ai_text = _call_ai_provider(image_bytes, resolved_mime_type)
        ai_label = _parse_ai_condition(raw_ai_text)
    except Exception as exc:  # noqa: BLE001 - deliberately broad, see
        # GEMINI AVAILABILITY above: the AI provider is a confirmation
        # layer only, never a required dependency. Any failure here
        # (missing config, network/timeout, rate limit, quota, malformed
        # response, or anything else) falls back to the CNN's own
        # result and the request completes normally -- it is logged for
        # debugging but never raised, returned, or otherwise exposed.
        logger.warning(
            "hybrid.predict(): AI provider unavailable, falling back to "
            "CNN-only prediction (cnn=%s). Reason: %s",
            cnn_label,
            exc,
        )
        ai_label = None

    if ai_label is None:
        final_condition = cnn_label
        confidence = cnn_confidence
    elif cnn_label == ai_label:
        final_condition = cnn_label
        confidence = _compute_confidence(cnn_label, ai_label, cnn_confidence)
    else:
        final_condition = ai_label
        confidence = _compute_confidence(cnn_label, ai_label, cnn_confidence)

    total_elapsed_ms = (time.perf_counter() - total_start) * 1000
    logger.info(
        "hybrid.predict(): total hybrid prediction time %.1f ms "
        "(cnn=%s, ai=%s, final=%s).",
        total_elapsed_ms,
        cnn_label,
        ai_label if ai_label is not None else "unavailable",
        final_condition,
    )

    return {
        "condition": final_condition,
        "confidence": confidence,
    }