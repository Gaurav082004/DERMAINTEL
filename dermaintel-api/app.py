"""
DERMAINTEL API - Flask HTTP Application
==========================================

This module is ONLY the Flask HTTP API layer for the DERMAINTEL
backend. It exposes two endpoints:

    - GET  /health   Basic liveness/readiness check.
    - POST /predict  Full multimodal skin-condition risk prediction
                      pipeline (image upload + environmental variables).

This module contains NO machine learning logic of its own. It only
orchestrates calls to the existing, already-implemented backend
modules in the exact order required:

    config.validate_paths()      -> startup artifact check
    src.preprocessor.preprocess  -> image preprocessing
    src.cnn_engine.predict       -> CNN classification (+ OOD + TTA)
    src.cnn_engine.extract_features -> 256-d feature vector
    src.mlp_engine.predict_risk  -> multimodal risk score
    src.risk_mapper.score_to_tier / get_recommendations
    src.cnn_engine.get_gradcam   -> Grad-CAM overlay

No existing module's API is changed or reimplemented here.

Note on GPU/CPU: this module does NOT set ``CUDA_VISIBLE_DEVICES`` and
does not force any device placement. TensorFlow will automatically use
a GPU if one is available, and will fall back to CPU otherwise. This
file works unmodified on both GPU and CPU systems.
"""

import base64
import io
import logging
import time
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from flask import Flask, jsonify, request
from PIL import Image

from config import validate_paths
from src import cnn_engine, mlp_engine, preprocessor, risk_mapper

# Configure logging so the INFO-level events required by this module
# (startup, warm-up, request lifecycle, OOD rejections, timing, etc.)
# are actually emitted, not silently filtered out by Python's default
# WARNING-level root logger.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)

app = Flask(__name__)

# ----------------------------------------------------------------------
# Request validation constants
# ----------------------------------------------------------------------

# Only these image MIME types are accepted for the "image" upload field.
_ALLOWED_IMAGE_CONTENT_TYPES = {"image/jpeg", "image/jpg", "image/png"}

# Required environmental form fields, in the exact order the rest of
# the backend (mlp_engine) expects them to be concatenated in. This
# order must never be changed, sorted, or inferred.
_REQUIRED_ENV_FIELDS: Tuple[str, ...] = (
    "temperature",
    "humidity",
    "uv_index",
    "aqi_pm25",
    "stress_penalty",
)


# =====================================================================
# STARTUP VALIDATION
# =====================================================================

def _run_startup_validation() -> None:
    """
    Verify that all required model/scaler artifacts exist on disk
    before allowing the Flask server to start.

    Calls ``config.validate_paths()`` and raises immediately if any
    required artifact is missing, so the server never starts in a
    broken state.

    Raises:
        RuntimeError: If one or more required artifacts are missing,
            with a message listing every missing artifact by name.
    """
    path_status: Dict[str, bool] = validate_paths()
    missing_artifacts = [name for name, exists in path_status.items() if not exists]

    if missing_artifacts:
        raise RuntimeError(
            "DERMAINTEL API cannot start: missing required artifact(s): "
            f"{', '.join(missing_artifacts)}."
        )

    logger.info("Startup validation passed: all required artifacts found.")


# Run startup validation immediately after the Flask app is created.
_run_startup_validation()


# =====================================================================
# OPTIONAL MODEL WARM-UP
# =====================================================================

def warm_up_models() -> None:
    """
    Run a single dummy CNN forward pass to avoid a slow first
    real prediction (e.g., due to lazy graph tracing/compilation).

    Only the CNN is warmed up -- the MLP is intentionally left cold,
    per project requirements. Any failure during warm-up is logged
    but never prevents the server from starting.
    """
    try:
        dummy_image = np.zeros((1, 224, 224, 3), dtype=np.float32)
        cnn_engine.predict_single(dummy_image)
        logger.info("CNN model warm-up completed successfully.")
    except Exception:  # noqa: BLE001 - warm-up must never crash startup
        logger.exception("CNN model warm-up failed; continuing startup anyway.")


warm_up_models()


# =====================================================================
# HELPER: array_to_base64
# =====================================================================

def array_to_base64(image_array: np.ndarray) -> str:
    """
    Convert a uint8 RGB image array (e.g., a Grad-CAM overlay) into a
    base64-encoded PNG data URI.

    Args:
        image_array: A NumPy array of shape (H, W, 3), dtype uint8,
            representing an RGB image.

    Returns:
        str: A data URI string of the form
        ``"data:image/png;base64,<encoded data>"``.

    Raises:
        Exception: If the image cannot be converted or encoded. This
            function intentionally does NOT swallow errors -- callers
            are responsible for handling failures.
    """
    image = Image.fromarray(image_array.astype(np.uint8), mode="RGB")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


