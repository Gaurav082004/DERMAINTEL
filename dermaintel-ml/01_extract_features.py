"""
DERMAINTEL — 01_extract_features.py
====================================

Extracts a 256-dimensional CNN feature vector for every unique image
referenced in synthetic_multimodal_dataset.csv, using the fc_256 layer of
the already-trained skin_model_final_v2.keras model.

This is INFERENCE ONLY. No training, no fine-tuning, no weight updates.

Image list source of truth
---------------------------
This script does NOT scan image folders independently. It reads
synthetic_multimodal_dataset.csv, takes the unique (Image_ID, Image_Path,
Disease_Class, Split) combinations (each image appears 8 times in that CSV,
once per environmental profile), and processes each real image exactly
once. Image_ID is preserved exactly as given, so this script's output joins
cleanly back onto the synthetic CSV on Image_ID.

Preprocessing (must match training exactly)
---------------------------------------------
  - Resize to 224x224
  - Normalize with img / 255.0
  - Do NOT use keras.applications.resnet50.preprocess_input()
  - Do NOT apply ImageNet mean/std normalization
"""

import os
from pathlib import Path

import numpy as np
import pandas as pd
from tensorflow import keras
from tensorflow.keras.preprocessing.image import load_img, img_to_array

# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------
MODEL_PATH = r"C:\Users\GAURAV\Major Project Code\ml\trial\trial2\skin_model_final_v3_TTA.keras"
SYNTHETIC_CSV_PATH = r"C:\Users\GAURAV\Downloads\dermaintel-synth-delivery\outputs\synthetic_multimodal_dataset.csv"
FEATURE_LAYER_NAME = "fc_256"
IMAGE_SIZE = (224, 224)
EXPECTED_FEATURE_DIM = 256

# If your Image_Path values in the CSV are relative (e.g. "data\\train\\Acne\\x.jpg"),
# they are resolved relative to this root. Leave as "" if the script is run
# from the same working directory the synthetic generator was run from.
IMAGE_ROOT = ""

OUTPUT_DIR = Path("outputs")
OUTPUT_CSV = OUTPUT_DIR / "cnn_features_256d_new.csv"
OUTPUT_NPY = OUTPUT_DIR / "cnn_features_256d_new.npy"


# ---------------------------------------------------------------------------
# STEP 1: Load the unique image list from the synthetic CSV
# ---------------------------------------------------------------------------

def load_unique_images(csv_path: str) -> pd.DataFrame:
    """
    Read synthetic_multimodal_dataset.csv and collapse it down to one row
    per real image (each image appears 8x in the source CSV, once per
    environmental profile). Image_ID is preserved exactly as-is — this
    script never generates its own IDs.
    """
    df = pd.read_csv(csv_path)

    required_cols = {"Image_ID", "Image_Path", "Disease_Class", "Split"}
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"synthetic CSV is missing expected columns: {missing}")

    unique_images = (
        df[["Image_ID", "Image_Path", "Disease_Class", "Split"]]
        .drop_duplicates(subset="Image_ID")
        .reset_index(drop=True)
    )

    # Sanity check: Image_ID should have been unique-per-image already (this
    # was validated when the CSV was generated), but confirm again here
    # since this script's correctness depends entirely on that being true.
    if unique_images["Image_ID"].duplicated().any():
        raise ValueError(
            "Duplicate Image_ID found after dropping duplicates — this should "
            "be impossible and indicates a corrupted source CSV."
        )

    return unique_images


def resolve_image_path(raw_path: str, image_root: str) -> Path:
    """
    Resolve a path string from the CSV to an actual file path. Backslashes
    are normalized to forward slashes first, since the CSV was generated on
    Windows (Image_Path values like "data\\train\\Acne\\x.jpg") but this
    script may run on Windows, macOS, or Linux — pathlib only auto-splits on
    the native separator, so a raw backslash string is NOT reliably portable
    as-is.
    """
    normalized = str(raw_path).replace("\\", "/")
    path = Path(normalized)
    if image_root:
        path = Path(image_root) / path
    return path


# ---------------------------------------------------------------------------
# STEP 2: Load the trained model and build the feature-extraction sub-model
# ---------------------------------------------------------------------------

def load_feature_extractor(model_path: str, layer_name: str) -> keras.Model:
    """
    Load the trained classifier and build a new Model whose output is the
    activations of `layer_name` (fc_256). This is inference-only — the
    original model's weights are reused as-is, nothing is retrained.
    """
    full_model = keras.models.load_model(model_path, compile=False)

    if layer_name not in [layer.name for layer in full_model.layers]:
        raise ValueError(
            f"Layer '{layer_name}' not found in the loaded model. "
            f"Available layers: {[l.name for l in full_model.layers]}"
        )

    feature_layer = full_model.get_layer(layer_name)
    feature_dim = feature_layer.output.shape[-1]
    if feature_dim != EXPECTED_FEATURE_DIM:
        raise ValueError(
            f"Layer '{layer_name}' outputs {feature_dim}-D, expected "
            f"{EXPECTED_FEATURE_DIM}-D. Aborting before extracting anything."
        )

    feature_extractor = keras.Model(
        inputs=full_model.input,
        outputs=feature_layer.output,
        name=f"{full_model.name}_feature_extractor",
    )
    return feature_extractor


# ---------------------------------------------------------------------------
# STEP 3: Image loading / preprocessing (must match training exactly)
# ---------------------------------------------------------------------------

