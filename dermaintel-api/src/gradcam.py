"""
DERMAINTEL — Grad-CAM Heatmap Generation
===========================================

Inference-only Grad-CAM for the trained ResNet50-based skin classifier.
The original model is never compiled, retrained, saved, or otherwise
modified — a temporary feature-extraction path is built internally
(sharing the same weights) purely to expose the target convolutional
layer's activations alongside the model's normal softmax output.

Handles both a flat architecture (target layer is a direct top-level layer
of `model`) and a one-level-nested architecture (e.g. a ResNet50 backbone
present as a single nested sub-model layer, as in DERMAINTEL's actual
saved model) — this was verified against the real trained model, since a
naive `Model(inputs=model.input, outputs=nested_layer.output)` reference
fails in current TensorFlow/Keras when the target layer belongs to a
nested sub-model rather than the top-level model itself.
"""

import cv2
import numpy as np
import tensorflow as tf

NUM_CLASSES = 4
TARGET_SIZE = (224, 224)
PREFERRED_LAYER_NAME = "conv5_block3_out"


def _validate_inputs(image_array, class_index):
    """Validate generate()'s image_array shape and class_index range."""
    expected_shape = (1,) + TARGET_SIZE + (3,)
    actual_shape = tuple(getattr(image_array, "shape", ()))
    if actual_shape != expected_shape:
        raise ValueError(
            f"image_array must have shape {expected_shape}, got {actual_shape or type(image_array)}."
        )
    if not isinstance(class_index, (int, np.integer)):
        raise ValueError(f"class_index must be an integer, got {type(class_index)}.")
    if not (0 <= class_index < NUM_CLASSES):
        raise ValueError(f"class_index must be in [0, {NUM_CLASSES - 1}], got {class_index}.")


def _find_layer_by_name(model, name):
    """
    Search for a layer named `name`, first at the top level of `model`,
    then one level into any nested sub-model/layer containers (e.g. a
    ResNet50 backbone present as a single nested Functional layer).

    Returns
    -------
    tuple or None
        (layer, container, index_in_container) if found, else None.
        `container` is whichever model/layer object directly owns `layer`
        in its own `.layers` list (this may be `model` itself, or a nested
        sub-model).
    """
    for i, layer in enumerate(model.layers):
        if layer.name == name:
            return layer, model, i

    for layer in model.layers:
        if hasattr(layer, "layers") and len(layer.layers) > 0:
            for i, sub_layer in enumerate(layer.layers):
                if sub_layer.name == name:
                    return sub_layer, layer, i

    return None


def _find_last_conv2d(model):
    """
    Fallback search: walk `model.layers` BACKWARDS looking for the last
    Conv2D-typed layer, recursing one level into any nested container
    encountered along the way.

    Returns
    -------
    tuple or None
        (layer, container, index_in_container) if a Conv2D layer is found,
        else None.
    """
    for layer in reversed(model.layers):
        if hasattr(layer, "layers") and len(layer.layers) > 0:
            for i in range(len(layer.layers) - 1, -1, -1):
                sub_layer = layer.layers[i]
                if isinstance(sub_layer, tf.keras.layers.Conv2D):
                    return sub_layer, layer, i
        if isinstance(layer, tf.keras.layers.Conv2D):
            return layer, model, model.layers.index(layer)

    return None


def _find_target_conv_layer(model):
    """
    Locate the layer Grad-CAM should read feature maps from: prefer a layer
    literally named 'conv5_block3_out' (searched at top level and one level
    of nesting); if not found, fall back to the last Conv2D-typed layer
    found by the same search strategy.

    Returns
    -------
    tuple
        (layer, container, index_in_container) — see _find_layer_by_name.

    Raises
    ------
    ValueError
        If neither search finds anything — i.e. no Conv2D layer exists
        anywhere in the model.
    """
    found = _find_layer_by_name(model, PREFERRED_LAYER_NAME)
    if found is not None:
        return found

    found = _find_last_conv2d(model)
    if found is not None:
        return found

    raise ValueError(
        f"No layer named '{PREFERRED_LAYER_NAME}' and no Conv2D layer found "
        "anywhere in the model (searched top-level layers and one level of "
        "nested sub-models). Grad-CAM requires at least one convolutional "
        "layer to read feature maps from."
    )


