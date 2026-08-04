"""
DERMAINTEL — 02_merge_multimodal_dataset.py
==============================================

Merges cnn_features_256d.csv (one row per unique image) with
synthetic_multimodal_dataset.csv (eight rows per image, one per
environmental profile) into a single training-ready dataset.

This script ONLY merges and validates. No MLP training, no feature
averaging, no dropping of environmental profiles. Every row in the
synthetic dataset survives the merge, each one gaining the same 256-D
CNN feature vector for its parent image.
"""

import sys
from pathlib import Path

import numpy as np
import pandas as pd

# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------

FEATURES_CSV = r"C:\Users\GAURAV\Downloads\dermaintel-synth-delivery\outputs\cnn_features_256d_new.csv"
SYNTHETIC_CSV = r"C:\Users\GAURAV\Downloads\dermaintel-synth-delivery\outputs\synthetic_multimodal_dataset.csv"

EXPECTED_FEATURE_DIM = 256
EXPECTED_FEATURE_COLS = [f"feature_{i:03d}" for i in range(EXPECTED_FEATURE_DIM)]

OUTPUT_DIR = Path("outputs")
OUTPUT_CSV = OUTPUT_DIR / "merged_multimodal_dataset.csv"


# ---------------------------------------------------------------------------
# STEP 1-2: LOAD
# ---------------------------------------------------------------------------

def load_csv_or_exit(path: str, label: str) -> pd.DataFrame:
    """Load a CSV, or stop execution with a clear message if it's missing."""
    if not Path(path).exists():
        print(f"ERROR: {label} not found at '{path}'.")
        print(f"  Fix: run this script from the same directory as '{path}', "
              f"or update the path at the top of this script.")
        sys.exit(1)
    return pd.read_csv(path)


# ---------------------------------------------------------------------------
# STEP 3-4: VERIFY Image_ID EXISTS AND IS UNIQUE IN THE FEATURE CSV
# ---------------------------------------------------------------------------

def verify_image_id_column(df: pd.DataFrame, label: str) -> None:
    """Verify Image_ID exists in the given dataframe, or stop execution."""
    if "Image_ID" not in df.columns:
        print(f"ERROR: 'Image_ID' column not found in {label}.")
        print(f"  Columns present: {df.columns.tolist()}")
        sys.exit(1)


def verify_feature_ids_unique(feature_df: pd.DataFrame) -> None:
    """
    Verify Image_ID is unique in the feature CSV — this is a hard
    requirement for a clean one-to-many merge. If violated, the merge
    would silently multiply rows beyond the expected 8-per-image.
    """
    n_duplicates = feature_df["Image_ID"].duplicated().sum()
    if n_duplicates > 0:
        dupes = feature_df.loc[feature_df["Image_ID"].duplicated(keep=False), "Image_ID"].unique()
        print(f"ERROR: {n_duplicates} duplicate Image_ID row(s) found in {FEATURES_CSV}.")
        print(f"  Duplicated IDs (first 10): {sorted(dupes)[:10]}")
        print("  Cause: 01_extract_features.py was likely run more than once "
              "and results were appended instead of overwritten.")
        print("  Fix: regenerate cnn_features_256d.csv from a clean outputs/ folder.")
        sys.exit(1)


# ---------------------------------------------------------------------------
# STEP 3 (cont'd): VERIFY Image_ID MATCHING BETWEEN THE TWO DATASETS
# ---------------------------------------------------------------------------

def verify_image_id_matching(synthetic_df: pd.DataFrame, feature_df: pd.DataFrame) -> None:
    """
    Verify every Image_ID in the synthetic dataset has a matching feature
    vector, and that the feature CSV contains no unexpected extra IDs.
    Stops execution and prints the offending IDs if either check fails.
    """
    synthetic_ids = set(synthetic_df["Image_ID"].unique())
    feature_ids = set(feature_df["Image_ID"].unique())

    missing_from_features = synthetic_ids - feature_ids
    extra_in_features = feature_ids - synthetic_ids

    if missing_from_features or extra_in_features:
        print("ERROR: Image_ID mismatch between synthetic dataset and feature CSV.")
        if missing_from_features:
            sample = sorted(missing_from_features)[:20]
            print(f"\n  {len(missing_from_features)} Image_ID(s) in {SYNTHETIC_CSV} "
                  f"have NO matching feature vector in {FEATURES_CSV}:")
            print(f"    {sample}")
        if extra_in_features:
            sample = sorted(extra_in_features)[:20]
            print(f"\n  {len(extra_in_features)} Image_ID(s) in {FEATURES_CSV} "
                  f"do not correspond to any image in {SYNTHETIC_CSV}:")
            print(f"    {sample}")
        print("\n  Fix: regenerate whichever file is out of date so both scripts "
              "are working from the same set of images, then re-run this script.")
        sys.exit(1)