# =====================================================================
# HELPER: to_python
# =====================================================================

def to_python(value: Any) -> Any:
    """
    Recursively convert NumPy values (and containers of them) into
    native, JSON-safe Python objects.

    Supports: ``np.float32``, ``np.float64``, ``np.int32``,
    ``np.int64``, ``np.ndarray``, ``list``, ``tuple``, and nested
    ``dict`` structures containing any of the above.

    This function MUST be called on any response body before passing
    it to ``jsonify()``.

    Args:
        value: Any Python or NumPy value, possibly nested inside
            dicts/lists/tuples.

    Returns:
        Any: An equivalent value containing only native Python types
        (``float``, ``int``, ``bool``, ``str``, ``None``, ``dict``,
        ``list``).
    """
    if isinstance(value, dict):
        return {key: to_python(item) for key, item in value.items()}

    if isinstance(value, (list, tuple)):
        return [to_python(item) for item in value]

    if isinstance(value, np.ndarray):
        return to_python(value.tolist())

    if isinstance(value, (np.float32, np.float64)):
        return float(value)

    if isinstance(value, (np.int32, np.int64)):
        return int(value)

    if isinstance(value, np.bool_):
        return bool(value)

    return value


# =====================================================================
# REQUEST VALIDATION HELPERS
# =====================================================================

def _validate_image_upload(uploaded_file: Any) -> Optional[Tuple[Dict[str, str], int]]:
    """
    Validate the uploaded "image" file field.

    Checks that a file was actually uploaded, that it has a non-empty
    filename, and that its content type is one of the accepted image
    formats.

    Args:
        uploaded_file: The value of ``request.files.get("image")``,
            or ``None`` if the field was not provided.

    Returns:
        Optional[Tuple[Dict[str, str], int]]: ``None`` if the upload
        is valid, otherwise a tuple of ``(error_body, status_code)``
        ready to be returned directly from the route handler.
    """
    if uploaded_file is None or not uploaded_file.filename:
        return {"error": "Missing required field: image"}, 400

    content_type = (uploaded_file.content_type or "").lower()
    if content_type not in _ALLOWED_IMAGE_CONTENT_TYPES:
        return {"error": "Unsupported image format."}, 400

    return None


def _parse_env_fields(
    form: Any,
) -> Tuple[Optional[Dict[str, float]], Optional[Tuple[Dict[str, str], int]]]:
    """
    Validate and parse the required environmental form fields into
    numeric values.

    Args:
        form: The Flask ``request.form`` mapping.

    Returns:
        Tuple[Optional[Dict[str, float]], Optional[Tuple[Dict[str, str], int]]]:
            A ``(values, error)`` pair. Exactly one of the two is
            ``None``: on success, ``values`` is a dict mapping each
            field name in ``_REQUIRED_ENV_FIELDS`` to its parsed
            ``float`` value and ``error`` is ``None``; on failure,
            ``values`` is ``None`` and ``error`` is a
            ``(error_body, status_code)`` tuple ready to be returned
            directly from the route handler.
    """
    parsed_values: Dict[str, float] = {}

    for field_name in _REQUIRED_ENV_FIELDS:
        raw_value = form.get(field_name)

        if raw_value is None or str(raw_value).strip() == "":
            return None, ({"error": f"Missing required field: {field_name}"}, 400)

        try:
            parsed_values[field_name] = float(raw_value)
        except (TypeError, ValueError):
            return None, (
                {"error": f"Invalid numeric value for field: {field_name}"},
                400,
            )

    return parsed_values, None


# =====================================================================
# GET /health
# =====================================================================

@app.route("/health", methods=["GET"])
def health() -> Any:
    """
    Basic liveness/readiness check.

    Returns:
        Flask response: HTTP 200 with JSON
        ``{"status": "ok", "models_loaded": true}``. Never exposes
        internal file paths or TensorFlow implementation details.
    """
    return jsonify({"status": "ok", "models_loaded": True}), 200


# =====================================================================
# POST /predict
# =====================================================================

