"""
DERMAINTEL API - Multimodal MLP Risk Engine
==============================================

This module performs multimodal risk prediction by combining:

    - A 256-dimensional CNN feature vector (from ``src.cnn_engine``)
    - 5 environmental variables

into a single continuous risk score, using the already-trained MLP
model (``mlp_model.keras``) and its fitted feature scaler
(``feature_scaler.pkl``).

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

from config import FEATURE_SCALER_PATH, MLP_MODEL_PATH

logger = logging.getLogger(__name__)

# ----------------------------------------------------------------------
# Fixed dimensional constants describing the MLP's expected input shape.
# These are NOT tunable configuration values -- they describe the
# structural contract between the CNN feature extractor and the MLP,
# so they live here rather than in config.py.
# ----------------------------------------------------------------------
_CNN_FEATURE_DIM = 256
_ENV_FEATURE_DIM = 5
_TOTAL_FEATURE_DIM = _CNN_FEATURE_DIM + _ENV_FEATURE_DIM  # 261

# The environmental feature order is ABSOLUTELY FIXED and must never be
# changed, sorted, or inferred. It is documented here purely for
# readability; the concatenation logic below hardcodes this exact order.
_ENV_FEATURE_ORDER = (
    "temperature",
    "humidity",
    "uv_index",
    "aqi_pm25",
    "stress_penalty",
)

# Label for which risk prediction is always defined to be exactly 0.0,
# bypassing scaling/concatenation/inference entirely. This prevents the
# "Healthy Skin Paradox" (a Healthy classification receiving a
# nonzero, potentially alarming, risk score from the MLP).
_HEALTHY_LABEL = "Healthy"


# =====================================================================
# MODEL / SCALER LOADING (executed ONCE at module import time)
# =====================================================================

def _load_mlp_model() -> keras.Model:
    """
    Load the trained MLP model from the path defined in config.py.

    This is called exactly once, at module import time, so the model
    is never reloaded on a per-request basis.

    Returns:
        keras.Model: The loaded MLP model.

    Raises:
        RuntimeError: If the MLP model file cannot be loaded. The
            underlying TensorFlow/Keras error is logged internally
            but never exposed to the caller.
    """
    try:
        model = keras.models.load_model(str(MLP_MODEL_PATH))
    except Exception:  # noqa: BLE001 - intentionally broad, see below
        logger.exception("Failed to load MLP model from %s", MLP_MODEL_PATH)
        raise RuntimeError(
            "Failed to load the MLP risk model artifact "
            f"('{Path(MLP_MODEL_PATH).name}')."
        ) from None

    return model


def _load_feature_scaler() -> object:
    """
    Load the fitted feature scaler from the path defined in config.py.

    This is called exactly once, at module import time.

    Returns:
        object: The loaded scaler object (e.g., a fitted
        scikit-learn ``StandardScaler`` or ``MinMaxScaler``).

    Raises:
        RuntimeError: If the scaler file cannot be loaded, or if its
            expected input dimensionality does not match the MLP's
            expected input size (256 CNN features + 5 environmental
            variables = 261).
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
    # exactly 261 features (256 CNN features + 5 environmental
    # variables). If not, the wrong artifact has been loaded and
    # scaling would silently corrupt every prediction.
    n_features = getattr(scaler, "n_features_in_", None)
    if n_features != _TOTAL_FEATURE_DIM:
        raise RuntimeError(
            "Loaded feature scaler has an incorrect dimensionality: "
            f"expected n_features_in_ == {_TOTAL_FEATURE_DIM} "
            f"({_CNN_FEATURE_DIM} CNN features + {_ENV_FEATURE_DIM} "
            f"environmental variables), but got {n_features!r}. "
            "This indicates an incorrect or mismatched scaler artifact "
            "has been loaded."
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

def _validate_cnn_features(cnn_features: np.ndarray) -> np.ndarray:
    """
    Validate the CNN feature vector before use.

    Requirements:
        - Must be a NumPy array.
        - Must have shape exactly ``(256,)``.
        - Must have a numeric dtype.

    Args:
        cnn_features: The candidate CNN feature vector.

    Returns:
        np.ndarray: The validated feature vector, unchanged.

    Raises:
        ValueError: If any requirement above is not satisfied.
    """
    if not isinstance(cnn_features, np.ndarray):
        raise ValueError(
            "'cnn_features' must be a NumPy array, got "
            f"{type(cnn_features).__name__}."
        )

    if cnn_features.shape != (_CNN_FEATURE_DIM,):
        raise ValueError(
            f"'cnn_features' must have shape ({_CNN_FEATURE_DIM},), "
            f"got {cnn_features.shape}."
        )

    if not np.issubdtype(cnn_features.dtype, np.number):
        raise ValueError(
            "'cnn_features' must have a numeric dtype, got "
            f"{cnn_features.dtype}."
        )

    if not np.all(np.isfinite(cnn_features)):
        raise ValueError(
            "'cnn_features' contains non-finite values (NaN or inf)."
        )

    return cnn_features


def _validate_env_vector(env_vector: Union[np.ndarray, List[float]]) -> np.ndarray:
    """
    Validate the environmental variable vector before use.

    Requirements:
        - Exactly 5 values.
        - All values numeric (no ``None``).
        - No NaN values.

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


# =====================================================================
# FEATURE CONCATENATION / SCALING
# =====================================================================

def _build_scaled_input(
    cnn_features: np.ndarray, env_array: np.ndarray
) -> np.ndarray:
    """
    Concatenate the CNN feature vector and environmental variables in
    the fixed, required order, then scale the result with the loaded
    feature scaler.

    Order (never sorted, never inferred, never changed):
        feature_0 ... feature_255, temperature, humidity, uv_index,
        aqi_pm25, stress_penalty

    Args:
        cnn_features: Validated CNN feature vector, shape (256,).
        env_array: Validated environmental variable vector, shape (5,).

    Returns:
        np.ndarray: The scaled input tensor, shape (1, 261), ready to
        be passed directly to the MLP.
    """
    # Concatenate in the fixed order: CNN features first, then the
    # environmental variables in their fixed order.
    combined = np.concatenate(
        [cnn_features.astype(np.float64), env_array], axis=0
    )  # shape: (261,)

    # Reshape to (1, 261) before scaling, since the scaler and MLP
    # both expect a 2D, batch-of-one input.
    combined = combined.reshape(1, _TOTAL_FEATURE_DIM)

    # Never feed raw values into the MLP -- always scale first.
    scaled = _feature_scaler.transform(combined)
    return scaled


# =====================================================================
# PUBLIC FUNCTION: predict_risk
# =====================================================================

def predict_risk(
    cnn_features: np.ndarray,
    env_vector: Union[np.ndarray, List[float]],
    predicted_label: str,
) -> float:
    """
    Predict a continuous risk score from a CNN feature vector and a
    set of environmental variables, using the trained multimodal MLP.

    This is the ONLY public prediction function in this module.

    Fast path: if ``predicted_label`` is ``"Healthy"``, this function
    immediately returns ``0.0`` without scaling, concatenation, or MLP
    inference. This exists specifically to prevent the "Healthy Skin
    Paradox," where a Healthy classification could otherwise receive
    a nonzero, potentially alarming, risk score from the MLP.

    Args:
        cnn_features: The 256-dimensional CNN feature vector, as
            returned by ``src.cnn_engine.extract_features``. Must be
            a NumPy array of shape ``(256,)`` with a numeric dtype.
        env_vector: The 5 environmental variables, as a NumPy array
            or list, in the fixed order: ``(temperature, humidity,
            uv_index, aqi_pm25, stress_penalty)``.
        predicted_label: The CNN's predicted class label (e.g. one of
            ``config.CLASS_NAMES``). Used only to check for the
            ``"Healthy"`` fast path.

    Returns:
        float: The raw continuous risk score predicted by the MLP, or
        ``0.0`` if ``predicted_label == "Healthy"``. The value is
        returned exactly as predicted -- it is never rounded, clipped,
        or converted into a risk tier.

    Raises:
        ValueError: If ``cnn_features`` or ``env_vector`` fail input
            validation.
    """
    # Fast path for Healthy predictions: skip scaling, concatenation,
    # and MLP inference entirely.
    if predicted_label == _HEALTHY_LABEL:
        logger.debug(
            "predicted_label is 'Healthy' -- returning risk score 0.0 "
            "via fast path (Healthy Skin Paradox prevention)."
        )
        return 0.0

    # Validate inputs before doing anything else.
    validated_cnn_features = _validate_cnn_features(cnn_features)
    validated_env_array = _validate_env_vector(env_vector)

    # Build the (1, 261) scaled input tensor.
    scaled_input = _build_scaled_input(validated_cnn_features, validated_env_array)

    # Run MLP inference.
    raw_prediction = _mlp_model.predict(scaled_input, verbose=0)

    # The MLP output is expected to be shape (1, 1) or (1,) for a
    # single continuous score; extract the scalar value exactly as
    # predicted, with no rounding, clipping, or tier conversion.
    score = float(np.asarray(raw_prediction).reshape(-1)[0])

    return score