# ---------------------------------------------------------------------------
# STEP 5-7: MERGE
# ---------------------------------------------------------------------------

def merge_datasets(synthetic_df: pd.DataFrame, feature_df: pd.DataFrame) -> pd.DataFrame:
    """
    One-to-many merge on Image_ID: every synthetic row (one per
    environmental profile) is kept, and gains its parent image's 256-D
    feature vector. Only Image_ID + the 256 feature_* columns are pulled
    from feature_df — its own Image_Path/Split/Disease_Class copies are
    intentionally NOT brought in, since the synthetic dataset's copies of
    those columns are already the validated source of truth and merging
    both would create duplicate/suffixed columns.
    """
    feature_cols_only = feature_df[["Image_ID"] + EXPECTED_FEATURE_COLS]

    merged = pd.merge(
        synthetic_df,
        feature_cols_only,
        on="Image_ID",
        how="left",  # preserve every synthetic row, per spec
        validate="many_to_one",  # pandas itself enforces feature_df's Image_ID uniqueness here too
    )
    return merged


# ---------------------------------------------------------------------------
# VALIDATION: ROW COUNT
# ---------------------------------------------------------------------------

def validate_row_count(merged_df: pd.DataFrame, synthetic_df: pd.DataFrame) -> None:
    if len(merged_df) != len(synthetic_df):
        print(f"ERROR: Merged row count ({len(merged_df)}) does not equal "
              f"synthetic dataset row count ({len(synthetic_df)}).")
        print("  Cause: the merge likely produced extra rows, which would mean "
              "Image_ID was not actually unique in the feature CSV despite the "
              "earlier check (or a bug in this script). This should not happen.")
        sys.exit(1)


# ---------------------------------------------------------------------------
# VALIDATION: FEATURE COLUMNS
# ---------------------------------------------------------------------------

def validate_feature_columns(merged_df: pd.DataFrame) -> None:
    """Verify exactly 256 feature columns exist, in the correct order, no duplicates."""
    present_feature_cols = [c for c in merged_df.columns if c.startswith("feature_")]

    if len(present_feature_cols) != EXPECTED_FEATURE_DIM:
        print(f"ERROR: Expected exactly {EXPECTED_FEATURE_DIM} feature columns, "
              f"found {len(present_feature_cols)}.")
        sys.exit(1)

    if present_feature_cols != EXPECTED_FEATURE_COLS:
        print("ERROR: Feature columns are not in the expected feature_000...feature_255 order.")
        print(f"  Found order (first 5): {present_feature_cols[:5]}")
        sys.exit(1)

    if merged_df.columns.duplicated().any():
        dupe_cols = merged_df.columns[merged_df.columns.duplicated()].tolist()
        print(f"ERROR: Duplicate columns created during merge: {dupe_cols}")
        sys.exit(1)


# ---------------------------------------------------------------------------
# VALIDATION: MISSING VALUES
# ---------------------------------------------------------------------------

def validate_missing_values(merged_df: pd.DataFrame) -> int:
    """
    Check the full merged dataset for NaN and Inf values. Reports locations
    if found. Returns the total count found (0 if clean).
    """
    numeric_df = merged_df.select_dtypes(include=[np.number])

    nan_mask = numeric_df.isna()
    inf_mask = numeric_df.apply(np.isinf)

    n_nan = nan_mask.values.sum()
    n_inf = inf_mask.values.sum()

    if n_nan > 0:
        rows, cols = np.where(nan_mask.values)
        col_names = numeric_df.columns[cols]
        print(f"  WARNING: {n_nan} NaN value(s) found.")
        for r, c in list(zip(rows, col_names))[:10]:
            print(f"    Row {r}, Column '{c}'")

    if n_inf > 0:
        rows, cols = np.where(inf_mask.values)
        col_names = numeric_df.columns[cols]
        print(f"  WARNING: {n_inf} Inf value(s) found.")
        for r, c in list(zip(rows, col_names))[:10]:
            print(f"    Row {r}, Column '{c}'")

    return int(n_nan + n_inf)


# ---------------------------------------------------------------------------
# DATASET INTEGRITY SUMMARY
# ---------------------------------------------------------------------------

