"""
DERMAINTEL — Synthetic Multimodal Environmental Metadata Generator
====================================================================

Purpose
-------
This script does NOT train any model. It reads the existing image dataset
(already organized by disease-class folders), and for every image generates
8 literature-informed synthetic environmental/lifestyle profiles plus a
heuristic Risk Score. The output CSV is the input to a later multimodal
fusion MLP (image branch + tabular branch).

All distribution parameters below are taken exactly from the project's
literature review (Acne, Eczema, Alopecia, Healthy) and are not simplified
or replaced. See the DISEASE_CONFIGS section for the literal source values.

RISK SCORE FORMULA (0-100 scale)
---------------------------------
Risk Score is a 0-100 continuous score, computed as:

    RS = clip( Cm * (Ls + Es), 0, 100 )

where Ls ("Lifestyle Score", weight 30) and Es ("Environmental Score",
weight 70) are themselves the SUM of independently normalized 0-max
sub-scores, one per raw input variable, so that a maxed-out combination of
every factor sums to exactly 100 points BEFORE the disease multiplier Cm is
applied:

    Stress          -> up to 30 points  (Ls)
    AQI / PM2.5      -> up to 25 points  (Es)
    UV Index         -> up to 20 points  (Es)
    Temperature      -> up to 15 points  (Es)
    Humidity         -> up to 10 points  (Es)
    ------------------------------------------
    TOTAL            -> up to 100 points (base, pre-multiplier)

Each sub-score is a CONTINUOUS function of its raw input (not the old
coarse 4-category AQI lookup), so the score responds smoothly and
proportionally instead of jumping in a few large steps:

  * Stress: linear in Stress_Penalty (0/2/3), scaled to [0, 30].
  * AQI/PM2.5: linear ramp from 0 at 0 µg/m^3 to the full 25 points at
    AQI_CEILING (300 µg/m^3, chosen to sit above CPCB's "Severe" PM2.5
    threshold of ~250 µg/m^3 so the ramp has headroom before saturating),
    clipped at the ceiling.
  * UV Index: linear ramp from 0 to the full 20 points at UV_CEILING = 11
    (WHO's "Extreme" UV index ceiling), clipped at the ceiling.
  * Temperature and Humidity: U-shaped around a physiological "comfort
    zone" (18-24 degC for temperature, 40-60% RH for humidity) where the
    contribution is 0; risk ramps linearly up to the full weight (15 for
    temperature, 10 for humidity) as the value moves away from the comfort
    zone toward the extremes of the sampled range. This reflects that BOTH
    heat/humidity (oil, sweat, fungal/bacterial growth) and cold/dryness
    (barrier disruption, eczema flare-ups) are skin-relevant stressors, not
    just one direction.

The disease multiplier Cm (Acne 1.1, Eczema 1.3, Alopecia 1.2, Healthy 0.8)
is preserved EXACTLY as before and applied multiplicatively to the base
0-100 score, then the result is clipped back to [0, 100] (only the highest
multiplier, Eczema x1.3, combined with a near-maximal base score can exceed
100 before clipping). Risk Score is NOT rounded for the training target:
the continuous value is stored as-is in `Risk_Score` (the regression
target for the MLP). A separate `Risk_Score_Display` column applies
round-half-up, for application/UI display only.

The "Healthy Skin Paradox" override is preserved unchanged: Healthy images
always get Ls = Es = Risk_Score = 0, regardless of the (still-sampled,
still-realistic) environmental values, per the project's fixed design
decision.

Reproducibility
----------------
A single seeded `numpy.random.Generator` drives every sampling call, so the
entire 19,200-row dataset is reproducible end-to-end from SEED.
"""

import os
import math
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.stats import truncnorm

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------

SEED = 42
DATASET_DIR = Path(r"C:\Users\GAURAV\Major Project Code\ml\data\final")  # root containing train/ val/ test/ subfolders
OUTPUT_DIR = Path("outputs")
PLOTS_DIR = OUTPUT_DIR / "plots"
OUTPUT_CSV = OUTPUT_DIR / "synthetic_multimodal_dataset.csv"

