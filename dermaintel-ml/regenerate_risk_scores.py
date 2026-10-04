"""
DERMAINTEL — Regenerate Risk_Score on an existing synthetic dataset
====================================================================

Recomputes ONLY the risk-score-related columns on an existing
synthetic_multimodal_dataset.csv (as produced by
generate_synthetic_metadata.py), using that module's current
DISEASE_WEIGHTS and compute_risk_score(). Does NOT re-sample any
environmental variable and does NOT touch Disease_Class, Image_Path, or
any other column -- useful when you've only changed DISEASE_WEIGHTS and
want scores recomputed against the SAME sampled environmental values
(apples-to-apples), rather than re-running generate_synthetic_metadata.py
from scratch, which would re-sample everything via its RNG.

NOTE: unlike the old version of this script, there is no CNN-feature-merge
step in this pipeline anymore -- generate_synthetic_metadata.py's own
output is already the MLP's training table directly. This script exists
only for the "I changed the weights, not the environment" case above.

Columns recomputed: Stress_Score, AQI_Score, UV_Score, Temperature_Score,
Humidity_Score, Risk_Score, Risk_Score_Display.
Every other column is copied through unchanged.

Usage:
    python regenerate_risk_scores.py \
        --input outputs/synthetic_multimodal_dataset.csv \
        --output outputs/synthetic_multimodal_dataset.csv
"""

import argparse

import pandas as pd

import generate_synthetic_metadata as gsm

REQUIRED_COLS = ["Disease_Class", "Temperature", "Humidity", "UV_Index", "AQI_PM25", "Stress_Penalty"]


def _recompute_row(row: pd.Series) -> pd.Series:
    disease = row["Disease_Class"]

    if disease == "Healthy":
        # Healthy Skin Paradox override, preserved exactly: Healthy has no
        # entry in DISEASE_WEIGHTS (it bypasses the MLP at inference), so
        # there is no weight vector to compute sub-scores from.
        return pd.Series(
            {"Stress_Score": 0.0, "AQI_Score": 0.0, "UV_Score": 0.0,
             "Temperature_Score": 0.0, "Humidity_Score": 0.0,
             "Risk_Score": 0.0, "Risk_Score_Display": 0}
        )

    weights = gsm.DISEASE_WEIGHTS[disease]
    stress_score = gsm.compute_stress_score(row["Stress_Penalty"], weights["Stress"])
    aqi_score = gsm.compute_aqi_score(row["AQI_PM25"], weights["AQI"])
    uv_score = gsm.compute_uv_score(row["UV_Index"], weights["UV"])
    temperature_score = gsm.compute_temperature_score(row["Temperature"], weights["Temperature"])
    humidity_score = gsm.compute_humidity_score(row["Humidity"], weights["Humidity"])
    risk_score = gsm.compute_risk_score(
        disease, row["Temperature"], row["Humidity"], row["UV_Index"],
        row["AQI_PM25"], row["Stress_Penalty"],
    )
    return pd.Series(
        {"Stress_Score": stress_score, "AQI_Score": aqi_score, "UV_Score": uv_score,
         "Temperature_Score": temperature_score, "Humidity_Score": humidity_score,
         "Risk_Score": risk_score, "Risk_Score_Display": gsm.round_half_up(risk_score)}
    )


def regenerate(input_path: str, output_path: str) -> pd.DataFrame:
    df = pd.read_csv(input_path)

    missing = [c for c in REQUIRED_COLS if c not in df.columns]
    if missing:
        raise ValueError(f"Input dataset is missing required columns: {missing}")

    unknown_diseases = set(df["Disease_Class"].unique()) - set(gsm.DISEASE_WEIGHTS) - {"Healthy"}
    if unknown_diseases:
        raise ValueError(f"Dataset contains Disease_Class values with no weight vector: {unknown_diseases}")

    new_cols = df.apply(_recompute_row, axis=1)

    df = df.drop(columns=[c for c in new_cols.columns if c in df.columns])
    df = pd.concat([df, new_cols], axis=1)

    df.to_csv(output_path, index=False)
    return df


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="outputs/synthetic_multimodal_dataset.csv")
    parser.add_argument("--output", default="outputs/synthetic_multimodal_dataset.csv")
    args = parser.parse_args()

    df = regenerate(args.input, args.output)

    print(f"Saved regenerated dataset: {args.output}  ({len(df)} rows)")
    print("\nRisk_Score (0-100) by Disease_Class:")
    print(df.groupby("Disease_Class")["Risk_Score"].describe()[["min", "mean", "max", "std"]].to_string())


if __name__ == "__main__":
    main()