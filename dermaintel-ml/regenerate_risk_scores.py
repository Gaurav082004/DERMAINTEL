"""
DERMAINTEL — Regenerate Risk_Score on the existing merged dataset
====================================================================

This script does NOT touch the 256 CNN feature columns, does NOT re-sample
any environmental variable, and does NOT re-run image discovery. It takes
the already-merged `merged_multimodal_dataset.csv` (which already carries
the literature-sampled Temperature / Humidity / UV_Index / AQI_PM25 /
Stress values and the CNN feature vectors) and recomputes ONLY the
risk-score-related columns using the corrected 0-100 formula defined in
`generate_synthetic_metadata.py`:

    Stress_Score, AQI_Score, UV_Score, Temperature_Score, Humidity_Score,
    Lifestyle_Score, Environmental_Score, Risk_Score, Risk_Score_Display

Every other column (Split, Image_ID, Disease_Class, the raw environmental
values, Disease_Multiplier, and all 256 feature_* columns) is copied
through unchanged.

Usage:
    python regenerate_risk_scores.py \
        --input merged_multimodal_dataset.csv \
        --output merged_multimodal_dataset_v2.csv
"""

import argparse

import numpy as np
import pandas as pd

import generate_synthetic_metadata as gsm


def regenerate(input_path: str, output_path: str) -> pd.DataFrame:
    df = pd.read_csv(input_path)

    required = ["Disease_Class", "Temperature", "Humidity", "UV_Index", "AQI_PM25", "Stress_Penalty"]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ValueError(f"Input dataset is missing required columns: {missing}")

    is_healthy = df["Disease_Class"] == "Healthy"

    stress_score = df["Stress_Penalty"].apply(gsm.compute_stress_score)
    aqi_score = df["AQI_PM25"].apply(gsm.compute_aqi_score)
    uv_score = df["UV_Index"].apply(gsm.compute_uv_score)
    temperature_score = df["Temperature"].apply(gsm.compute_temperature_score)
    humidity_score = df["Humidity"].apply(gsm.compute_humidity_score)

    lifestyle_score = stress_score.copy()
    environmental_score = aqi_score + uv_score + temperature_score + humidity_score

    disease_multiplier = df["Disease_Class"].map(gsm.DISEASE_MULTIPLIERS)
    # Sanity: Disease_Multiplier column (if present) must agree with the map.
    if "Disease_Multiplier" in df.columns:
        mismatch = (~np.isclose(df["Disease_Multiplier"], disease_multiplier)).sum()
        if mismatch:
            raise ValueError(
                f"{mismatch} rows have a Disease_Multiplier that disagrees with "
                "DISEASE_MULTIPLIERS — refusing to silently overwrite."
            )

    raw_risk = disease_multiplier * (lifestyle_score + environmental_score)
    risk_score = raw_risk.clip(lower=gsm.RISK_SCORE_MIN, upper=gsm.RISK_SCORE_MAX)

    # Healthy Skin Paradox override — preserved exactly as before.
    stress_score = stress_score.where(~is_healthy, 0.0)
    aqi_score = aqi_score.where(~is_healthy, 0.0)
    uv_score = uv_score.where(~is_healthy, 0.0)
    temperature_score = temperature_score.where(~is_healthy, 0.0)
    humidity_score = humidity_score.where(~is_healthy, 0.0)
    lifestyle_score = lifestyle_score.where(~is_healthy, 0.0)
    environmental_score = environmental_score.where(~is_healthy, 0.0)
    risk_score = risk_score.where(~is_healthy, 0.0)

    new_cols = pd.DataFrame({
        "Stress_Score": stress_score,
        "AQI_Score": aqi_score,
        "UV_Score": uv_score,
        "Temperature_Score": temperature_score,
        "Humidity_Score": humidity_score,
        "Lifestyle_Score": lifestyle_score,
        "Environmental_Score": environmental_score,
        "Risk_Score": risk_score,
        "Risk_Score_Display": risk_score.apply(gsm.round_half_up),
    })
    # Drop old (pre-existing, old-formula) versions of these columns before
    # concatenating the recomputed ones, so we don't end up with duplicates.
    df = df.drop(columns=[c for c in new_cols.columns if c in df.columns])
    df = pd.concat([df, new_cols], axis=1).copy()

    df.to_csv(output_path, index=False)
    return df


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="merged_multimodal_dataset.csv")
    parser.add_argument("--output", default="merged_multimodal_dataset_v2.csv")
    args = parser.parse_args()

    df = regenerate(args.input, args.output)

    print(f"Saved regenerated dataset: {args.output}  ({len(df)} rows)")
    print("\nRisk_Score (new, 0-100) by Disease_Class:")
    print(df.groupby("Disease_Class")["Risk_Score"].describe()[["min", "mean", "max", "std"]].to_string())
    print(f"\nOverall Risk_Score — min: {df['Risk_Score'].min():.3f}, "
          f"max: {df['Risk_Score'].max():.3f}, mean: {df['Risk_Score'].mean():.3f}")


if __name__ == "__main__":
    main()