PROFILES_PER_IMAGE = 8
VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp"}

DISEASE_FOLDERS = ["Acne", "Eczema", "Alopecia", "Healthy"]
SPLITS = ["train", "val", "test"]

# Per-disease factor weights (0-100 scale, each disease's 5 weights sum to
# 100), derived from the DERMAINTEL literature review. Replaces the old
# single universal weight split + scalar disease multiplier (Cm) entirely
# -- disease sensitivity is now expressed directly via these weights, not
# via a separate multiplier applied afterward. Healthy is NOT included:
# Healthy bypasses the MLP entirely (hardcoded risk 0 / Low), so it needs
# no weight vector -- see the Healthy override in the generation loop below.
DISEASE_WEIGHTS = {
    "Acne":     {"Temperature": 17, "Humidity": 17, "UV": 16, "AQI": 25, "Stress": 25},
    "Eczema":   {"Temperature": 23, "Humidity": 15, "UV": 8,  "AQI": 31, "Stress": 23},
    "Alopecia": {"Temperature": 24, "Humidity": 5,  "UV": 12, "AQI": 24, "Stress": 35},
}
for _disease, _weights in DISEASE_WEIGHTS.items():
    assert sum(_weights.values()) == 100, f"{_disease} weights must sum to 100"
del _disease, _weights

# Stress category -> numeric value, used exactly as given.
STRESS_VALUE_MAP = {"Low": 0, "Medium": 2, "High": 3}


# ---------------------------------------------------------------------------
# DISEASE-SPECIFIC DISTRIBUTION CONFIGURATION
# (Values transcribed exactly from the literature review's consolidated table)
# ---------------------------------------------------------------------------

@dataclass
class TruncNormalSpec:
    """A truncated-normal distribution: mean, sd, and hard [lo, hi] bounds."""
    mean: float
    sd: float
    lo: float
    hi: float


@dataclass
class BimodalNormalSpec:
    """
    A 50/50 mixture of two truncated normals, sharing the same overall
    truncation bounds. Used only for Eczema humidity, per the literature
    review's explicit bimodal recommendation.
    """
    mean_low: float
    sd_low: float
    mean_high: float
    sd_high: float
    lo: float
    hi: float
    weight_low: float = 0.5


@dataclass
class TruncLognormalSpec:
    """A truncated log-normal distribution for PM2.5 (µg/m³)."""
    mu: float   # mean of underlying normal, i.e. ln(scale)
    sigma: float
    lo: float
    hi: float


@dataclass
class DiseaseConfig:
    """All literature-derived distribution parameters for one disease class."""
    temperature: TruncNormalSpec
    humidity: object  # TruncNormalSpec or BimodalNormalSpec
    uv_index: TruncNormalSpec
    aqi_pm25: TruncLognormalSpec
    stress_probs: dict  # {"Low": p, "Medium": p, "High": p}


DISEASE_CONFIGS = {
    "Acne": DiseaseConfig(
        temperature=TruncNormalSpec(mean=27, sd=5, lo=15, hi=40),
        humidity=TruncNormalSpec(mean=65, sd=12, lo=35, hi=90),
        uv_index=TruncNormalSpec(mean=6.5, sd=2.0, lo=1, hi=11),
        aqi_pm25=TruncLognormalSpec(mu=math.log(55), sigma=0.45, lo=10, hi=200),
        stress_probs={"Low": 0.20, "Medium": 0.40, "High": 0.40},
    ),
    "Eczema": DiseaseConfig(
        temperature=TruncNormalSpec(mean=24, sd=7, lo=5, hi=40),
        humidity=BimodalNormalSpec(
            mean_low=35, sd_low=8, mean_high=75, sd_high=8, lo=15, hi=95
        ),
        uv_index=TruncNormalSpec(mean=5.0, sd=2.5, lo=0, hi=11),
        aqi_pm25=TruncLognormalSpec(mu=math.log(45), sigma=0.5, lo=8, hi=180),
        stress_probs={"Low": 0.25, "Medium": 0.40, "High": 0.35},
    ),
    "Alopecia": DiseaseConfig(
        # Temperature/Humidity are explicitly flagged "assumption-based" in
        # the literature review (no disease-specific study found). Used
        # exactly as specified there — Low confidence, not Low priority.
        temperature=TruncNormalSpec(mean=20, sd=8, lo=0, hi=40),
        humidity=TruncNormalSpec(mean=55, sd=15, lo=20, hi=90),
        uv_index=TruncNormalSpec(mean=4.0, sd=2.5, lo=0, hi=11),
        aqi_pm25=TruncLognormalSpec(mu=math.log(50), sigma=0.5, lo=10, hi=180),
        stress_probs={"Low": 0.20, "Medium": 0.35, "High": 0.45},
    ),
    "Healthy": DiseaseConfig(
        temperature=TruncNormalSpec(mean=26, sd=6, lo=10, hi=42),
        humidity=TruncNormalSpec(mean=55, sd=15, lo=20, hi=90),
        uv_index=TruncNormalSpec(mean=6.0, sd=2.5, lo=0, hi=11),
        aqi_pm25=TruncLognormalSpec(mu=math.log(35), sigma=0.6, lo=5, hi=150),
        stress_probs={"Low": 0.40, "Medium": 0.40, "High": 0.20},
    ),
}

