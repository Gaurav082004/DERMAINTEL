"""
DERMAINTEL API - Image Preprocessing Module
=============================================

This module is responsible for ONE thing only: converting raw uploaded
image bytes into the exact tensor format expected by the trained CNN.

This module intentionally does NOT:
    - Load any ML models
    - Perform CNN inference
    - Perform MLP inference
    - Implement Flask routes
    - Implement Grad-CAM
    - Implement out-of-distribution (OOD) detection

=====================================================================
WHY NORMALIZATION IS ONLY "divide by 255.0"
=====================================================================
The CNN backing this API was trained using Pillow-loaded RGB images
that were rescaled with a SINGLE operation: pixel_value / 255.0. This
maps the raw 0-255 uint8 pixel range into a normalized [0, 1] float32
range and nothing else was done to the pixels during training.

Because the model was trained this way, inference-time preprocessing
MUST match training-time preprocessing exactly, or predictions will be
invalid. Specifically, this module must NEVER apply ImageNet-style
preprocessing (e.g., ``keras.applications.resnet50.preprocess_input``),
per-channel mean subtraction, or standard-deviation scaling. Those
techniques assume a different training pipeline (typically transfer
learning from ImageNet-pretrained backbones) and would silently shift
the input distribution the CNN was never trained to see, degrading or
invalidating every prediction.

IMAGE_SIZE and RESCALE are NOT hardcoded in this module. They are
imported from the centralized project configuration (config.py) so
that there is a single source of truth for these values across the
entire API.
"""

from io import BytesIO
from typing import Dict, Union

import numpy as np
from PIL import Image, UnidentifiedImageError

from config import IMAGE_SIZE, RESCALE

# Type alias for the accepted raw image input.
ImageBytesInput = Union[bytes, BytesIO]


# =====================================================================
# HELPER FUNCTION: load_image
# =====================================================================

def load_image(image_bytes: ImageBytesInput) -> Image.Image:
    """
    Open raw uploaded image bytes using Pillow and validate that the
    upload is a real, readable image.

    This function accepts either raw ``bytes`` or a ``BytesIO`` stream
    so the API can remain stateless -- no file paths are required or
    accepted.

    Args:
        image_bytes: Raw image data as ``bytes`` or a ``BytesIO`` stream
            (e.g., taken directly from an uploaded file in memory).

    Returns:
        PIL.Image.Image: The opened (but not yet converted/resized) image.

    Raises:
        ValueError: If the provided data is not a valid, readable image.
    """
    # Normalize input into a BytesIO stream so Pillow can read it
    # regardless of whether the caller passed raw bytes or a stream.
    if isinstance(image_bytes, bytes):
        stream = BytesIO(image_bytes)
    elif isinstance(image_bytes, BytesIO):
        stream = image_bytes
    else:
        raise ValueError(
            "Invalid input type for image data: expected 'bytes' or "
            "'BytesIO', got "
            f"'{type(image_bytes).__name__}'."
        )

    try:
        image = Image.open(stream)
        # .load() forces Pillow to actually read the pixel data now,
        # rather than lazily, so corrupted/truncated images are caught
        # here instead of failing later during resize/convert.
        image.load()
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        # Collapse any obscure Pillow exception into one clear,
        # predictable error message for callers of this module.
        raise ValueError(
            "Uploaded file is not a valid or is a corrupted image. "
            "Please upload a valid image file (e.g., JPEG, PNG)."
        ) from exc

    return image


# =====================================================================
# HELPER FUNCTION: convert_to_rgb
# =====================================================================

def convert_to_rgb(image: Image.Image) -> Image.Image:
    """
    Convert an image of any Pillow-supported mode into a standard
    3-channel RGB image.

    This correctly handles:
        - Grayscale images (mode "L", "1", "I", etc.)
        - RGBA images (mode "RGBA") -- alpha channel is dropped
        - Palette-based PNGs with transparency (mode "P")
        - Any other Pillow mode via a generic ``.convert("RGB")`` call

    Args:
        image: A Pillow Image object in any mode.

    Returns:
        PIL.Image.Image: The image converted to mode "RGB" (exactly
        3 channels).
    """
    # Pillow's .convert("RGB") transparently handles grayscale, RGBA,
    # and palette-based (mode "P") images -- including PNGs with
    # transparency, which get flattened onto an opaque background
    # equivalent as part of the RGB conversion. This guarantees the
    # output always has exactly 3 channels regardless of input mode.
    if image.mode != "RGB":
        image = image.convert("RGB")

    return image