@app.route("/predict", methods=["POST"])
def predict_endpoint() -> Any:
    """
    Run the full DERMAINTEL prediction pipeline on an uploaded image
    and a set of environmental variables.

    Expects ``multipart/form-data`` with fields:
        - ``image``: the uploaded image file (JPEG or PNG).
        - ``temperature``, ``humidity``, ``uv_index``, ``aqi_pm25``,
          ``stress_penalty``: numeric environmental variables.

    Pipeline (executed in this exact order):
        1. Validate the uploaded image and environmental fields.
        2. Preprocess the image (``src.preprocessor.preprocess``).
        3. Run CNN classification (``src.cnn_engine.predict``).
        4. If the CNN's OOD check rejects the image, return
           immediately (HTTP 400) without running feature extraction
           or the MLP.
        5. Extract the 256-d CNN feature vector.
        6. Build the environmental variable vector in fixed order.
        7. Run multimodal MLP risk prediction.
        8. Map the risk score to a risk tier.
        9. Look up recommendations for the (disease, tier) pair.
        10. Generate a Grad-CAM overlay (best-effort; failures do not
            fail the request).
        11. Return the final structured JSON response.

    Returns:
        Flask response: HTTP 200 with the full structured prediction
        JSON on success; HTTP 400 for invalid input or OOD rejection;
        HTTP 500 for unexpected internal errors. NumPy stack traces
        and internal implementation details are never exposed to the
        client.
    """
    start_time = time.perf_counter()
    logger.info("Prediction request received.")

    # --- Step 0: request validation (before doing anything else) ---
    uploaded_file = request.files.get("image")
    image_validation_error = _validate_image_upload(uploaded_file)
    if image_validation_error is not None:
        error_body, status_code = image_validation_error
        return jsonify(error_body), status_code

    env_values, env_validation_error = _parse_env_fields(request.form)
    if env_validation_error is not None:
        error_body, status_code = env_validation_error
        return jsonify(error_body), status_code

    try:
        # --- Step 1: read uploaded image bytes ---
        image_bytes = uploaded_file.read()

        # --- Step 2: preprocess ---
        processed = preprocessor.preprocess(image_bytes)
        original_rgb = processed["original_rgb"]
        model_input = processed["model_input"]

        # --- Step 3: CNN prediction (includes OOD check + TTA) ---
        prediction = cnn_engine.predict(model_input)

        # --- Step 4: OOD gate -- stop immediately if rejected ---
        if prediction["ood"]["is_ood"]:
            logger.info(
                "Prediction rejected by OOD detector: %s", prediction["ood"]
            )
            return (
                jsonify(
                    to_python(
                        {
                            "error": "Image rejected by OOD detector",
                            "ood": prediction["ood"],
                        }
                    )
                ),
                400,
            )

        # --- Step 5: feature extraction ---
        cnn_features = cnn_engine.extract_features(model_input)

        # --- Step 6: environmental vector, EXACT fixed order ---
        env_vector: List[float] = [
            env_values["temperature"],
            env_values["humidity"],
            env_values["uv_index"],
            env_values["aqi_pm25"],
            env_values["stress_penalty"],
        ]

        # --- Step 7: multimodal risk prediction ---
        risk_score = mlp_engine.predict_risk(
            cnn_features, env_vector, prediction["predicted_label"]
        )

        # --- Step 8: risk tier ---
        risk_tier = risk_mapper.score_to_tier(risk_score)

        # --- Step 9: recommendations ---
        recommendations = risk_mapper.get_recommendations(
            prediction["predicted_label"], risk_tier
        )

        # --- Step 10: Grad-CAM (best-effort, never fails the request) ---
        gradcam_data_uri: Optional[str] = None
        try:
            overlay = cnn_engine.get_gradcam(
                model_input, original_rgb, prediction["predicted_index"]
            )
            gradcam_data_uri = array_to_base64(overlay)
        except Exception:  # noqa: BLE001 - Grad-CAM must never fail the request
            logger.exception(
                "Grad-CAM generation failed; continuing without it."
            )
            gradcam_data_uri = None

        # --- Step 11: processing time ---
        processing_time_ms = int((time.perf_counter() - start_time) * 1000)

        response_body: Dict[str, Any] = {
            "prediction": {
                "class": prediction["predicted_label"],
                "class_index": prediction["predicted_index"],
                "confidence": prediction["confidence"],
            },
            "risk": {
                "score": risk_score,
                "tier": risk_tier,
            },
            "recommendations": recommendations,
            "gradcam": gradcam_data_uri,
            "ood": prediction["ood"],
            "tta_applied": prediction["tta_applied"],
            "processing_time_ms": processing_time_ms,
        }

        logger.info("Prediction completed in %d ms.", processing_time_ms)

        return jsonify(to_python(response_body)), 200

    except Exception:  # noqa: BLE001 - top-level safety net for the pipeline
        logger.exception("Internal error during prediction pipeline.")
        return jsonify({"error": "Internal server error during prediction."}), 500


# =====================================================================
# MAIN BLOCK
# =====================================================================

if __name__ == "__main__":
    # debug=False is required to prevent Flask's reloader from
    # re-importing this module (and re-loading the CNN/MLP models) on
    # every code change. host="0.0.0.0" makes the server reachable
    # from outside localhost; port=5000 is the project's fixed port.
    app.run(host="0.0.0.0", port=5000, debug=False)