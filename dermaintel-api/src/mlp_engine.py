"""
DERMAINTEL API - Multimodal MLP Risk Engine
==============================================

This module performs disease-specific risk prediction by combining:

    - The final condition (from src.hybrid, post-CNN/Gemini decision):
      one of "Acne", "Alopecia", "Eczema" -- one-hot encoded
    - 5 environmental variables

into a single continuous 0-100 risk score, using the already-trained MLP
model (``mlp_model.keras``) and its fitted feature scaler
(``feature_scaler.pkl``).

The 256-D CNN feature vector is intentionally NOT used here anymore. The
CNN/hybrid pipeline's job (what disease) and this module's job (how
risky, given disease + context) are fully separated -- the MLP only ever
sees the already-decided condition, never raw image features.

"Healthy" never reaches the model: predict_risk() returns a hardcoded
0.0 for it via a fast path, before any scaling/inference, preventing the
"Healthy Skin Paradox" (a Healthy classification receiving a nonzero,
potentially alarming, risk score).

This module performs INFERENCE ONLY. It contains no training logic,
no Flask routes, and no risk-tier mapping (see ``src.risk_mapper`` for
converting the raw score into a human-readable tier/recommendations).

All model paths are imported from ``config.py`` -- nothing is
hardcoded here.
"""

import logging
from pathlib import Path
from typing import List, Union

import joblib
import numpy as np
from tensorflow import keras
from tensorflow.keras import layers, regularizers

from config import FEATURE_SCALER_PATH, MLP_MODEL_PATH

logger = logging.getLogger(__name__)

# ----------------------------------------------------------------------
# Fixed dimensional / ordering constants describing the MLP's expected
# input shape and layout. NOT tunable configuration -- this is the
# structural contract with 03_train_multimodal_mlp.ipynb, so it lives
# here rather than in config.py.
# ----------------------------------------------------------------------

# Fixed env value order -- must never be changed, sorted, or inferred.
_ENV_FEATURE_ORDER = (
    "temperature",
    "humidity",
    "uv_index",
    "aqi_pm25",
    "stress_penalty",
)
_ENV_FEATURE_DIM = 5

# Fixed disease one-hot order -- must exactly match the notebook's
# DISEASE_COLS (alphabetical, matches config.CLASS_NAMES minus "Healthy").
# "Healthy" is deliberately NOT in this list: it never reaches the model
# at all (see the fast path in predict_risk()), so it has no column here.
_DISEASE_COLS = ("Acne", "Alopecia", "Eczema")
_DISEASE_DIM = len(_DISEASE_COLS)

# Total MLP input width: 5 env values + 3 disease one-hot columns, in
# that order (ENV_COLS + DISEASE_COLS), matching ALL_INPUT_COLS in the
# training notebook exactly.
_TOTAL_FEATURE_DIM = _ENV_FEATURE_DIM + _DISEASE_DIM  # 8

# Label for which risk prediction is always defined to be exactly 0.0,
# bypassing scaling/concatenation/inference entirely. This prevents the
# "Healthy Skin Paradox" (a Healthy classification receiving a
# nonzero, potentially alarming, risk score from the MLP).
_HEALTHY_LABEL = "Healthy"

# Risk Score contract: the MLP was trained on targets bounded to this
# range (each disease's 5 per-factor weights sum to 100, see
# generate_synthetic_metadata.py), so predict_risk() clamps its output
# to match.
_RISK_SCORE_MIN = 0.0
_RISK_SCORE_MAX = 100.0


# ----------------------------------------------------------------------
# Fixed architecture of the multimodal risk MLP, duplicated here ONLY as
# a fallback path for `_load_mlp_model()` (see below). This must always
# match 03_train_multimodal_mlp.ipynb's `build_model()` exactly:
#   Input(8) -> Dense(16, relu, L2) -> Dropout(0.3)
#             -> Dense(8, relu, L2)  -> Dropout(0.3)
#             -> Dense(1, linear)
# ----------------------------------------------------------------------
def _build_mlp_architecture(input_dim: int = _TOTAL_FEATURE_DIM) -> keras.Model:
    inputs = keras.Input(shape=(input_dim,), name="multimodal_input")
    x = layers.Dense(16, activation="relu", kernel_regularizer=regularizers.l2(1e-4),
                      name="dense_16")(inputs)
    x = layers.Dropout(0.3, name="dropout_1")(x)
    x = layers.Dense(8, activation="relu", kernel_regularizer=regularizers.l2(1e-4),
                      name="dense_8")(x)
    x = layers.Dropout(0.3, name="dropout_2")(x)
    outputs = layers.Dense(1, activation="linear", dtype="float32", name="risk_score_output")(x)
    return keras.Model(inputs, outputs, name="multimodal_risk_mlp")


# =====================================================================
# MODEL / SCALER LOADING (executed ONCE at module import time)
# =====================================================================