# ---------------------------------------------------------------------------
# RISK SCORE NORMALIZATION CONSTANTS (0-100 scale; see module docstring)
# ---------------------------------------------------------------------------
# NOTE: per-factor WEIGHTS now come from DISEASE_WEIGHTS (disease-specific,
# see above) rather than a single universal set. The constants below only
# define each factor's *shape* (ramp ceiling / comfort zone) -- the same
# shape is reused across diseases, just scaled by that disease's weight.

# Stress: linear ramp, scaled by STRESS_MAX_VALUE
STRESS_MAX_VALUE = max(STRESS_VALUE_MAP.values())  # 3 (High)

# AQI/PM2.5: linear ramp to AQI_WEIGHT at AQI_CEILING (µg/m^3).
AQI_CEILING = 300.0

# UV Index: linear ramp to UV_WEIGHT at UV_CEILING (WHO "Extreme" ceiling).
UV_CEILING = 11.0

# Temperature: U-shaped around a comfort zone; 0 contribution inside it,
# ramping linearly to TEMPERATURE_WEIGHT at TEMPERATURE_MIN/MAX.
TEMPERATURE_COMFORT_LOW = 18.0
TEMPERATURE_COMFORT_HIGH = 24.0
TEMPERATURE_MIN = 0.0
TEMPERATURE_MAX = 45.0

# Humidity: U-shaped around a comfort zone; 0 contribution inside it,
# ramping linearly to HUMIDITY_WEIGHT at HUMIDITY_MIN/MAX.
HUMIDITY_COMFORT_LOW = 40.0
HUMIDITY_COMFORT_HIGH = 60.0
HUMIDITY_MIN = 0.0
HUMIDITY_MAX = 100.0

RISK_SCORE_MIN = 0.0
RISK_SCORE_MAX = 100.0


# ---------------------------------------------------------------------------
# SAMPLING FUNCTIONS
# ---------------------------------------------------------------------------

def _sample_truncnorm(spec: TruncNormalSpec, rng: np.random.Generator, size: int = 1) -> np.ndarray:
    """Draw `size` samples from a truncated normal distribution."""
    a = (spec.lo - spec.mean) / spec.sd
    b = (spec.hi - spec.mean) / spec.sd
    return truncnorm.rvs(a, b, loc=spec.mean, scale=spec.sd, size=size, random_state=rng)


def _sample_truncated_lognormal(
    spec: TruncLognormalSpec, rng: np.random.Generator, size: int = 1, max_iter: int = 50
) -> np.ndarray:
    """
    Draw `size` samples from a log-normal distribution (underlying Normal(mu,
    sigma)), truncated to [lo, hi] via proper rejection sampling. This keeps
    the exact mu/sigma the literature review specifies, while honestly
    enforcing the stated bounds (rather than the review's own illustrative
    "sample 3n and slice" shortcut, which can under-fill under heavy
    truncation).
    """
    collected = []
    n_needed = size
    for _ in range(max_iter):
        if n_needed <= 0:
            break
        batch = rng.lognormal(mean=spec.mu, sigma=spec.sigma, size=max(n_needed * 4, 16))
        valid = batch[(batch >= spec.lo) & (batch <= spec.hi)]
        collected.append(valid)
        n_needed = size - sum(len(c) for c in collected)
    result = np.concatenate(collected)[:size]
    if len(result) < size:
        raise RuntimeError(
            "Truncated log-normal rejection sampling did not converge — "
            "check that [lo, hi] is plausible for the given mu/sigma."
        )
    return result