def load_and_preprocess_image(image_path: Path, target_size: tuple) -> np.ndarray:
    """
    Load an image, resize to target_size, and normalize with /255.0 — the
    exact preprocessing used during training. Do NOT swap this for
    preprocess_input() or ImageNet mean/std normalization.
    """
    img = load_img(image_path, target_size=target_size)
    arr = img_to_array(img)
    arr = arr / 255.0
    return arr


# ---------------------------------------------------------------------------
# STEP 4: Run extraction over every unique image
# ---------------------------------------------------------------------------

def extract_all_features(
    unique_images: pd.DataFrame,
    feature_extractor: keras.Model,
    image_root: str,
    image_size: tuple,
) -> tuple:
    """
    Run the feature extractor over every unique image. Returns:
      - features: np.ndarray of shape (n_images, 256)
      - meta_df:  DataFrame with Image_ID / Image_Path / Split / Disease_Class,
                  same row order as `features`
      - failed:   list of (Image_ID, Image_Path, error_message) for any image
                  that could not be read/processed
    """
    features = []
    failed = []
    kept_rows = []

    n_total = len(unique_images)
    for i, row in unique_images.iterrows():
        resolved_path = resolve_image_path(row["Image_Path"], image_root)
        try:
            img_array = load_and_preprocess_image(resolved_path, image_size)
            batch = np.expand_dims(img_array, axis=0)  # (1, 224, 224, 3)
            feature_vector = feature_extractor.predict(batch, verbose=0)[0]
            features.append(feature_vector)
            kept_rows.append(row)
        except Exception as e:
            failed.append((row["Image_ID"], str(resolved_path), str(e)))

        if (i + 1) % 200 == 0 or (i + 1) == n_total:
            print(f"  Processed {i + 1}/{n_total} images...")

    features = np.array(features, dtype=np.float32)
    meta_df = pd.DataFrame(kept_rows).reset_index(drop=True)
    return features, meta_df, failed


# ---------------------------------------------------------------------------
# STEP 5: Validation
# ---------------------------------------------------------------------------

def validate_results(features: np.ndarray, meta_df: pd.DataFrame, failed: list) -> None:
    """Run the required checks and print a clear summary before saving."""
    print("\n" + "=" * 60)
    print("VALIDATION")
    print("=" * 60)

    n_images = len(meta_df)
    print(f"Images successfully processed : {n_images}")
    print(f"Images failed                 : {len(failed)}")
    if failed:
        print("  First few failures:")
        for image_id, path, err in failed[:5]:
            print(f"    - {image_id} ({path}): {err}")

    print(f"Final feature matrix shape    : {features.shape}")

    if features.shape[0] != n_images:
        raise ValueError(
            f"Feature matrix has {features.shape[0]} rows but metadata has "
            f"{n_images} rows — these must match 1:1."
        )

    if features.shape[1] != EXPECTED_FEATURE_DIM:
        raise ValueError(
            f"Feature vectors are {features.shape[1]}-D, expected "
            f"{EXPECTED_FEATURE_DIM}-D."
        )

    n_nan = np.isnan(features).sum()
    n_inf = np.isinf(features).sum()
    print(f"NaN values in feature matrix  : {n_nan}")
    print(f"Inf values in feature matrix  : {n_inf}")
    if n_nan > 0 or n_inf > 0:
        raise ValueError(
            f"Found {n_nan} NaN and {n_inf} Inf values in extracted features "
            f"— stopping before saving a corrupted feature file."
        )

    print("All checks passed.")
    print("=" * 60)


# ---------------------------------------------------------------------------
# STEP 6: Save outputs
# ---------------------------------------------------------------------------

def save_outputs(features: np.ndarray, meta_df: pd.DataFrame) -> None:
    """Save the feature matrix as .npy and a merged, human-readable .csv."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    np.save(OUTPUT_NPY, features)

    feature_cols = [f"feature_{i:03d}" for i in range(features.shape[1])]
    feature_df = pd.DataFrame(features, columns=feature_cols)

    out_df = pd.concat(
        [meta_df[["Image_ID", "Image_Path", "Split", "Disease_Class"]], feature_df],
        axis=1,
    )
    out_df.to_csv(OUTPUT_CSV, index=False)

    print(f"\nSaved: {OUTPUT_NPY.resolve()}  (shape {features.shape})")
    print(f"Saved: {OUTPUT_CSV.resolve()}  ({len(out_df)} rows)")


# ---------------------------------------------------------------------------
# ENTRY POINT
# ---------------------------------------------------------------------------

def main():
    print("Loading unique image list from synthetic CSV...")
    unique_images = load_unique_images(SYNTHETIC_CSV_PATH)
    print(f"  {len(unique_images)} unique images found "
          f"(from {len(unique_images) * 8} total profile rows expected).\n")

    print(f"Loading model: {MODEL_PATH}")
    feature_extractor = load_feature_extractor(MODEL_PATH, FEATURE_LAYER_NAME)
    print(f"  Feature extractor ready. Output layer: '{FEATURE_LAYER_NAME}' "
          f"-> {feature_extractor.output.shape}\n")

    print("Extracting features (inference only, no training)...")
    features, meta_df, failed = extract_all_features(
        unique_images, feature_extractor, IMAGE_ROOT, IMAGE_SIZE
    )

    validate_results(features, meta_df, failed)
    save_outputs(features, meta_df)


if __name__ == "__main__":
    main()
