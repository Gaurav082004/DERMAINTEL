"""
DERMAINTEL API - CNN Inference Engine
========================================

This module is the central inference engine for the trained skin-condition
CNN (``skin_model_final_v3_TTA.keras``). It is responsible ONLY for:

    1. Loading the CNN once (at import time).
    2. Running CNN inference (single forward pass).
    3. Running Test-Time Augmentation (TTA) and averaging results.
    4. Extracting the 256-dimensional feature vector (``fc_256`` layer)
       used by the multimodal MLP.
    5. Calling the existing, already-implemented Grad-CAM module.

This module intentionally does NOT:
    - Define Flask routes or HTTP endpoints.
    - Implement Grad-CAM math (that lives in the existing gradcam module).
    - Implement MLP inference.
    - Save any files to disk.
    - Retrain or modify model weights.

OOD detection has been removed project-wide (the standalone
src/ood_checker.py module is deleted). predict() now always runs TTA --
there is no more OOD-based gate deciding whether to run it.

=====================================================================
EXISTING PROJECT INTERFACES USED BY THIS MODULE
=====================================================================
The Grad-CAM module already exists in this project and is imported
here rather than re-implemented:

    src/gradcam.py
        def generate(model, image_array, class_index) -> np.ndarray:
            \"\"\"Returns the raw Grad-CAM heatmap.\"\"\"

        def overlay_heatmap(original_rgb, heatmap, alpha=0.4) -> np.ndarray:
            \"\"\"
            Blends `heatmap` onto `original_rgb` (uint8, (224,224,3))
            and returns the final colored overlay image.
            \"\"\"

``TTA_ITERATIONS`` is imported from config.py.
"""

import logging
from typing import Any, Dict

import numpy as np
import tensorflow as tf
from tensorflow import keras

from config import CLASS_NAMES, CNN_MODEL_PATH, TTA_ITERATIONS
from src.gradcam import generate, overlay_heatmap

logger = logging.getLogger(__name__)

# Name of the Dense(256) layer used as the shared feature representation
# for the multimodal MLP. Verified to exist immediately after model load.
_FEATURE_LAYER_NAME = "fc_256"


# =====================================================================
# MODEL LOADING (executed ONCE at module import time)
# =====================================================================

def _load_cnn_model() -> keras.Model:
    """
    Load the trained CNN model from the path defined in config.py.

    This is called exactly once, at module import time, so the model
    is never reloaded on a per-request basis.

    Returns:
        keras.Model: The loaded CNN model.

    Raises:
        RuntimeError: If the model file cannot be loaded, with the
            underlying TensorFlow error logged internally but not
            exposed to the caller.
    """
    try:
        model = keras.models.load_model(str(CNN_MODEL_PATH))
    except Exception as exc:  # noqa: BLE001 - intentionally broad, see below
        # Log the real TensorFlow/Keras error internally for debugging,
        # but never let its raw stack trace propagate to API callers.
        logger.exception("Failed to load CNN model from %s", CNN_MODEL_PATH)
        raise RuntimeError("Failed to load CNN model.") from None

    return model


def _build_feature_extractor(model: keras.Model) -> keras.Model:
    """
    Build (once) a reusable Keras sub-model that outputs the
    activations of the ``fc_256`` layer.

    Args:
        model: The loaded CNN model.

    Returns:
        keras.Model: A model with the same input as ``model`` and the
        ``fc_256`` layer's output as its output.

    Raises:
        RuntimeError: If the ``fc_256`` layer is not present in the
            loaded model, or if a valid feature-extractor sub-model
            cannot be constructed from it (e.g., due to the layer
            being unreachable from ``model.input`` in the traced
            computation graph).
    """
    try:
        feature_layer = model.get_layer(_FEATURE_LAYER_NAME)
    except ValueError:
        raise RuntimeError(
            f"Expected feature extraction layer '{_FEATURE_LAYER_NAME}' "
            "was not found in the loaded CNN model. Feature extraction "
            "for the multimodal MLP cannot proceed."
        ) from None

    # NOTE: this simple slicing approach works correctly even when the
    # ResNet50 backbone is a nested sub-model layer, as long as
    # `fc_256` itself is a top-level layer in the outer Functional
    # graph (i.e., added after the backbone call, not inside it) --
    # verified against a ResNet50-backed model matching this project's
    # architecture. If your model instead nests `fc_256` itself inside
    # a sub-model, this will raise below and the extractor will need
    # the same nested-layer traversal logic used in gradcam.py.
    try:
        feature_extractor = keras.Model(
            inputs=model.input, outputs=feature_layer.output
        )
    except Exception:
        logger.exception(
            "Failed to construct feature extractor sub-model from "
            "layer '%s'.",
            _FEATURE_LAYER_NAME,
        )
        raise RuntimeError(
            f"Could not build a feature-extractor sub-model from layer "
            f"'{_FEATURE_LAYER_NAME}'. This usually means the layer is "
            "nested inside a sub-model rather than being a top-level "
            "layer -- see src/gradcam.py for the nested-layer traversal "
            "logic this project already uses for a similar case."
        ) from None

    return feature_extractor