def sample_temperature(disease: str, rng: np.random.Generator, size: int = 1) -> np.ndarray:
    """Sample Temperature (°C) for the given disease class."""
    return _sample_truncnorm(DISEASE_CONFIGS[disease].temperature, rng, size)


def sample_humidity(disease: str, rng: np.random.Generator, size: int = 1) -> np.ndarray:
    """
    Sample Humidity (% RH) for the given disease class. Handles both the
    simple truncated-normal case and Eczema's bimodal mixture case.
    """
    spec = DISEASE_CONFIGS[disease].humidity
    if isinstance(spec, BimodalNormalSpec):
        branch = rng.random(size) < spec.weight_low  # True -> low-humidity branch
        low_spec = TruncNormalSpec(spec.mean_low, spec.sd_low, spec.lo, spec.hi)
        high_spec = TruncNormalSpec(spec.mean_high, spec.sd_high, spec.lo, spec.hi)
        low_vals = _sample_truncnorm(low_spec, rng, size)
        high_vals = _sample_truncnorm(high_spec, rng, size)
        return np.where(branch, low_vals, high_vals)
    return _sample_truncnorm(spec, rng, size)


def sample_uv(disease: str, rng: np.random.Generator, size: int = 1) -> np.ndarray:
    """Sample UV Index for the given disease class."""
    return _sample_truncnorm(DISEASE_CONFIGS[disease].uv_index, rng, size)


def sample_aqi(disease: str, rng: np.random.Generator, size: int = 1) -> np.ndarray:
    """Sample AQI / PM2.5 (µg/m³) for the given disease class."""
    return _sample_truncated_lognormal(DISEASE_CONFIGS[disease].aqi_pm25, rng, size)


def sample_stress(disease: str, rng: np.random.Generator, size: int = 1) -> np.ndarray:
    """Sample Stress category ('Low' / 'Medium' / 'High') for the disease class."""
    probs = DISEASE_CONFIGS[disease].stress_probs
    categories = list(probs.keys())
    p = list(probs.values())
    return rng.choice(categories, size=size, p=p)


def stress_to_score(stress_category: str) -> int:
    """Map a Stress category string to its numeric value (Low=0, Medium=2, High=3)."""
    return STRESS_VALUE_MAP[stress_category]


# ---------------------------------------------------------------------------
# SCORE COMPUTATION
# ---------------------------------------------------------------------------

def _linear_ramp(value: float, ceiling: float, weight: float) -> float:
    """A 0-at-zero, linear-to-`weight`-at-`ceiling` ramp, clipped at both ends."""
    if ceiling <= 0:
        return 0.0
    fraction = value / ceiling
    fraction = min(max(fraction, 0.0), 1.0)
    return weight * fraction


def _u_shaped_score(
    value: float, comfort_low: float, comfort_high: float,
    hard_min: float, hard_max: float, weight: float,
) -> float:
    """
    A U-shaped score: 0 inside [comfort_low, comfort_high], ramping linearly
    up to `weight` as `value` moves out toward hard_min (below) or hard_max
    (above), clipped at both ends. Used for Temperature and Humidity, which
    are both-directions skin stressors (too cold/dry vs. too hot/humid).
    """
    if comfort_low <= value <= comfort_high:
        return 0.0
    if value < comfort_low:
        span = comfort_low - hard_min
        if span <= 0:
            return weight
        fraction = (comfort_low - value) / span
    else:
        span = hard_max - comfort_high
        if span <= 0:
            return weight
        fraction = (value - comfort_high) / span
    fraction = min(max(fraction, 0.0), 1.0)
    return weight * fraction