def generate(model, image_array, class_index):
    """
    Generate a normalized Grad-CAM heatmap for a single image and class.

    Parameters
    ----------
    model : tf.keras.Model
        The loaded, already-trained classifier (ResNet50 backbone -> GAP ->
        Dense(512) -> Dense(256) -> Dense(4, softmax)). Never modified,
        compiled, retrained, or saved by this function.
    image_array : np.ndarray or tf.Tensor
        A single already-preprocessed image, shape (1, 224, 224, 3).
    class_index : int
        Which of the 4 output classes to explain, in [0, 3].

    Returns
    -------
    np.ndarray
        A (224, 224) heatmap with values normalized to [0, 1]. Higher
        values indicate image regions that contributed more strongly to
        the prediction for `class_index`. This is the raw heatmap only —
        no overlay onto the original image is performed.

    Raises
    ------
    ValueError
        If no Conv2D layer exists in the model, if image_array's shape is
        not (1, 224, 224, 3), or if class_index is outside [0, 3].
    """
    _validate_inputs(image_array, class_index)
    target_layer, container, index_in_container = _find_target_conv_layer(model)

    # Build a feature-extraction path from the target layer's OWN container
    # input to its output. This stays within a single graph (no
    # cross-submodel splicing, which Keras does not support directly) —
    # works identically whether `container` is `model` itself or a nested
    # sub-model.
    container_input = model.input if container is model else container.input
    inner_extractor = tf.keras.models.Model(inputs=container_input, outputs=target_layer.output)

    # Layers still needed to reach the final softmax output, in order:
    # first any layers remaining inside the same container after the
    # target layer, then — if the container is itself a nested sub-model
    # rather than `model` — the top-level model's own layers that follow
    # the container.
    inner_tail = list(container.layers[index_in_container + 1:])
    if container is model:
        outer_tail = []
    else:
        container_index_in_model = model.layers.index(container)
        outer_tail = list(model.layers[container_index_in_model + 1:])
    remaining_layers = inner_tail + outer_tail

    image_tensor = tf.convert_to_tensor(image_array, dtype=tf.float32)

    with tf.GradientTape() as tape:
        conv_outputs = inner_extractor(image_tensor, training=False)
        tape.watch(conv_outputs)
        x = conv_outputs
        for layer in remaining_layers:
            x = layer(x, training=False)
        predictions = x
        # predictions: (1, 4) softmax probabilities. Isolate the score for
        # the class we're explaining.
        class_score = predictions[:, class_index]

    # Gradients of the target class's score w.r.t. the conv feature maps.
    # Shape: (1, H, W, C), same shape as conv_outputs.
    grads = tape.gradient(class_score, conv_outputs)
    if grads is None:
        raise ValueError(
            "Gradient computation returned None — the target layer's output "
            "is not connected to the model's prediction output in the "
            "computation graph."
        )

    # Pooled gradients: average each channel's gradient over the spatial
    # (height, width) dimensions -> one importance weight per channel.
    # Shape: (C,)
    pooled_grads = tf.reduce_mean(grads, axis=(0, 1, 2))

    # Drop the batch dimension from the feature maps -> (H, W, C)
    conv_outputs = conv_outputs[0]

    # Weight each of the C channels' feature map by its pooled-gradient
    # importance, then sum across channels -> a single (H, W) map.
    heatmap = tf.reduce_sum(conv_outputs * pooled_grads, axis=-1)

    # ReLU: keep only positive influence on the target class, per the
    # standard Grad-CAM formulation (negative influence isn't visualized).
    heatmap = tf.maximum(heatmap, 0)

    # Normalize to [0, 1]. Guard against an all-zero heatmap (would
    # otherwise divide by zero) with a small epsilon.
    max_value = tf.reduce_max(heatmap)
    heatmap = heatmap / (max_value + 1e-10)

    # Resize from the conv layer's native spatial resolution (e.g. 7x7 for
    # ResNet50's final block) up to the original 224x224 input resolution.
    heatmap = tf.image.resize(heatmap[..., tf.newaxis], TARGET_SIZE)
    heatmap = tf.squeeze(heatmap, axis=-1)

    return heatmap.numpy()


