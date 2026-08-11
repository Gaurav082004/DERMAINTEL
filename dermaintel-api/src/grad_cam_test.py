"""
generate_gradcam_figures.py
==========================

Generates Fig. 5 for the DERMAINTEL paper.
Uses the project's existing gradcam.py (generate + overlay_heatmap).

Run with:
    python generate_gradcam_figures.py
"""

import os
import sys

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from PIL import Image
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras.applications.resnet50 import preprocess_input

# Import the project's existing Grad-CAM module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))
import gradcam  # Uses your actual gradcam.py: generate() + overlay_heatmap()


# ===================================================================
# CONFIG: UPDATE THESE PATHS
# ===================================================================

# TODO: Replace with 4 real test image paths (one per class recommended)
IMAGE_PATHS = [
    r"C:\Users\GAURAV\Major Project Code\ml\data\final\test\acne\7e7bc824b57675c0ccea09d48a46f038.jpg",      # TODO
    r"C:\Users\GAURAV\Major Project Code\ml\data\final\test\alopecia\1324__WatermarkedWyJXYXRlcm1hcmtlZCJd_jpg.rf.f8YezYjcunnaoCXQd76f.jpg",  # TODO
    r"C:\Users\GAURAV\Major Project Code\ml\data\final\test\eczema\eczema-face-10.jpg",  # TODO
    r"C:\Users\GAURAV\Major Project Code\ml\data\final\test\healthy\healthy_316.jpg",    # TODO
]

MODEL_PATH = r"C:\Users\GAURAV\OneDrive\Desktop\Major Project Git\DERMAINTEL\dermaintel-api\artifacts\skin_model_final_v3_TTA.keras"  # TODO: update if different
OUTPUT_PATH = "fig5_gradcam_examples.png"

CLASS_NAMES = ["Acne", "Eczema", "Alopecia", "Healthy Skin"]


# ===================================================================
# HELPERS
# ===================================================================

def load_original(image_path):
    """Load original image for display. Returns uint8 array (224, 224, 3)."""
    img = Image.open(image_path).convert("RGB").resize(gradcam.TARGET_SIZE)
    return np.array(img, dtype=np.uint8)


def preprocess_for_model(image_path):
    """
    Preprocess image exactly as your API does.
    Returns float32 array of shape (1, 224, 224, 3).
    """
    img = Image.open(image_path).convert("RGB").resize(gradcam.TARGET_SIZE)
    arr = np.array(img, dtype=np.float32)
    arr = preprocess_input(arr)  # ImageNet mean/std subtraction
    return np.expand_dims(arr, axis=0)


# ===================================================================
# MAIN PIPELINE
# ===================================================================

def process_single(model, image_path):
    """
    Returns dict with: original, overlay, pred_class, confidence
    """
    original = load_original(image_path)
    input_tensor = preprocess_for_model(image_path)

    # Predict
    preds = model.predict(input_tensor, verbose=0)
    pred_idx = int(np.argmax(preds[0]))
    confidence = float(preds[0][pred_idx]) * 100.0

    # Grad-CAM using YOUR gradcam.py
    heatmap = gradcam.generate(model, input_tensor, pred_idx)
    overlay = gradcam.overlay_heatmap(original, heatmap, alpha=0.4)

    pred_class = CLASS_NAMES[pred_idx] if pred_idx < len(CLASS_NAMES) else f"Class {pred_idx}"

    return {
        "original": original,
        "overlay": overlay,
        "pred_class": pred_class,
        "confidence": confidence,
    }


def build_figure(results):
    """Build single 2x2 composite figure for the paper."""
    fig, axes = plt.subplots(2, 2, figsize=(8, 8))
    axes = axes.flatten()

    for i, (res, ax) in enumerate(zip(results, axes)):
        ax.imshow(res["overlay"])
        ax.set_title(
            f"{res['pred_class']} ({res['confidence']:.1f}%)",
            fontsize=11,
            fontweight='bold'
        )
        ax.axis("off")

    # Hide any empty subplots
    for j in range(len(results), len(axes)):
        axes[j].axis("off")

    plt.tight_layout()
    fig.savefig(OUTPUT_PATH, dpi=300, bbox_inches="tight", pad_inches=0.1)
    plt.close(fig)
    print(f"\nSaved: {OUTPUT_PATH}")


def main():
    # Validate paths
    for p in IMAGE_PATHS:
        if not os.path.exists(p):
            print(f"ERROR: File not found: {p}")
            return

    if not os.path.exists(MODEL_PATH):
        print(f"ERROR: Model not found: {MODEL_PATH}")
        return

    print(f"Loading model: {MODEL_PATH}")
    model = keras.models.load_model(MODEL_PATH)
    print("Model loaded.\n")

    results = []
    for i, img_path in enumerate(IMAGE_PATHS, 1):
        print(f"Processing {i}/4: {img_path}")
        try:
            res = process_single(model, img_path)
            print(f"  -> {res['pred_class']} ({res['confidence']:.2f}%)")
            results.append(res)
        except Exception as e:
            print(f"  -> FAILED: {e}")

    if not results:
        print("No images processed. Aborting.")
        return

    build_figure(results)
    print("Done.")


if __name__ == "__main__":
    main()