def compute_stress_score(stress_value: float, weight: float) -> float:
    """Stress sub-score, linear in Stress_Penalty, scaled to [0, weight]."""
    return _linear_ramp(stress_value, STRESS_MAX_VALUE, weight)


def compute_aqi_score(aqi_pm25: float, weight: float) -> float:
    """AQI/PM2.5 sub-score, linear ramp to `weight` at AQI_CEILING."""
    return _linear_ramp(aqi_pm25, AQI_CEILING, weight)


def compute_uv_score(uv_index: float, weight: float) -> float:
    """UV Index sub-score, linear ramp to `weight` at UV_CEILING."""
    return _linear_ramp(uv_index, UV_CEILING, weight)


def compute_temperature_score(temperature: float, weight: float) -> float:
    """Temperature sub-score, U-shaped around the comfort zone, scaled to [0, weight]."""
    return _u_shaped_score(
        temperature, TEMPERATURE_COMFORT_LOW, TEMPERATURE_COMFORT_HIGH,
        TEMPERATURE_MIN, TEMPERATURE_MAX, weight,
    )


def compute_humidity_score(humidity: float, weight: float) -> float:
    """Humidity sub-score, U-shaped around the comfort zone, scaled to [0, weight]."""
    return _u_shaped_score(
        humidity, HUMIDITY_COMFORT_LOW, HUMIDITY_COMFORT_HIGH,
        HUMIDITY_MIN, HUMIDITY_MAX, weight,
    )


def compute_risk_score(
    disease: str, temperature: float, humidity: float, uv_index: float,
    aqi_pm25: float, stress_value: float,
) -> float:
    """
    Compute the continuous Risk Score, on a 0-100 scale, using the given
    disease's own per-factor weights from DISEASE_WEIGHTS (which replace
    the old universal weight split + scalar disease multiplier entirely):

        RS = clip( stress_score(w_stress) + aqi_score(w_aqi)
                    + uv_score(w_uv) + temperature_score(w_temp)
                    + humidity_score(w_hum), 0, 100 )

    Since each disease's 5 weights sum to exactly 100 and each sub-score
    is individually clipped to its own weight, the sum is already
    mathematically bounded to [0, 100] -- the final clip is a defensive
    safety net, not something expected to actually trigger. `disease`
    must be a key in DISEASE_WEIGHTS (i.e. "Acne", "Eczema", or
    "Alopecia" -- NOT "Healthy", which bypasses this function entirely
    via the Healthy Skin Paradox override in the generation loop).
    """
    weights = DISEASE_WEIGHTS[disease]
    raw = (
        compute_stress_score(stress_value, weights["Stress"])
        + compute_aqi_score(aqi_pm25, weights["AQI"])
        + compute_uv_score(uv_index, weights["UV"])
        + compute_temperature_score(temperature, weights["Temperature"])
        + compute_humidity_score(humidity, weights["Humidity"])
    )
    return min(max(raw, RISK_SCORE_MIN), RISK_SCORE_MAX)


def round_half_up(value: float) -> int:
    """
    Round-half-up (traditional rounding), used ONLY for the display column.
    Python's built-in round() uses banker's rounding (round-half-to-even),
    which would round 6.5 -> 6; this function instead gives 6.5 -> 7, per
    project convention. Safe for all non-negative Risk Score values.
    """
    return math.floor(value + 0.5)


# ---------------------------------------------------------------------------
# DATASET DISCOVERY
# ---------------------------------------------------------------------------