def _load_mlp_model() -> keras.Model:
    """
    Load the trained MLP model from the path defined in config.py.

    This is called exactly once, at module import time, so the model
    is never reloaded on a per-request basis.

    Raises:
        RuntimeError: If the MLP model file cannot be loaded (including
            via the weights-only fallback below).
    """
    try:
        return keras.models.load_model(str(MLP_MODEL_PATH))
    except Exception as primary_error:  # noqa: BLE001 - intentionally broad, see below
        logger.warning(
            "Full-model load of %s failed (likely a Keras version mismatch "
            "between training and serving environments); trying the "
            "weights-only fallback next. Original error: %s",
            MLP_MODEL_PATH, primary_error,
        )

    # Fallback: rebuild the architecture in code and load ONLY the weights.
    # Weights-only files don't carry the layer-config JSON that breaks
    # across Keras versions, so this works even when the full .keras
    # artifact does not load in this environment. Expects a sibling file
    # named <same stem>.weights.h5 next to MLP_MODEL_PATH.
    weights_path = Path(MLP_MODEL_PATH).with_suffix(".weights.h5")
    try:
        model = _build_mlp_architecture()
        model.load_weights(str(weights_path))
    except Exception:  # noqa: BLE001 - intentionally broad, see below
        logger.exception(
            "Failed to load MLP model from %s (full-model load failed; "
            "weights-only fallback at %s also failed).",
            MLP_MODEL_PATH, weights_path,
        )
        raise RuntimeError(
            "Failed to load the MLP risk model artifact "
            f"('{Path(MLP_MODEL_PATH).name}')."
        ) from None

    logger.info("Loaded MLP model via weights-only fallback from %s", weights_path)
    return model


def _load_feature_scaler() -> object:
    """
    Load the fitted feature scaler from the path defined in config.py.

    Raises:
        RuntimeError: If the scaler file cannot be loaded, or if its
            expected input dimensionality does not match the MLP's
            expected input size (5 environmental variables + 3 disease
            one-hot columns = 8).
    """
    try:
        scaler = joblib.load(FEATURE_SCALER_PATH)
    except Exception:  # noqa: BLE001 - intentionally broad, see below
        logger.exception(
            "Failed to load feature scaler from %s", FEATURE_SCALER_PATH
        )
        raise RuntimeError(
            "Failed to load the feature scaler artifact "
            f"('{Path(FEATURE_SCALER_PATH).name}')."
        ) from None

    # Defensive check: the loaded scaler MUST have been fitted on
    # exactly 8 features. If not, the wrong artifact has been loaded
    # and scaling would silently corrupt every prediction.
    n_features = getattr(scaler, "n_features_in_", None)
    if n_features != _TOTAL_FEATURE_DIM:
        raise RuntimeError(
            "Loaded feature scaler has an incorrect dimensionality: "
            f"expected n_features_in_ == {_TOTAL_FEATURE_DIM} "
            f"({_ENV_FEATURE_DIM} environmental variables + {_DISEASE_DIM} "
            f"disease one-hot columns), but got {n_features!r}. "
            "This indicates an incorrect or mismatched scaler artifact "
            "has been loaded (e.g. the old 261-D CNN-feature-era scaler)."
        )

    return scaler


# Module-level, load-once model and scaler. These are the ONLY places
# these artifacts are loaded -- no other function in this module
# re-loads them.
_mlp_model: keras.Model = _load_mlp_model()
_feature_scaler: object = _load_feature_scaler()


# =====================================================================
# INPUT VALIDATION HELPERS
# =====================================================================

def _validate_env_vector(env_vector: Union[np.ndarray, List[float]]) -> np.ndarray:
    """
    Validate the environmental variable vector before use.

    Requirements:
        - Exactly 5 values.
        - All values numeric (no ``None``).
        - No NaN/infinite values.

    Args:
        env_vector: The candidate environmental variable vector, as a
            NumPy array or a plain list, in the fixed order:
            ``(temperature, humidity, uv_index, aqi_pm25,
            stress_penalty)``.

    Returns:
        np.ndarray: The validated environmental vector as a 1D
        ``float64`` NumPy array of shape ``(5,)``.

    Raises:
        ValueError: If any requirement above is not satisfied.
    """
    if not isinstance(env_vector, (np.ndarray, list, tuple)):
        raise ValueError(
            "'env_vector' must be a NumPy array or a list, got "
            f"{type(env_vector).__name__}."
        )

    values = list(env_vector)

    if len(values) != _ENV_FEATURE_DIM:
        raise ValueError(
            f"'env_vector' must contain exactly {_ENV_FEATURE_DIM} "
            f"values {_ENV_FEATURE_ORDER}, got {len(values)}."
        )

    if any(value is None for value in values):
        raise ValueError("'env_vector' must not contain None values.")

    try:
        env_array = np.asarray(values, dtype=np.float64)
    except (TypeError, ValueError) as exc:
        raise ValueError(
            "'env_vector' must contain only numeric values."
        ) from exc

    if not np.all(np.isfinite(env_array)):
        raise ValueError(
            "'env_vector' contains non-finite values (NaN or inf)."
        )

    return env_array