# Module-level, load-once model and feature extractor. These are the
# ONLY places the CNN is loaded / wrapped -- no other function in this
# module re-loads the model or reconstructs the feature extractor.
_cnn_model: keras.Model = _load_cnn_model()
_feature_extractor: keras.Model = _build_feature_extractor(_cnn_model)


# =====================================================================
# STRUCTURED PREDICTION FORMATTING
# =====================================================================

def _format_prediction(probabilities: np.ndarray) -> Dict[str, Any]:
    """
    Convert a raw probability vector into the project's structured
    prediction format.

    Args:
        probabilities: A 1D NumPy array of length ``len(CLASS_NAMES)``
            containing softmax probabilities.

    Returns:
        Dict[str, Any]: A dictionary with keys:
            - "probabilities": list[float]
            - "predicted_index": int
            - "predicted_label": str (from CLASS_NAMES)
            - "confidence": float (max softmax probability)
    """
    predicted_index = int(np.argmax(probabilities))
    confidence = float(probabilities[predicted_index])

    return {
        "probabilities": [float(p) for p in probabilities],
        "predicted_index": predicted_index,
        "predicted_label": CLASS_NAMES[predicted_index],
        "confidence": confidence,
    }


# =====================================================================
# SINGLE FORWARD PASS
# =====================================================================

def predict_single(image_array: np.ndarray) -> np.ndarray:
    """
    Run a single CNN forward pass on an already-preprocessed image
    tensor.

    Args:
        image_array: A preprocessed image tensor of shape
            (1, 224, 224, 3), dtype float32, pixel range [0, 1], as
            produced by ``src.preprocessor.preprocess``.

    Returns:
        np.ndarray: A 1D NumPy array of shape (len(CLASS_NAMES),)
        containing the softmax probabilities for this single pass.
    """
    raw_output = _cnn_model(image_array, training=False)
    probabilities = np.asarray(raw_output)[0]
    return probabilities.astype(np.float32)


# =====================================================================
# TEST-TIME AUGMENTATION (TTA)
# =====================================================================

def _apply_tta_augmentation(image_array: np.ndarray, iteration_index: int) -> np.ndarray:
    """
    Apply a single deterministic TTA augmentation to a preprocessed
    image tensor.

    The first iteration (index 0) is always the unaugmented, identity
    pass, so ``predict_with_tta`` always includes the "plain" forward
    pass among its averaged predictions. Subsequent iterations apply a
    horizontal flip and/or a small brightness perturbation, clipped
    back into the valid [0, 1] pixel range expected by the CNN.

    NOTE: This is a general-purpose TTA augmentation strategy. If the
    original project training/evaluation pipeline used a specific,
    different set of TTA transforms, update this function to match --
    no other function in this module needs to change.

    Args:
        image_array: A preprocessed image tensor of shape
            (1, 224, 224, 3), dtype float32, pixel range [0, 1].
        iteration_index: The current TTA iteration number (0-indexed).

    Returns:
        np.ndarray: An augmented image tensor of the same shape and
        dtype, with pixel values clipped to [0, 1].
    """
    if iteration_index == 0:
        # Always include one unaugmented ("identity") pass.
        return image_array

    augmented = tf.convert_to_tensor(image_array)

    # Odd iterations get a horizontal flip.
    if iteration_index % 2 == 1:
        augmented = tf.image.flip_left_right(augmented)

    # All augmented iterations get a small, seeded brightness jitter so
    # results remain deterministic/reproducible across runs.
    augmented = tf.image.random_brightness(
        augmented, max_delta=0.05, seed=iteration_index
    )

    # Preserve the [0, 1] pixel range the CNN expects.
    augmented = tf.clip_by_value(augmented, 0.0, 1.0)

    return augmented.numpy().astype(np.float32)