def discover_images(dataset_dir: Path) -> list:
    """
    Scan dataset_dir/<split>/<DiseaseClass>/ for image files and return a
    list of (split, disease_class, image_path) tuples. Split and disease
    class are both inferred purely from folder names.

    A missing split folder (e.g. no `test/` yet) is skipped, since not all
    three splits are guaranteed to exist at every stage of the project.
    However, once a split folder exists, every one of its four disease
    subfolders must exist and contain at least one image — a missing or
    empty class folder inside an existing split is treated as an error
    rather than silently skipped, for the same reason as before: it would
    otherwise silently produce 0 rows for that split/class combination and
    skew the class balance of the generated dataset without any warning.
    """
    records = []
    for split in SPLITS:
        split_dir = dataset_dir / split
        if not split_dir.is_dir():
            print(f"  [INFO] Split folder not found, skipping: {split_dir}")
            continue

        for disease in DISEASE_FOLDERS:
            class_dir = split_dir / disease
            if not class_dir.is_dir():
                raise ValueError(
                    f"Expected disease folder not found: {class_dir}. "
                    f"'{split}/' exists, so every disease subfolder under it "
                    f"is expected to exist too."
                )
            image_paths = sorted(
                p for p in class_dir.iterdir()
                if p.is_file() and p.suffix.lower() in VALID_EXTENSIONS
            )
            if not image_paths:
                raise ValueError(
                    f"No images found in {class_dir}. An empty class folder "
                    f"would otherwise silently produce 0 rows for "
                    f"'{split}/{disease}' and skew the class balance of the "
                    f"generated dataset without any error."
                )
            for p in image_paths:
                records.append((split, disease, p))

    if not records:
        raise ValueError(
            f"No images found anywhere under {dataset_dir} — checked splits: "
            f"{SPLITS}. Check that DATASET_DIR points at the correct data root."
        )
    return records


# ---------------------------------------------------------------------------
# MAIN GENERATION LOOP
# ---------------------------------------------------------------------------

def generate_dataset(dataset_dir: Path, profiles_per_image: int, seed: int) -> pd.DataFrame:
    """
    For every image in dataset_dir, generate `profiles_per_image` synthetic
    environmental profiles and compute the corresponding Risk Score. Returns
    a single DataFrame with one row per (image, profile).
    """
    rng = np.random.default_rng(seed)

    print("Scanning dataset folders...")
    image_records = discover_images(dataset_dir)
    found_splits = sorted({split for split, _, _ in image_records})
    print(f"  Found {len(image_records)} images across {len(DISEASE_FOLDERS)} classes "
          f"and splits: {found_splits}.\n")

    # Image_ID MUST match the feature-extraction script's join key exactly:
    # the path relative to the dataset root, extension stripped, forward
    # slashes (e.g. "train/Acne/0_before"). A bare filename is NOT safe here —
    # this dataset's filenames (e.g. "0_before", "0_Skin") are low-entropy and
    # commonly repeat across every class folder, so filename-only IDs would
    # collide silently. The relative-path scheme is unique by construction
    # (two different files can't share the same path), and the collision
    # check below is kept only as a defensive safety net, not the primary
    # uniqueness guarantee.
    seen_ids = {}  # image_id -> image_path, defensive collision check
    rows = []

    for split, disease, image_path in image_records:
        image_id = image_path.relative_to(dataset_dir).as_posix()

        if image_id in seen_ids and seen_ids[image_id] != image_path:
            raise ValueError(
                f"Image_ID collision detected: '{image_id}' is produced by both "
                f"{seen_ids[image_id]} and {image_path}. This should not be "
                f"possible with path-based IDs unless the same file is somehow "
                f"reachable via two different paths (e.g. a symlink) — "
                f"investigate before proceeding."
            )
        seen_ids[image_id] = image_path

        for profile_num in range(1, profiles_per_image + 1):
            temperature = float(sample_temperature(disease, rng)[0])
            humidity = float(sample_humidity(disease, rng)[0])
            uv_index = float(sample_uv(disease, rng)[0])
            aqi_pm25 = float(sample_aqi(disease, rng)[0])
            stress_category = str(sample_stress(disease, rng)[0])
            stress_value = stress_to_score(stress_category)
            # Numeric encoding of the Stress column (0/2/3), always populated —
            # including for Healthy — so the MLP pipeline can use it directly
            # instead of re-deriving it from the "Low"/"Medium"/"High" string.
            # Note this is distinct from Stress_Score, which IS forced to 0
            # for Healthy as part of the Risk Score override below.
            stress_penalty = stress_value

            if disease == "Healthy":
                # Healthy images must always represent a healthy individual,
                # regardless of the (still-sampled, still-realistic)
                # environmental values above. This is intentional per the
                # project's fixed design decision. Healthy also has no
                # entry in DISEASE_WEIGHTS -- it bypasses the MLP entirely
                # at inference (hardcoded risk 0 / Low), so there is no
                # per-factor weight vector to compute sub-scores from.
                stress_score = 0.0
                aqi_score = 0.0
                uv_score = 0.0
                temperature_score = 0.0
                humidity_score = 0.0
                risk_score = 0.0
            else:
                weights = DISEASE_WEIGHTS[disease]
                stress_score = compute_stress_score(stress_value, weights["Stress"])
                aqi_score = compute_aqi_score(aqi_pm25, weights["AQI"])
                uv_score = compute_uv_score(uv_index, weights["UV"])
                temperature_score = compute_temperature_score(temperature, weights["Temperature"])
                humidity_score = compute_humidity_score(humidity, weights["Humidity"])
                risk_score = compute_risk_score(disease, temperature, humidity, uv_index, aqi_pm25, stress_value)

            rows.append({
                "Split": split,
                "Image_ID": image_id,
                "Profile_ID": profile_num,
                "Image_Path": str(image_path),
                "Disease_Class": disease,
                "Temperature": round(temperature, 2),
                "Humidity": round(humidity, 2),
                "UV_Index": round(uv_index, 2),
                "AQI_PM25": round(aqi_pm25, 2),
                "Stress": stress_category,
                "Stress_Penalty": stress_penalty,
                "Stress_Score": stress_score,
                "AQI_Score": aqi_score,
                "UV_Score": uv_score,
                "Temperature_Score": temperature_score,
                "Humidity_Score": humidity_score,
                "Risk_Score": risk_score,                       # continuous, unrounded, 0-100 — MLP training target
                "Risk_Score_Display": round_half_up(risk_score),  # rounded, UI display only
            })

    df = pd.DataFrame(rows)
    validate_join_integrity(df, image_records, dataset_dir)
    return df


