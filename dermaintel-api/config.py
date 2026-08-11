"""
DERMAINTEL API - Configuration Module
======================================

This module is the SINGLE SOURCE OF TRUTH for all configuration constants
used across the DERMAINTEL API.

This file intentionally contains ONLY:
    - Configuration constants
    - Path definitions
    - Lightweight validation helper functions

This file intentionally does NOT contain:
    - Any TensorFlow / Keras code
    - Any scikit-learn code
    - Any Flask / FastAPI route or app logic
    - Any model loading
    - Any inference logic

All paths are built using pathlib.Path so that the project works
identically on Windows, macOS, and Linux without any code changes.
"""

from pathlib import Path

# ====================================================================
# PROJECT ROOT / DIRECTORY CONFIGURATION
# ====================================================================

# This file lives at: dermaintel-api/config.py
# Therefore, the project root is simply the directory containing this file.
# Using .resolve() ensures we always get an absolute, canonicalized path
# regardless of the current working directory the API is launched from,
# and .parent works identically on Windows and Linux (no manual string
# splitting or hardcoded separators required).
PROJECT_ROOT: Path = Path(__file__).resolve().parent

# Directory where all trained model artifacts (CNN, MLP, scaler, etc.)
# are stored. Kept as a Path object so downstream code can use
# ARTIFACTS_DIR / "some_file.ext" style composition.
ARTIFACTS_DIR: Path = PROJECT_ROOT / "artifacts"


# ====================================================================
# MODEL ARTIFACT PATHS
# ====================================================================
# NOTE: These are *paths only*. Nothing in this file loads these files.
# Actual model loading is the responsibility of the inference/service
# layer, not this configuration module.

# Path to the trained CNN (image classifier) model file.
CNN_MODEL_PATH: Path = ARTIFACTS_DIR / "skin_model_final_v3_TTA.keras"

# Path to the trained MLP (tabular/metadata classifier) model file.
MLP_MODEL_PATH: Path = ARTIFACTS_DIR / "mlp_model.keras"

# Path to the fitted feature scaler (e.g., StandardScaler/MinMaxScaler)
# used to preprocess tabular features before they are passed to the MLP.
FEATURE_SCALER_PATH: Path = ARTIFACTS_DIR / "feature_scaler.pkl"


# ====================================================================
# MODEL CONFIGURATION - CLASS NAMES
# ====================================================================

# CRITICAL: The order of this list MUST exactly match the order of the
# CNN's softmax output indices (i.e., CLASS_NAMES[i] must correspond to
# output neuron i of the trained CNN). If the CNN is ever retrained with
# a different class ordering, this list MUST be updated to match, or all
# downstream predictions will be silently mislabeled.
CLASS_NAMES = [
    "Acne",       # index 0 - MUST match CNN softmax output index 0
    "Alopecia",   # index 1 - MUST match CNN softmax output index 1
    "Eczema",     # index 2 - MUST match CNN softmax output index 2
    "Healthy",    # index 3 - MUST match CNN softmax output index 3
]


# ====================================================================
# IMAGE PREPROCESSING CONFIGURATION
# ====================================================================

# Target (height, width) that input images must be resized to before
# being fed into the CNN.
# CRITICAL: This value must remain IDENTICAL to the image size used
# during CNN training. Changing this without retraining the CNN will
# produce invalid predictions.
IMAGE_SIZE = (224, 224)

# Pixel value rescaling factor applied to input images (i.e., pixel * RESCALE).
# CRITICAL: This must remain IDENTICAL to the rescaling factor used
# during CNN training (typically 1/255 to normalize 0-255 pixel values
# into a 0-1 range). Changing this without retraining the CNN will
# produce invalid predictions.
RESCALE = 1.0 / 255.0


# ====================================================================
# TEST-TIME AUGMENTATION (TTA) CONFIGURATION
# ====================================================================

# Number of augmented forward passes to run and average during
# Test-Time Augmentation inference (see src/cnn_engine.py).
TTA_ITERATIONS = 5


# ====================================================================
# OUT-OF-DISTRIBUTION (OOD) DETECTION CONFIGURATION
# ====================================================================

# Minimum acceptable "max softmax probability" for a prediction to be
# considered in-distribution (i.e., an actual skin image the model
# recognizes with reasonable confidence).
# NOTE: This is an INITIAL calibration value. It should be revisited
# and tuned after evaluating the model's behavior on non-skin
# (out-of-distribution) images.
MAXPROB_THRESHOLD = 0.60