def predict_with_tta(image_array: np.ndarray) -> np.ndarray:
    """
    Run Test-Time Augmentation inference: apply ``TTA_ITERATIONS``
    (imported from config.py) augmented forward passes via
    ``predict_single``, then average the resulting probability
    vectors.

    This function does not duplicate any inference logic -- every
    forward pass is delegated to ``predict_single``.

    Args:
        image_array: A preprocessed image tensor of shape
            (1, 224, 224, 3), dtype float32, pixel range [0, 1].

    Returns:
        np.ndarray: A 1D NumPy array of shape (len(CLASS_NAMES),)
        containing the TTA-averaged softmax probabilities.
    """
    probability_vectors = []

    for iteration_index in range(TTA_ITERATIONS):
        augmented_image = _apply_tta_augmentation(image_array, iteration_index)
        probability_vectors.append(predict_single(augmented_image))

    averaged_probabilities = np.mean(np.stack(probability_vectors, axis=0), axis=0)
    return averaged_probabilities.astype(np.float32)


# =====================================================================
# FEATURE EXTRACTION (for the multimodal MLP)
# =====================================================================

def extract_features(image_array: np.ndarray) -> np.ndarray:
    """
    Extract the 256-dimensional feature vector (activations of the
    ``fc_256`` layer) for an already-preprocessed image, using the
    cached module-level feature extractor.

    Args:
        image_array: A preprocessed image tensor of shape
            (1, 224, 224, 3), dtype float32, pixel range [0, 1].

    Returns:
        np.ndarray: A 1D NumPy array of shape (256,), dtype float32.
    """
    raw_features = _feature_extractor(image_array, training=False)
    features = np.asarray(raw_features)[0]
    return features.astype(np.float32)


# =====================================================================
# GRAD-CAM
# =====================================================================

def get_gradcam(
    image_array: np.ndarray, original_rgb: np.ndarray, class_index: int
) -> np.ndarray:
    """
    Generate the final colored Grad-CAM overlay for a given
    preprocessed image and target class index, using the already-
    loaded CNN and the existing Grad-CAM module. No Grad-CAM math is
    implemented here.

    Producing a colored overlay requires blending the raw heatmap onto
    the original (un-normalized) RGB image, so both the model-input
    tensor and the original uint8 RGB image are required -- e.g. the
    two values returned by ``src.preprocessor.preprocess``
    (``model_input`` and ``original_rgb`` respectively).

    Args:
        image_array: A preprocessed image tensor of shape
            (1, 224, 224, 3), dtype float32, pixel range [0, 1], used
            to compute the raw Grad-CAM heatmap.
        original_rgb: The un-normalized image the heatmap is blended
            onto, shape (224, 224, 3), dtype uint8, pixel range
            [0, 255].
        class_index: The class index to generate the Grad-CAM overlay
            for (typically the predicted class index).

    Returns:
        np.ndarray: The final colored Grad-CAM overlay image, as
        returned by the existing Grad-CAM module's
        ``overlay_heatmap`` function.
    """
    heatmap = generate(
        model=_cnn_model,
        image_array=image_array,
        class_index=class_index,
    )
    return overlay_heatmap(original_rgb, heatmap, alpha=0.4)


# =====================================================================
# MAIN ORCHESTRATION: TTA prediction
# =====================================================================

def predict(image_array: np.ndarray) -> Dict[str, Any]:
    """
    Run the full CNN inference workflow for a single preprocessed
    image: always run Test-Time Augmentation and return its averaged
    result.

    OOD detection has been removed (no more single-pass -> OOD gate ->
    conditionally-skip-TTA workflow) -- TTA now always runs, unconditionally.

    Args:
        image_array: A preprocessed image tensor of shape
            (1, 224, 224, 3), dtype float32, pixel range [0, 1], as
            produced by ``src.preprocessor.preprocess``.

    Returns:
        Dict[str, Any]: A structured prediction dictionary containing
        at least:
            - "probabilities": list[float]
            - "predicted_index": int
            - "predicted_label": str
            - "confidence": float
            - "tta_applied": bool -- always True now.
    """
    tta_probabilities = predict_with_tta(image_array)
    result = _format_prediction(tta_probabilities)
    result["tta_applied"] = True
    return result