def print_dataset_integrity(merged_df: pd.DataFrame) -> None:
    print("\n--- Dataset Integrity ---")
    print(f"  Number of rows              : {len(merged_df)}")
    print(f"  Number of columns           : {len(merged_df.columns)}")

    n_unique_images = merged_df["Image_ID"].nunique()
    print(f"  Number of unique images     : {n_unique_images}")

    profiles_per_image = merged_df.groupby("Image_ID").size()
    print(f"  Environmental profiles/image: {profiles_per_image.min()}"
          + (f"-{profiles_per_image.max()}" if profiles_per_image.min() != profiles_per_image.max() else "")
          + f" (expected 8)")

    unique_images_df = merged_df.drop_duplicates(subset="Image_ID")
    print("\n  Images per disease:")
    print(unique_images_df["Disease_Class"].value_counts().to_string())

    print("\n  Images per split:")
    print(unique_images_df["Split"].value_counts().to_string())

    mem_bytes = merged_df.memory_usage(deep=True).sum()
    print(f"\n  Memory usage                : {mem_bytes / (1024 ** 2):.2f} MB")


# ---------------------------------------------------------------------------
# RISK STATISTICS
# ---------------------------------------------------------------------------

def print_risk_statistics(merged_df: pd.DataFrame) -> None:
    print("\n--- Risk Statistics (target column: Risk_Score) ---")
    if "Risk_Score" not in merged_df.columns:
        print("  WARNING: 'Risk_Score' column not found — target was NOT preserved correctly.")
        return
    rs = merged_df["Risk_Score"]
    print(f"  Minimum : {rs.min():.4f}")
    print(f"  Maximum : {rs.max():.4f}")
    print(f"  Mean    : {rs.mean():.4f}")
    print(f"  Std Dev : {rs.std():.4f}")


# ---------------------------------------------------------------------------
# FINAL REPORT
# ---------------------------------------------------------------------------

def print_final_report(
    synthetic_rows: int,
    feature_rows: int,
    merged_rows: int,
    unique_images: int,
    missing_images: int,
    duplicate_ids: int,
    nan_values: int,
) -> bool:
    ready = (
        merged_rows == synthetic_rows
        and missing_images == 0
        and duplicate_ids == 0
        and nan_values == 0
    )
    print("\n" + "=" * 43)
    print("MERGE COMPLETED SUCCESSFULLY" if ready else "MERGE COMPLETED WITH ISSUES")
    print("=" * 43)
    print(f"\nSynthetic Rows          : {synthetic_rows}")
    print(f"Feature Rows            : {feature_rows}")
    print(f"Merged Rows             : {merged_rows}")
    print(f"Unique Images           : {unique_images}")
    print(f"Feature Columns         : {EXPECTED_FEATURE_DIM}")
    print(f"Missing Images          : {missing_images}")
    print(f"Duplicate IDs           : {duplicate_ids}")
    print(f"NaN Values              : {nan_values}")
    print(f"\nReady for MLP Training  : {'YES' if ready else 'NO'}")
    print("=" * 43)
    return ready


# ---------------------------------------------------------------------------
# ENTRY POINT
# ---------------------------------------------------------------------------

def main():
    print("Loading datasets...")
    feature_df = load_csv_or_exit(FEATURES_CSV, "CNN feature CSV")
    synthetic_df = load_csv_or_exit(SYNTHETIC_CSV, "synthetic multimodal dataset CSV")
    print(f"  {FEATURES_CSV}   : {len(feature_df)} rows")
    print(f"  {SYNTHETIC_CSV}  : {len(synthetic_df)} rows")

    print("\nValidating Image_ID before merging...")
    verify_image_id_column(feature_df, FEATURES_CSV)
    verify_image_id_column(synthetic_df, SYNTHETIC_CSV)
    verify_feature_ids_unique(feature_df)
    verify_image_id_matching(synthetic_df, feature_df)
    print("  Image_ID checks passed.")

    print("\nMerging (one-to-many on Image_ID)...")
    merged_df = merge_datasets(synthetic_df, feature_df)

    print("\nValidating merge result...")
    validate_row_count(merged_df, synthetic_df)
    validate_feature_columns(merged_df)
    nan_inf_count = validate_missing_values(merged_df)
    if nan_inf_count == 0:
        print("  No NaN or Inf values found.")

    print_dataset_integrity(merged_df)
    print_risk_statistics(merged_df)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    merged_df.to_csv(OUTPUT_CSV, index=False)
    print(f"\nSaved: {OUTPUT_CSV.resolve()}")

    ready = print_final_report(
        synthetic_rows=len(synthetic_df),
        feature_rows=len(feature_df),
        merged_rows=len(merged_df),
        unique_images=merged_df["Image_ID"].nunique(),
        missing_images=0,  # verify_image_id_matching already stopped execution otherwise
        duplicate_ids=0,   # verify_feature_ids_unique already stopped execution otherwise
        nan_values=nan_inf_count,
    )
    sys.exit(0 if ready else 1)


if __name__ == "__main__":
    main()