# Maximum acceptable prediction entropy for a prediction to be
# considered in-distribution. Higher entropy indicates the model is
# "unsure" across classes, which is a signal of a potential OOD input.
# NOTE: This is an INITIAL calibration value. It should be revisited
# and tuned after evaluating the model's behavior on non-skin
# (out-of-distribution) images.
ENTROPY_THRESHOLD = 1.20


# ====================================================================
# RISK TIER CONFIGURATION
# ====================================================================
# These thresholds define the boundaries between risk tiers (e.g.,
# Low / Medium / High) used to categorize the MLP's continuous risk
# score output. They are defined ONLY here so that no other module
# needs to hardcode these values.
#
# Risk tiers (based on the MLP's continuous risk score):
#   Low Risk:    score <= TIER_LOW_MAX      (<= 3)
#   Medium Risk: TIER_LOW_MAX < score <= TIER_MEDIUM_MAX  (4-7)
#   High Risk:   score > TIER_MEDIUM_MAX    (>= 8)

# Upper bound (inclusive) of the "Low" risk tier.
TIER_LOW_MAX = 3

# Upper bound (inclusive) of the "Medium" risk tier.
# Anything above this value falls into the "High" risk tier.
TIER_MEDIUM_MAX = 7


# ====================================================================
# HELPER FUNCTION 1: validate_paths()
# ====================================================================

def validate_paths() -> dict:
    """
    Check whether all required artifact files exist on disk.

    This function performs a lightweight existence check ONLY. It does
    NOT open, read, deserialize, or load any of the artifact files in
    any way. It is intended to be used as a fast pre-flight check
    before the API attempts to start up and load models elsewhere.

    Returns:
        dict: A dictionary indicating the existence of each required
            artifact file, keyed by a short logical name. Example:

            {
                "cnn_model": True,
                "mlp_model": True,
                "feature_scaler": False,
            }
    """
    return {
        "cnn_model": CNN_MODEL_PATH.is_file(),
        "mlp_model": MLP_MODEL_PATH.is_file(),
        "feature_scaler": FEATURE_SCALER_PATH.is_file(),
    }


# ====================================================================
# HELPER FUNCTION 2: validate_configuration()
# ====================================================================

def validate_configuration() -> dict:
    """
    Verify that this configuration module is internally consistent
    before the API starts up.

    This function does NOT raise exceptions on invalid configuration.
    Instead, it collects every validation error it finds and returns
    them together, so that all configuration problems can be surfaced
    and fixed at once rather than one at a time.

    Checks performed:
        - CLASS_NAMES contains exactly four classes.
        - IMAGE_SIZE equals (224, 224).
        - RESCALE equals 1/255.
        - MAXPROB_THRESHOLD is between 0 and 1 (exclusive of bounds is
          not required; 0 <= value <= 1).
        - ENTROPY_THRESHOLD is a positive number.
        - TIER_LOW_MAX is smaller than TIER_MEDIUM_MAX.
        - All required Path objects are valid pathlib.Path instances.

    Returns:
        dict: A dictionary describing whether the configuration is
            valid and, if not, why. Example:

            {
                "configuration_valid": True,
                "errors": []
            }

            or

            {
                "configuration_valid": False,
                "errors": [
                    "CLASS_NAMES must contain exactly 4 classes, found 3.",
                    "TIER_LOW_MAX must be smaller than TIER_MEDIUM_MAX.",
                ]
            }
    """
    errors = []

    # --- CLASS_NAMES check -------------------------------------------------
    if not isinstance(CLASS_NAMES, list) or len(CLASS_NAMES) != 4:
        errors.append(
            f"CLASS_NAMES must contain exactly 4 classes, found "
            f"{len(CLASS_NAMES) if isinstance(CLASS_NAMES, list) else 'invalid type'}."
        )

    # --- IMAGE_SIZE check ----------------------------------------------------
    if IMAGE_SIZE != (224, 224):
        errors.append(
            f"IMAGE_SIZE must be (224, 224), found {IMAGE_SIZE}."
        )

    # --- RESCALE check -------------------------------------------------------
    if RESCALE != 1.0 / 255.0:
        errors.append(
            f"RESCALE must equal 1/255 ({1.0 / 255.0}), found {RESCALE}."
        )

    # --- MAXPROB_THRESHOLD check ----------------------------------------------
    if not isinstance(MAXPROB_THRESHOLD, (int, float)) or not (0 <= MAXPROB_THRESHOLD <= 1):
        errors.append(
            f"MAXPROB_THRESHOLD must be between 0 and 1, found {MAXPROB_THRESHOLD}."
        )

    # --- ENTROPY_THRESHOLD check -----------------------------------------------
    if not isinstance(ENTROPY_THRESHOLD, (int, float)) or ENTROPY_THRESHOLD <= 0:
        errors.append(
            f"ENTROPY_THRESHOLD must be positive, found {ENTROPY_THRESHOLD}."
        )

    # --- Risk tier ordering check ------------------------------------------
    if not isinstance(TIER_LOW_MAX, (int, float)) or not isinstance(TIER_MEDIUM_MAX, (int, float)):
        errors.append(
            "TIER_LOW_MAX and TIER_MEDIUM_MAX must both be numeric values."
        )
    elif TIER_LOW_MAX >= TIER_MEDIUM_MAX:
        errors.append(
            f"TIER_LOW_MAX ({TIER_LOW_MAX}) must be smaller than "
            f"TIER_MEDIUM_MAX ({TIER_MEDIUM_MAX})."
        )

    # --- Path type checks ------------------------------------------------------
    required_paths = {
        "PROJECT_ROOT": PROJECT_ROOT,
        "ARTIFACTS_DIR": ARTIFACTS_DIR,
        "CNN_MODEL_PATH": CNN_MODEL_PATH,
        "MLP_MODEL_PATH": MLP_MODEL_PATH,
        "FEATURE_SCALER_PATH": FEATURE_SCALER_PATH,
    }
    for name, value in required_paths.items():
        if not isinstance(value, Path):
            errors.append(f"{name} must be a pathlib.Path instance, found {type(value)}.")

    return {
        "configuration_valid": len(errors) == 0,
        "errors": errors,
    }