# =====================================================================
# HELPER FUNCTION: resize_image
# =====================================================================

def resize_image(image: Image.Image) -> Image.Image:
    """
    Resize an RGB image to the configured model input size using
    bicubic interpolation.

    Args:
        image: A Pillow Image object already converted to RGB.

    Returns:
        PIL.Image.Image: The resized RGB image, with dimensions equal
        to ``config.IMAGE_SIZE``.
    """
    # IMAGE_SIZE is imported from config.py (single source of truth)
    # rather than hardcoded here.
    resized = image.resize(IMAGE_SIZE, resample=Image.BICUBIC)
    return resized


# =====================================================================
# HELPER FUNCTION: normalize_image
# =====================================================================

def normalize_image(image_array: np.ndarray) -> np.ndarray:
    """
    Normalize a uint8 RGB pixel array into a float32 array in the
    [0, 1] range by dividing by the configured RESCALE-inverse factor.

    IMPORTANT: This performs ONLY the rescaling operation the CNN was
    trained with (pixel_value * RESCALE, where RESCALE == 1/255.0).
    It intentionally does NOT perform any ImageNet-style preprocessing,
    mean subtraction, or standard-deviation scaling -- see the module
    docstring for why that would be incorrect for this model.

    Args:
        image_array: A NumPy array of shape (224, 224, 3), dtype
            uint8, with pixel values in [0, 255].

    Returns:
        np.ndarray: A NumPy array of the same shape, dtype float32,
        with pixel values in [0, 1].
    """
    # RESCALE is imported from config.py (single source of truth)
    # rather than hardcoded here. RESCALE == 1.0 / 255.0.
    normalized = image_array.astype(np.float32) * np.float32(RESCALE)
    return normalized


# =====================================================================
# HELPER FUNCTION: prepare_for_model
# =====================================================================

def prepare_for_model(normalized_array: np.ndarray) -> np.ndarray:
    """
    Add the batch dimension to a normalized image array so it matches
    the CNN's expected input tensor shape.

    Args:
        normalized_array: A NumPy array of shape (224, 224, 3), dtype
            float32, with pixel values in [0, 1].

    Returns:
        np.ndarray: A NumPy array of shape (1, 224, 224, 3), dtype
        float32.
    """
    batched = np.expand_dims(normalized_array, axis=0)
    return batched


# =====================================================================
# INTERNAL VALIDATION HELPERS
# =====================================================================

def _validate_original_rgb(original_rgb: np.ndarray) -> None:
    """
    Defensively validate the pre-normalization RGB array that will be
    used later for Grad-CAM overlays.

    Args:
        original_rgb: NumPy array expected to be (224, 224, 3), uint8.

    Raises:
        ValueError: If any of the expected properties do not hold.
    """
    expected_shape = (IMAGE_SIZE[0], IMAGE_SIZE[1], 3)

    if original_rgb.shape != expected_shape:
        raise ValueError(
            "Preprocessing validation failed: 'original_rgb' has shape "
            f"{original_rgb.shape}, expected {expected_shape}."
        )

    if original_rgb.dtype != np.uint8:
        raise ValueError(
            "Preprocessing validation failed: 'original_rgb' has dtype "
            f"{original_rgb.dtype}, expected uint8."
        )

    if original_rgb.min() < 0 or original_rgb.max() > 255:
        raise ValueError(
            "Preprocessing validation failed: 'original_rgb' pixel "
            "values are outside the expected [0, 255] range."
        )