def _encode_disease_one_hot(predicted_label: str) -> np.ndarray:
    """
    One-hot encode a disease label into the fixed 3-wide vector the MLP
    was trained on, in _DISEASE_COLS order (Acne, Alopecia, Eczema).

    Args:
        predicted_label: The final condition (post-CNN/Gemini hybrid
            decision). Must be one of _DISEASE_COLS -- "Healthy" is
            invalid here because it's handled entirely by the fast
            path in predict_risk() and never reaches this function.

    Raises:
        ValueError: If predicted_label is not a recognized non-Healthy
            disease class.
    """
    if predicted_label not in _DISEASE_COLS:
        raise ValueError(
            f"'predicted_label' must be one of {_DISEASE_COLS} (Healthy is "
            f"handled separately via the fast path), got {predicted_label!r}."
        )
    return np.array(
        [1.0 if predicted_label == disease else 0.0 for disease in _DISEASE_COLS],
        dtype=np.float64,
    )


# =====================================================================
# FEATURE CONCATENATION / SCALING
# =====================================================================

def _build_scaled_input(env_array: np.ndarray, disease_one_hot: np.ndarray) -> np.ndarray:
    """
    Concatenate the environmental vector and disease one-hot vector in
    the fixed, required order, then scale the result with the loaded
    feature scaler.

    Order (never sorted, never inferred, never changed -- matches
    ALL_INPUT_COLS = ENV_COLS + DISEASE_COLS in the training notebook):
        temperature, humidity, uv_index, aqi_pm25, stress_penalty,
        Acne, Alopecia, Eczema

    Returns:
        np.ndarray: The scaled input tensor, shape (1, 8), ready to be
        passed directly to the MLP.
    """
    combined = np.concatenate([env_array, disease_one_hot], axis=0)  # shape: (8,)
    combined = combined.reshape(1, _TOTAL_FEATURE_DIM)
    scaled = _feature_scaler.transform(combined)
    return scaled


# =====================================================================
# PUBLIC FUNCTION: predict_risk
# =====================================================================

def predict_risk(
    env_vector: Union[np.ndarray, List[float]],
    predicted_label: str,
) -> float:
    """
    Predict a continuous 0-100 risk score from the 5 environmental
    variables and the final condition, using the trained disease-
    specific-weighted multimodal MLP.

    This is the ONLY public prediction function in this module.

    Fast path: if ``predicted_label`` is ``"Healthy"``, this function
    immediately returns ``0.0`` without scaling, encoding, or MLP
    inference. This exists specifically to prevent the "Healthy Skin
    Paradox," where a Healthy classification could otherwise receive
    a nonzero, potentially alarming, risk score from the MLP.

    Args:
        env_vector: The 5 environmental variables, as a NumPy array
            or list, in the fixed order: ``(temperature, humidity,
            uv_index, aqi_pm25, stress_penalty)``.
        predicted_label: The final condition (the CNN/Gemini hybrid's
            decision -- see ``src.hybrid.predict``). One of
            ``config.CLASS_NAMES`` ("Acne", "Alopecia", "Eczema",
            "Healthy").

    Returns:
        float: The continuous risk score, on a 0-100 scale, or
        ``0.0`` if ``predicted_label == "Healthy"``. The MLP's raw
        prediction is NOT rounded or converted into a risk tier, but
        IS clamped to [0, 100] (the training target was itself bounded
        to that range by construction -- each disease's 5 per-factor
        weights sum to 100 -- so a raw prediction outside [0, 100]
        signals the model extrapolating on an out-of-distribution
        input, not a genuinely higher/lower risk).

    Raises:
        ValueError: If ``env_vector`` fails validation, or
            ``predicted_label`` is not a recognized class.
    """
    # Fast path for Healthy predictions: skip encoding, scaling, and
    # MLP inference entirely.
    if predicted_label == _HEALTHY_LABEL:
        logger.debug(
            "predicted_label is 'Healthy' -- returning risk score 0.0 "
            "via fast path (Healthy Skin Paradox prevention)."
        )
        return 0.0

    # Validate inputs before doing anything else.
    validated_env_array = _validate_env_vector(env_vector)
    disease_one_hot = _encode_disease_one_hot(predicted_label)

    # Build the (1, 8) scaled input tensor.
    scaled_input = _build_scaled_input(validated_env_array, disease_one_hot)

    # Run MLP inference.
    raw_prediction = _mlp_model.predict(scaled_input, verbose=0)
    score = float(np.asarray(raw_prediction).reshape(-1)[0])

    # Clamp to the documented 0-100 contract -- see docstring above for
    # why. Logged at WARNING so out-of-range upstream inputs are visible
    # in the API logs rather than silently producing a confusing score.
    if score < _RISK_SCORE_MIN or score > _RISK_SCORE_MAX:
        logger.warning(
            "MLP raw prediction %.2f is outside [%.0f, %.0f] -- clamping. "
            "This usually means env_vector contains a value outside the "
            "training distribution (expected ranges: Temperature 0-45, "
            "Humidity 0-100, UV_Index 0-11, AQI_PM25 0-300, "
            "Stress_Penalty in {0, 2, 3}). disease=%s env_vector=%s",
            score, _RISK_SCORE_MIN, _RISK_SCORE_MAX, predicted_label,
            validated_env_array.tolist(),
        )
    score = min(max(score, _RISK_SCORE_MIN), _RISK_SCORE_MAX)

    return score