"""
DERMAINTEL — config.py additions for feature-space OOD detection
====================================================================

I don't have the current contents of your config.py, so rather than
overwrite it, this file contains ONLY the new constants the redesigned
ood_checker.py needs. Copy/merge this block into your existing config.py.

Every threshold used by ood_checker.py and calibrate_ood.py is defined
here — nothing is hardcoded in the logic modules.
"""

import os

# ---------------------------------------------------------------------------
# Feature-space dimensionality
# ---------------------------------------------------------------------------
# Must match the output dimensionality of cnn_engine.extract_features().
FEATURE_DIM = 256

# ---------------------------------------------------------------------------
# Mahalanobis OOD detector (primary signal)
# ---------------------------------------------------------------------------
# Flag an input as OOD when its Mahalanobis distance from the calibrated
# in-distribution feature centroid exceeds this value.
#
# THIS DEFAULT IS A PLACEHOLDER. It must be selected experimentally against
# a held-out validation set of in-distribution images and a representative
# set of non-skin / OOD images — see the "threshold selection" explanation
# below. Do not ship this default without calibrating it for your data.
MAHALANOBIS_THRESHOLD = 30.0

# Diagonal regularization (Tikhonov / ridge term) added to the covariance
# matrix before inversion. 256-D feature covariance estimated from a
# training set can be ill-conditioned or singular (e.g. if N_samples is
# close to or below FEATURE_DIM, or features are collinear). This keeps
# the matrix invertible without materially distorting well-conditioned
# covariances.
COVARIANCE_REGULARIZATION = 1e-6

# ---------------------------------------------------------------------------
# Softmax-based signals (secondary / optional, kept for backward
# compatibility with any code still calling the old checks)
# ---------------------------------------------------------------------------
MAXPROB_THRESHOLD = 0.60
ENTROPY_THRESHOLD = 1.2

# ---------------------------------------------------------------------------
# Calibration statistics storage
# ---------------------------------------------------------------------------
# Where calibrate_ood.py writes, and ood_checker.py reads, the calibrated
# mean / covariance / inverse-covariance of the in-distribution feature
# space.
OOD_STATS_PATH = os.path.join("models", "ood_feature_statistics.npz")

# ---------------------------------------------------------------------------
# Calibration run parameters (used by calibrate_ood.py)
# ---------------------------------------------------------------------------
# Path to the training image directory used to build the calibration set.
# Adjust to match your actual dataset layout.
TRAINING_DATA_DIR = os.path.join("data", "train")

# How often calibrate_ood.py logs progress (every N images).
CALIBRATION_LOG_INTERVAL = 50