def validate_join_integrity(df: pd.DataFrame, image_records: list, dataset_dir: Path) -> None:
    """
    Confirm that Image_ID is a safe, lossless join key against the underlying
    image files — this is what a later CNN-feature-extraction script will
    merge on. Checks, per the project owner's explicit request:
      1. Number of unique Image_ID values in the CSV
      2. Number of unique images actually discovered on disk
      3. That these two sets are identical (no missing, no extras)
    Raises immediately if anything is off, rather than letting a broken join
    surface later as an unexplained drop in MLP performance.
    """
    csv_ids = set(df["Image_ID"].unique())
    disk_ids = {
        image_path.relative_to(dataset_dir).as_posix()
        for _, _, image_path in image_records
        }

    n_csv_rows_per_id = df.groupby("Image_ID").size()
    expected_rows_per_id = PROFILES_PER_IMAGE
    bad_counts = n_csv_rows_per_id[n_csv_rows_per_id != expected_rows_per_id]

    print("\n--- Join-integrity check (Image_ID vs. real filenames) ---")
    print(f"  Unique Image_ID in CSV        : {len(csv_ids)}")
    print(f"  Unique images found on disk   : {len(disk_ids)}")
    print(f"  Intersection (should match both above): {len(csv_ids & disk_ids)}")

    if csv_ids != disk_ids:
        missing_from_csv = disk_ids - csv_ids
        extra_in_csv = csv_ids - disk_ids
        raise ValueError(
            "Image_ID / filename mismatch detected — this would silently "
            "break the later merge with CNN features.\n"
            f"  Images on disk but missing from CSV ({len(missing_from_csv)}): "
            f"{sorted(missing_from_csv)[:10]}{' ...' if len(missing_from_csv) > 10 else ''}\n"
            f"  IDs in CSV but not matching any file ({len(extra_in_csv)}): "
            f"{sorted(extra_in_csv)[:10]}{' ...' if len(extra_in_csv) > 10 else ''}"
        )

    if not bad_counts.empty:
        raise ValueError(
            f"{len(bad_counts)} Image_ID(s) do not have exactly "
            f"{expected_rows_per_id} profile rows in the CSV — expected every "
            f"image to produce exactly {expected_rows_per_id} rows. "
            f"Examples: {bad_counts.head(5).to_dict()}"
        )

    print("  OK — every image has a unique Image_ID and exactly "
          f"{expected_rows_per_id} profile rows. Safe to merge on Image_ID.")