def _validate_model_input(model_input: np.ndarray) -> None:
    """
    Defensively validate the final batched, normalized tensor that
    will be fed to the CNN.

    Args:
        model_input: NumPy array expected to be (1, 224, 224, 3),
            float32, with values in [0, 1].

    Raises:
        ValueError: If any of the expected properties do not hold.
    """
    expected_shape = (1, IMAGE_SIZE[0], IMAGE_SIZE[1], 3)

    if model_input.shape != expected_shape:
        raise ValueError(
            "Preprocessing validation failed: 'model_input' has shape "
            f"{model_input.shape}, expected {expected_shape}."
        )

    if model_input.dtype != np.float32:
        raise ValueError(
            "Preprocessing validation failed: 'model_input' has dtype "
            f"{model_input.dtype}, expected float32."
        )

    if model_input.min() < 0.0 or model_input.max() > 1.0:
        raise ValueError(
            "Preprocessing validation failed: 'model_input' pixel "
            "values are outside the expected [0, 1] range."
        )


# =====================================================================
# MAIN PUBLIC FUNCTION: preprocess
# =====================================================================

def preprocess(image_bytes: ImageBytesInput) -> Dict[str, np.ndarray]:
    """
    Convert raw uploaded image bytes into the exact input format
    expected by the trained CNN, while also preserving an
    un-normalized copy of the resized image for later use (e.g.,
    Grad-CAM overlays).

    Pipeline (executed in this exact order):
        1. Open and validate the image with Pillow.
        2. Convert the image to RGB (3 channels), handling grayscale,
           RGBA, and palette/transparent PNGs correctly.
        3. Resize the image to ``config.IMAGE_SIZE`` using bicubic
           interpolation.
        4. Preserve a uint8 (H, W, 3) copy of the resized RGB image,
           BEFORE normalization, for downstream Grad-CAM use.
        5. Convert the resized image to a NumPy array.
        6. Normalize pixel values by multiplying by ``config.RESCALE``
           (i.e., dividing by 255.0) ONLY -- no ImageNet preprocessing,
           no mean subtraction, no standard deviation scaling.
        7. Cast the normalized array to float32.
        8. Add a batch dimension, producing shape (1, H, W, 3).

    This function does NOT load any models, run any inference, save
    any files to disk, or return any file paths. It is fully stateless.

    Args:
        image_bytes: Raw uploaded image data as ``bytes`` or a
            ``BytesIO`` stream.

    Returns:
        Dict[str, np.ndarray]: A dictionary with two keys:
            - "original_rgb": np.ndarray, shape (224, 224, 3),
              dtype uint8, pixel range [0, 255]. Intended for later
              Grad-CAM overlay rendering.
            - "model_input": np.ndarray, shape (1, 224, 224, 3),
              dtype float32, pixel range [0, 1]. Ready to be passed
              directly to the CNN for inference.

    Raises:
        ValueError: If the uploaded data is not a valid image, or if
            any defensive validation check fails after processing.
    """
    # Step 1 & 2: Open and validate the image.
    image = load_image(image_bytes)

    # Step 3: Convert to RGB (handles grayscale / RGBA / palette+alpha).
    rgb_image = convert_to_rgb(image)

    # Step 4: Resize to the configured model input size.
    resized_image = resize_image(rgb_image)

    # Step 5: Preserve a copy of the resized RGB image BEFORE
    # normalization, for later Grad-CAM overlay use. This array is
    # uint8 with pixel values in [0, 255].
    original_rgb = np.array(resized_image, dtype=np.uint8)

    # Step 6: Convert the (same) resized image to NumPy for the model
    # input pipeline.
    image_array = np.array(resized_image)

    # Step 7: Normalize pixels using ONLY the configured RESCALE factor
    # (pixel_value * RESCALE, where RESCALE == 1/255.0). No ImageNet
    # preprocessing, mean subtraction, or std-dev scaling is applied.
    normalized_array = normalize_image(image_array)

    # Step 8: Cast to float32 (normalize_image already returns
    # float32, but this is made explicit for clarity/safety) and add
    # the batch dimension.
    normalized_array = normalized_array.astype(np.float32)
    model_input = prepare_for_model(normalized_array)

    # Defensive validation of both outputs before returning.
    _validate_original_rgb(original_rgb)
    _validate_model_input(model_input)

    return {
        "original_rgb": original_rgb,
        "model_input": model_input,
    }