def _validate_overlay_inputs(original_image, heatmap, alpha):
    """Validate overlay_heatmap()'s image/heatmap shapes and alpha range."""
    expected_image_shape = TARGET_SIZE + (3,)
    actual_image_shape = tuple(getattr(original_image, "shape", ()))
    if not isinstance(original_image, np.ndarray):
        raise ValueError(f"original_image must be a NumPy array, got {type(original_image)}.")
    if actual_image_shape != expected_image_shape:
        raise ValueError(
            f"original_image must have shape {expected_image_shape}, got {actual_image_shape}."
        )

    if not isinstance(heatmap, np.ndarray):
        raise ValueError(f"heatmap must be a NumPy array, got {type(heatmap)}.")
    actual_heatmap_shape = tuple(heatmap.shape)
    if actual_heatmap_shape != TARGET_SIZE:
        raise ValueError(
            f"heatmap must have shape {TARGET_SIZE}, got {actual_heatmap_shape}."
        )

    if not isinstance(alpha, (int, float)):
        raise ValueError(f"alpha must be a number, got {type(alpha)}.")
    if not (0.0 <= alpha <= 1.0):
        raise ValueError(f"alpha must be in [0.0, 1.0], got {alpha}.")


def overlay_heatmap(original_image, heatmap, alpha=0.4):
    """
    Blend a normalized Grad-CAM heatmap onto the original RGB image.

    The heatmap is colorized with OpenCV's COLORMAP_JET and alpha-blended
    on top of the original image. This function performs no encoding,
    saving, or display — it only returns the blended array.

    Parameters
    ----------
    original_image : np.ndarray
        RGB image, shape (224, 224, 3). Expected in the typical [0, 255]
        uint8 (or equivalent float) range used for display/colorization.
    heatmap : np.ndarray
        Normalized Grad-CAM heatmap, shape (224, 224), values in [0, 1]
        (as produced by `generate()`).
    alpha : float, default 0.4
        Weight given to the colored heatmap in the blend, in [0.0, 1.0].
        The original image is weighted by (1 - alpha).

    Returns
    -------
    np.ndarray
        Blended RGB image, shape (224, 224, 3), dtype uint8.

    Raises
    ------
    ValueError
        If original_image is not shape (224, 224, 3), if heatmap is not
        shape (224, 224), or if alpha is outside [0.0, 1.0].
    """
    _validate_overlay_inputs(original_image, heatmap, alpha)

    # Scale the normalized [0, 1] heatmap to [0, 255] uint8 for colormap
    # lookup.
    heatmap_uint8 = np.uint8(np.clip(heatmap, 0.0, 1.0) * 255)

    # Apply the JET colormap. cv2.applyColorMap returns BGR; convert to RGB
    # so it matches the RGB original_image.
    colored_heatmap_bgr = cv2.applyColorMap(heatmap_uint8, cv2.COLORMAP_JET)
    colored_heatmap_rgb = cv2.cvtColor(colored_heatmap_bgr, cv2.COLOR_BGR2RGB)

    # Ensure the base image is uint8 before blending.
    base_image = np.uint8(np.clip(original_image, 0, 255))

    # Alpha-blend: heatmap weighted by alpha, original image by (1 - alpha).
    blended = cv2.addWeighted(colored_heatmap_rgb, alpha, base_image, 1 - alpha, 0)

    return blended


if __name__ == "__main__":
    # Minimal usage demonstration only — no real model is loaded and no
    # inference is executed. `model` and `image_array` below are
    # placeholders showing the expected call shape/order.

    # model = tf.keras.models.load_model("path/to/dermaintel_model.h5")
    # image_array = preprocess(image)  # shape (1, 224, 224, 3), float32

    model = None  # placeholder: a loaded tf.keras.Model would go here
    image_array = np.zeros((1, 224, 224, 3), dtype=np.float32)  # placeholder input
    class_index = 0  # placeholder: class to explain, in [0, 3]
    original_image = np.zeros((224, 224, 3), dtype=np.uint8)  # placeholder RGB image

    print("Example usage (not executed against a real model):")
    print("  heatmap = generate(model, image_array, class_index)")
    print("  overlaid = overlay_heatmap(original_image, heatmap, alpha=0.4)")
    print()
    print(f"  image_array shape   -> {image_array.shape}")
    print(f"  original_image shape-> {original_image.shape}")
    print(f"  class_index         -> {class_index}")
    print("\nTo actually run this: load a real trained model, preprocess a")
    print("real image to (1, 224, 224, 3), then call generate() followed")
    print("by overlay_heatmap() as shown above.")