# ---------------------------------------------------------------------------
# VALIDATION / SUMMARY
# ---------------------------------------------------------------------------

def print_validation_summary(df: pd.DataFrame) -> None:
    print("\n" + "=" * 70)
    print("VALIDATION SUMMARY")
    print("=" * 70)

    print(f"\nTotal samples generated : {len(df)}")

    print("\nSamples per split:")
    print(df["Split"].value_counts().to_string())

    print("\nSamples per disease class:")
    print(df["Disease_Class"].value_counts().to_string())

    print("\nSamples per split x disease class:")
    print(pd.crosstab(df["Split"], df["Disease_Class"]).to_string())

    print(f"\nRisk Score (continuous) — min: {df['Risk_Score'].min():.3f}, "
          f"max: {df['Risk_Score'].max():.3f}, mean: {df['Risk_Score'].mean():.3f}")

    print("\nStress category distribution (overall):")
    print(df["Stress"].value_counts(normalize=True).mul(100).round(1).astype(str).add("%").to_string())

    print("\nStress category distribution (per disease):")
    print(pd.crosstab(df["Disease_Class"], df["Stress"], normalize="index").mul(100).round(1).to_string())

    print("\nAQI / PM2.5 (µg/m³) summary (per disease):")
    print(df.groupby("Disease_Class")["AQI_PM25"].describe()[["min", "mean", "max", "std"]].to_string())

    print("\nTemperature (°C) summary (per disease):")
    print(df.groupby("Disease_Class")["Temperature"].describe()[["min", "mean", "max", "std"]].to_string())

    print("\nHumidity (%) summary (per disease):")
    print(df.groupby("Disease_Class")["Humidity"].describe()[["min", "mean", "max", "std"]].to_string())

    print("\nUV Index summary (per disease):")
    print(df.groupby("Disease_Class")["UV_Index"].describe()[["min", "mean", "max", "std"]].to_string())

    print("\n" + "=" * 70)


def save_plots(df: pd.DataFrame, plots_dir: Path) -> None:
    """Save distribution plots per disease class for visual validation."""
    plots_dir.mkdir(parents=True, exist_ok=True)
    numeric_cols = ["Temperature", "Humidity", "UV_Index", "AQI_PM25", "Risk_Score"]

    for col in numeric_cols:
        fig, ax = plt.subplots(figsize=(7, 4))
        for disease in DISEASE_FOLDERS:
            subset = df[df["Disease_Class"] == disease][col]
            ax.hist(subset, bins=30, alpha=0.5, label=disease, density=True)
        ax.set_title(f"{col} distribution by disease class")
        ax.set_xlabel(col)
        ax.set_ylabel("Density")
        ax.legend()
        fig.tight_layout()
        fig.savefig(plots_dir / f"{col.lower()}_distribution.png", dpi=120)
        plt.close(fig)

    # Stress category counts per disease
    fig, ax = plt.subplots(figsize=(7, 4))
    pd.crosstab(df["Disease_Class"], df["Stress"]).plot(kind="bar", ax=ax)
    ax.set_title("Stress category counts by disease class")
    ax.set_ylabel("Count")
    fig.tight_layout()
    fig.savefig(plots_dir / "stress_category_counts.png", dpi=120)
    plt.close(fig)

    print(f"\nPlots saved to: {plots_dir.resolve()}")


# ---------------------------------------------------------------------------
# ENTRY POINT
# ---------------------------------------------------------------------------

def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    df = generate_dataset(DATASET_DIR, PROFILES_PER_IMAGE, SEED)

    df.to_csv(OUTPUT_CSV, index=False)
    print(f"\nSaved dataset: {OUTPUT_CSV.resolve()}  ({len(df)} rows)")

    print_validation_summary(df)
    save_plots(df, PLOTS_DIR)


if __name__ == "__main__":
    main()