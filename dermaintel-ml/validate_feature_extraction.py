"""
DERMAINTEL — validate_feature_extraction.py
=============================================

Read-only validation of the CNN feature-extraction output before it is used
for multimodal fusion. This script does NOT modify cnn_features_256d.csv,
cnn_features_256d.npy, or synthetic_multimodal_dataset.csv in any way — it
only reads them and writes a report + plots to outputs/.

Every check below appends a PASS/FAIL entry to a running report. On FAIL,
the script prints (and writes) a concrete explanation of why it likely
failed and how to fix it, rather than just a bare assertion error.
"""

import sys
import warnings
warnings.filterwarnings("ignore")

from pathlib import Path

import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.decomposition import PCA
from sklearn.manifold import TSNE
from sklearn.metrics import silhouette_score
import umap

# ---------------------------------------------------------------------------
# CONFIG
# ---------------------------------------------------------------------------

FEATURES_NPY = r"outputs\cnn_features_256d_new.npy"
FEATURES_CSV = r"outputs\cnn_features_256d_new.csv"
SYNTHETIC_CSV = r"outputs\synthetic_multimodal_dataset.csv"

EXPECTED_FEATURE_DIM = 256
EXPECTED_METADATA_COLS = ["Image_ID", "Image_Path", "Split", "Disease_Class"]
EXPECTED_SPLITS = ["train", "val", "test"]

OUTPUT_DIR = Path("outputs")
REPORT_PATH = OUTPUT_DIR / "validation_report.txt"
TSNE_PLOT_PATH = OUTPUT_DIR / "tsne_feature_space.png"
UMAP_PLOT_PATH = OUTPUT_DIR / "umap_feature_space.png"
VARIANCE_PLOT_PATH = OUTPUT_DIR / "feature_variance.png"
PCA_PLOT_PATH = OUTPUT_DIR / "pca_variance.png"
CORRELATION_PLOT_PATH = OUTPUT_DIR / "feature_correlation.png"
CENTROID_DISTANCE_CSV = OUTPUT_DIR / "centroid_distance_matrix.csv"

RANDOM_STATE = 42


# ---------------------------------------------------------------------------
# REPORT TRACKING
# ---------------------------------------------------------------------------

class Report:
    """
    Collects PASS/FAIL results and free-text notes as checks run, so a
    single final summary + full text report can be produced at the end.
    """

    def __init__(self):
        self.checks = []       # list of (name, passed: bool)
        self.lines = []        # full text log, in order

    def log(self, text: str = ""):
        print(text)
        self.lines.append(text)

    def check(self, name: str, passed: bool, ok_message: str = "", fail_explanation: str = ""):
        """Record a pass/fail result and print the appropriate message."""
        self.checks.append((name, passed))
        if passed:
            self.log(f"\u2713 {name}: {ok_message}" if ok_message else f"\u2713 {name}")
        else:
            self.log(f"\u2717 {name}: FAILED")
            if fail_explanation:
                self.log(fail_explanation)

    def summary_and_save(self):
        self.log("\n" + "=" * 60)
        self.log("FEATURE INTEGRITY REPORT")
        self.log("=" * 60)
        max_name_len = max(len(name) for name, _ in self.checks)
        all_passed = True
        for name, passed in self.checks:
            status = "PASS" if passed else "FAIL"
            all_passed = all_passed and passed
            self.log(f"  {name.ljust(max_name_len)}   {status}")
        self.log("")
        if all_passed:
            self.log("Ready for Multimodal Fusion \u2713")
        else:
            self.log("NOT ready for multimodal fusion — fix the FAILED checks above first.")
        self.log("=" * 60)

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        REPORT_PATH.write_text("\n".join(self.lines), encoding="utf-8")
        print(f"\nFull report saved to: {REPORT_PATH.resolve()}")
        return all_passed


# ---------------------------------------------------------------------------
# 1. FEATURE MATRIX SHAPE
# ---------------------------------------------------------------------------

def check_feature_shape(report: Report):
    report.log("\n--- 1. Feature Matrix Shape ---")
    if not Path(FEATURES_NPY).exists():
        report.check(
            "Feature Shape", False,
            fail_explanation=(
                f"  Why: '{FEATURES_NPY}' was not found in the current directory.\n"
                f"  Cause: the script is likely being run from a different folder "
                f"than the one containing your outputs.\n"
                f"  Fix: run this script from the same directory as "
                f"'{FEATURES_NPY}', or update FEATURES_NPY to a full path."
            ),
        )
        sys.exit(1)

    features = np.load(FEATURES_NPY)
    report.log(f"  Loaded shape: {features.shape}")

    if features.ndim != 2:
        report.check(
            "Feature Shape", False,
            fail_explanation=(
                f"  Why: expected a 2-D matrix (n_images, 256), got {features.ndim}-D.\n"
                f"  Cause: the .npy file may have been saved incorrectly, or a "
                f"single image's feature vector was saved instead of the full batch.\n"
                f"  Fix: re-run 01_extract_features.py and confirm it prints a "
                f"2-D final shape before saving."
            ),
        )
        sys.exit(1)

    if features.shape[1] != EXPECTED_FEATURE_DIM:
        report.check(
            "Feature Shape", False,
            fail_explanation=(
                f"  Why: second dimension is {features.shape[1]}, expected "
                f"{EXPECTED_FEATURE_DIM}.\n"
                f"  Cause: feature extraction likely used the wrong layer "
                f"(not fc_256), or the model architecture changed since "
                f"extraction.\n"
                f"  Fix: re-check FEATURE_LAYER_NAME in 01_extract_features.py "
                f"and re-run extraction."
            ),
        )
        sys.exit(1)  # stop execution, per spec — nothing downstream is meaningful otherwise

    report.check("Feature Shape", True, f"Feature matrix shape: {features.shape}")
    return features


# ---------------------------------------------------------------------------
# 2. CSV VALIDATION
# ---------------------------------------------------------------------------

def check_csv_validation(report: Report, features: np.ndarray):
    report.log("\n--- 2. CSV Validation ---")
    if not Path(FEATURES_CSV).exists():
        report.check(
            "CSV Validation", False,
            fail_explanation=f"  Why: '{FEATURES_CSV}' not found in the current directory.",
        )
        sys.exit(1)

    df = pd.read_csv(FEATURES_CSV)
    feature_cols = [c for c in df.columns if c.startswith("feature_")]

    problems = []
    if len(df) != features.shape[0]:
        problems.append(
            f"  Row count mismatch: CSV has {len(df)} rows, .npy has "
            f"{features.shape[0]} rows.\n"
            f"  Cause: the two files may be out of sync (e.g. one was "
            f"regenerated without the other).\n"
            f"  Fix: re-run 01_extract_features.py so both files are written "
            f"from the same run."
        )
    if len(feature_cols) != EXPECTED_FEATURE_DIM:
        problems.append(
            f"  Feature column count mismatch: found {len(feature_cols)}, "
            f"expected {EXPECTED_FEATURE_DIM}.\n"
            f"  Cause: CSV column naming may not follow the feature_000..."
            f"feature_255 convention.\n"
            f"  Fix: check the column-naming logic in 01_extract_features.py."
        )
    missing_meta = [c for c in EXPECTED_METADATA_COLS if c not in df.columns]
    if missing_meta:
        problems.append(
            f"  Missing metadata columns: {missing_meta}.\n"
            f"  Cause: extraction script's output columns don't match the "
            f"expected schema.\n"
            f"  Fix: confirm 01_extract_features.py writes "
            f"{EXPECTED_METADATA_COLS} before the feature_* columns."
        )

    if problems:
        report.check("CSV Validation", False, fail_explanation="\n".join(problems))
        sys.exit(1)

    report.check(
        "CSV Validation", True,
        f"{len(df)} rows, {len(feature_cols)} feature columns, all metadata columns present."
    )
    return df, feature_cols


# ---------------------------------------------------------------------------
# 3. IMAGE ID CONSISTENCY
# ---------------------------------------------------------------------------

def check_id_consistency(report: Report, feature_df: pd.DataFrame):
    report.log("\n--- 3. Image ID Consistency ---")
    if not Path(SYNTHETIC_CSV).exists():
        report.check(
            "Image IDs", False,
            fail_explanation=f"  Why: '{SYNTHETIC_CSV}' not found in the current directory.",
        )
        sys.exit(1)

    synthetic_df = pd.read_csv(SYNTHETIC_CSV)
    synthetic_ids = set(synthetic_df["Image_ID"].unique())
    feature_ids = set(feature_df["Image_ID"].unique())

    missing_from_features = synthetic_ids - feature_ids  # in synthetic CSV, no feature vector
    extra_in_features = feature_ids - synthetic_ids       # feature vector with no matching image
    duplicated_in_features = feature_df["Image_ID"].duplicated().sum()

    ok = not missing_from_features and not extra_in_features and duplicated_in_features == 0

    if ok:
        report.check(
            "Image IDs", True,
            f"IDs match perfectly ({len(synthetic_ids)} unique images, 1:1 with feature vectors)."
        )
    else:
        details = []
        if missing_from_features:
            sample = sorted(missing_from_features)[:10]
            details.append(
                f"  {len(missing_from_features)} Image_ID(s) in the synthetic CSV have NO "
                f"feature vector. Examples: {sample}\n"
                f"  Cause: those images likely failed during feature extraction "
                f"(missing file, corrupt image, wrong path).\n"
                f"  Fix: check the 'failed' list printed by 01_extract_features.py "
                f"for these specific IDs and resolve the underlying file issue, "
                f"then re-run extraction."
            )
        if extra_in_features:
            sample = sorted(extra_in_features)[:10]
            details.append(
                f"  {len(extra_in_features)} feature vector(s) don't correspond to any "
                f"Image_ID in the synthetic CSV. Examples: {sample}\n"
                f"  Cause: cnn_features_256d.csv may have been generated from a "
                f"different/older synthetic_multimodal_dataset.csv.\n"
                f"  Fix: regenerate features from the CURRENT synthetic CSV, or "
                f"confirm you're pointing both scripts at the same file."
            )
        if duplicated_in_features > 0:
            dupes = feature_df[feature_df["Image_ID"].duplicated(keep=False)]["Image_ID"].unique()
            details.append(
                f"  {duplicated_in_features} duplicate Image_ID row(s) found in "
                f"the feature CSV. Examples: {sorted(dupes)[:10]}\n"
                f"  Cause: 01_extract_features.py was likely run more than once "
                f"and results were appended instead of overwritten.\n"
                f"  Fix: delete the old outputs and re-run extraction fresh."
            )
        report.check("Image IDs", False, fail_explanation="\n".join(details))

    return synthetic_df


# ---------------------------------------------------------------------------
# 4. DUPLICATE DETECTION
# ---------------------------------------------------------------------------

def check_duplicates(report: Report, feature_df: pd.DataFrame):
    report.log("\n--- 4. Duplicate Detection ---")
    dup_ids = feature_df["Image_ID"].duplicated().sum()
    dup_paths = feature_df["Image_Path"].duplicated().sum()

    if dup_ids == 0 and dup_paths == 0:
        report.check("Duplicate IDs", True, "No duplicate Image_ID or Image_Path found.")
    else:
        report.check(
            "Duplicate IDs", False,
            fail_explanation=(
                f"  Duplicate Image_ID rows: {dup_ids}. Duplicate Image_Path rows: {dup_paths}.\n"
                f"  Cause: extraction was likely run more than once and results "
                f"appended rather than overwritten.\n"
                f"  Fix: delete cnn_features_256d.csv/.npy and re-run "
                f"01_extract_features.py from a clean outputs/ folder."
            ),
        )


# ---------------------------------------------------------------------------
# 5. MISSING VALUES
# ---------------------------------------------------------------------------

def check_missing_values(report: Report, features: np.ndarray):
    report.log("\n--- 5. Missing Values ---")
    nan_mask = np.isnan(features)
    inf_mask = np.isinf(features)
    n_nan = nan_mask.sum()
    n_inf = inf_mask.sum()

    if n_nan == 0 and n_inf == 0:
        report.check("Missing Values", True, "No NaN or Inf values found in the feature matrix.")
    else:
        locations = []
        if n_nan > 0:
            rows, cols = np.where(nan_mask)
            locations.append(f"  {n_nan} NaN value(s). First few (row, col): "
                              f"{list(zip(rows[:10], cols[:10]))}")
        if n_inf > 0:
            rows, cols = np.where(inf_mask)
            locations.append(f"  {n_inf} Inf value(s). First few (row, col): "
                              f"{list(zip(rows[:10], cols[:10]))}")
        report.check(
            "Missing Values", False,
            fail_explanation=(
                "\n".join(locations) + "\n"
                "  Cause: corrupt input images, a broken preprocessing step, or "
                "numerical instability during inference.\n"
                "  Fix: identify the affected rows' Image_ID from the feature "
                "CSV (same row index) and re-check those specific source images."
            ),
        )


# ---------------------------------------------------------------------------
# 6. FEATURE STATISTICS
# ---------------------------------------------------------------------------

def report_feature_statistics(report: Report, features: np.ndarray):
    report.log("\n--- 6. Feature Statistics ---")
    report.log("  Entire matrix:")
    report.log(f"    Min    : {features.min():.4f}")
    report.log(f"    Max    : {features.max():.4f}")
    report.log(f"    Mean   : {features.mean():.4f}")
    report.log(f"    Median : {np.median(features):.4f}")
    report.log(f"    Std    : {features.std():.4f}")

    per_dim_mean = features.mean(axis=0)
    per_dim_std = features.std(axis=0)
    report.log("  Per-feature-dimension (summarized across all 256 dims):")
    report.log(f"    Mean of per-dim means : {per_dim_mean.mean():.4f}")
    report.log(f"    Mean of per-dim stds  : {per_dim_std.mean():.4f}")
    report.log(f"    Range of per-dim means: [{per_dim_mean.min():.4f}, {per_dim_mean.max():.4f}]")


# ---------------------------------------------------------------------------
# 7. RELU VERIFICATION
# ---------------------------------------------------------------------------

def check_relu(report: Report, features: np.ndarray):
    report.log("\n--- 7. ReLU Verification ---")
    negative_mask = features < 0
    n_negative = negative_mask.sum()

    if n_negative == 0:
        report.check("ReLU Verification", True, "All feature values are >= 0, consistent with fc_256's ReLU activation.")
    else:
        rows, cols = np.where(negative_mask)
        report.check(
            "ReLU Verification", False,
            fail_explanation=(
                f"  {n_negative} negative value(s) found. Minimum value: {features.min():.6f}\n"
                f"  First few (row, col) indices: {list(zip(rows[:10], cols[:10]))}\n"
                f"  Cause: features were likely extracted from the wrong layer "
                f"(e.g. a pre-activation output, or a different Dense layer "
                f"without ReLU), or the model architecture doesn't actually "
                f"apply ReLU to fc_256.\n"
                f"  Fix: re-check FEATURE_LAYER_NAME in 01_extract_features.py "
                f"and confirm fc_256's activation in the model definition."
            ),
        )


# ---------------------------------------------------------------------------
# 8. DEAD NEURON ANALYSIS
# ---------------------------------------------------------------------------

def dead_neuron_analysis(report: Report, features: np.ndarray):
    report.log("\n--- 8. Dead Neuron Analysis ---")
    zero_frac = (features == 0).mean(axis=0)  # fraction of images where each neuron is exactly 0
    variance = features.var(axis=0)

    always_zero = np.where(zero_frac == 1.0)[0]
    almost_always_zero = np.where((zero_frac > 0.99) & (zero_frac < 1.0))[0]
    low_variance = np.where(variance < 1e-6)[0]

    report.log(f"  Neurons always zero (100% of images)      : {len(always_zero)}"
               + (f"  -> indices: {always_zero.tolist()[:20]}" if len(always_zero) else ""))
    report.log(f"  Neurons almost always zero (>99% of images): {len(almost_always_zero)}"
               + (f"  -> indices: {almost_always_zero.tolist()[:20]}" if len(almost_always_zero) else ""))
    report.log(f"  Neurons with near-zero variance (<1e-6)    : {len(low_variance)}"
               + (f"  -> indices: {low_variance.tolist()[:20]}" if len(low_variance) else ""))

    dead_fraction = len(always_zero) / features.shape[1]
    if dead_fraction > 0.5:
        report.check(
            "Dead Neurons", False,
            fail_explanation=(
                f"  Why: {len(always_zero)}/{features.shape[1]} neurons "
                f"({dead_fraction:.0%}) are always zero — over half the feature "
                f"space is unused.\n"
                f"  Cause: this can happen with ReLU layers ('dying ReLU') if "
                f"training used too high a learning rate on this layer, or if "
                f"the layer was barely trained.\n"
                f"  Fix: this is a property of the already-trained CNN, not the "
                f"extraction script — if this fraction is unexpectedly high, "
                f"consider whether fc_256 is really the best layer to use, or "
                f"proceed but be aware the effective feature dimensionality is "
                f"lower than 256."
            ),
        )
    else:
        report.check(
            "Dead Neurons", True,
            f"{len(always_zero)}/{features.shape[1]} always-zero neurons "
            f"({dead_fraction:.1%}) — within a normal range for a ReLU layer."
        )


# ---------------------------------------------------------------------------
# 9. FEATURE VARIANCE
# ---------------------------------------------------------------------------

def feature_variance_analysis(report: Report, features: np.ndarray):
    report.log("\n--- 9. Feature Variance ---")
    variance = features.var(axis=0)
    constant = np.where(variance == 0.0)[0]
    near_constant = np.where((variance > 0) & (variance < 1e-4))[0]

    report.log(f"  Constant features (variance == 0)     : {len(constant)}")
    report.log(f"  Near-constant features (0 < var<1e-4) : {len(near_constant)}")
    report.log(f"  Variance range across all 256 dims    : [{variance.min():.6f}, {variance.max():.6f}]")

    fig, ax = plt.subplots(figsize=(7, 4))
    ax.hist(variance, bins=40, color="#3B6FE0", alpha=0.8)
    ax.set_xlabel("Feature variance")
    ax.set_ylabel("Number of feature dimensions")
    ax.set_title("Distribution of per-feature variance (256 dims)")
    fig.tight_layout()
    fig.savefig(VARIANCE_PLOT_PATH, dpi=120)
    plt.close(fig)
    report.log(f"  Saved plot: {VARIANCE_PLOT_PATH}")

    if len(constant) > features.shape[1] * 0.1:
        report.check(
            "Feature Variance", False,
            fail_explanation=(
                f"  Why: {len(constant)} features ({len(constant)/features.shape[1]:.0%}) "
                f"have zero variance across all images — they carry no information.\n"
                f"  Cause: likely the same dead-ReLU issue as the dead-neuron check, "
                f"or the input images lack diversity.\n"
                f"  Fix: same as Dead Neurons above — inspect whether this is "
                f"expected for this trained model."
            ),
        )
    else:
        report.check("Feature Variance", True, f"{len(constant)} constant feature(s) — within a normal range.")


# ---------------------------------------------------------------------------
# 10. DEAD FEATURE CHECK (whole-matrix, not all zeros)
# ---------------------------------------------------------------------------

def dead_feature_check(report: Report, features: np.ndarray):
    report.log("\n--- 10. Dead Feature Check (whole matrix) ---")
    avg_activation_per_neuron = features.mean(axis=0)
    max_activation = features.max()
    active_neurons = np.sum(avg_activation_per_neuron > 0)

    report.log(f"  Average activation per neuron (mean of the 256 means): {avg_activation_per_neuron.mean():.4f}")
    report.log(f"  Maximum activation in the whole matrix                : {max_activation:.4f}")
    report.log(f"  Number of active neurons (mean activation > 0)        : {active_neurons}/{features.shape[1]}")

    all_zero = np.all(features == 0)
    if all_zero:
        report.check(
            "Dead Feature Check", False,
            fail_explanation=(
                "  Why: EVERY value in the feature matrix is exactly 0.\n"
                "  Cause: almost certainly a broken feature-extraction run — e.g. "
                "predicting on a zeroed/black input, or extracting from the wrong "
                "(pre-activation, never-called) layer.\n"
                "  Fix: re-run 01_extract_features.py and manually inspect a "
                "single image's feature vector before trusting the batch run."
            ),
        )
    else:
        report.check("Dead Feature Check", True, "Feature matrix is not all zeros.")


# ---------------------------------------------------------------------------
# 11. PCA ANALYSIS
# ---------------------------------------------------------------------------

def pca_analysis(report: Report, features: np.ndarray):
    report.log("\n--- 11. PCA Analysis ---")
    n_components = min(100, features.shape[0], features.shape[1])
    pca = PCA(n_components=n_components, random_state=RANDOM_STATE)
    pca.fit(features)
    cum_var = np.cumsum(pca.explained_variance_ratio_)

    for k in [10, 20, 50, 100]:
        if k <= n_components:
            report.log(f"  Variance explained by top {k:3d} components: {cum_var[k-1]:.2%}")
        else:
            report.log(f"  Variance explained by top {k:3d} components: N/A "
                        f"(only {n_components} components available for this sample size)")

    fig, ax = plt.subplots(figsize=(7, 4))
    ax.plot(np.arange(1, n_components + 1), cum_var, color="#22D3C7")
    ax.set_xlabel("Number of principal components")
    ax.set_ylabel("Cumulative explained variance")
    ax.set_title("PCA — cumulative explained variance")
    ax.axhline(0.95, color="gray", linestyle="--", linewidth=1, label="95%")
    ax.legend()
    fig.tight_layout()
    fig.savefig(PCA_PLOT_PATH, dpi=120)
    plt.close(fig)
    report.log(f"  Saved plot: {PCA_PLOT_PATH}")

    report.check("PCA", True, f"Computed over {n_components} components.")
    return pca


# ---------------------------------------------------------------------------
# 12. t-SNE VISUALIZATION
# ---------------------------------------------------------------------------

def tsne_visualization(report: Report, features: np.ndarray, labels: pd.Series):
    report.log("\n--- 12. t-SNE Visualization ---")
    n_samples = features.shape[0]
    if n_samples < 5:
        report.check(
            "t-SNE", False,
            fail_explanation=(
                f"  Why: only {n_samples} samples available — t-SNE needs a "
                f"meaningfully larger sample to produce anything interpretable.\n"
                f"  Fix: this is expected on a small test run; re-run this "
                f"validation script against the full extracted dataset."
            ),
        )
        return

    perplexity = min(30, max(5, n_samples // 4))
    try:
        tsne = TSNE(n_components=2, perplexity=perplexity, random_state=RANDOM_STATE, init="pca")
        embedding = tsne.fit_transform(features)

        fig, ax = plt.subplots(figsize=(7, 6))
        for cls in sorted(labels.unique()):
            mask = labels == cls
            ax.scatter(embedding[mask, 0], embedding[mask, 1], label=cls, alpha=0.7, s=18)
        ax.set_title("t-SNE of 256-D CNN features, colored by Disease_Class")
        ax.legend()
        fig.tight_layout()
        fig.savefig(TSNE_PLOT_PATH, dpi=120)
        plt.close(fig)

        report.check("t-SNE", True, f"Saved plot: {TSNE_PLOT_PATH} (perplexity={perplexity})")
    except Exception as e:
        report.check(
            "t-SNE", False,
            fail_explanation=(
                f"  Why: t-SNE raised an error: {e}\n"
                f"  Cause: often a perplexity/sample-size mismatch, or NaN/Inf "
                f"values that should have been caught by check #5.\n"
                f"  Fix: re-run check #5 first and confirm it passes."
            ),
        )


# ---------------------------------------------------------------------------
# 13. UMAP VISUALIZATION
# ---------------------------------------------------------------------------

def umap_visualization(report: Report, features: np.ndarray, labels: pd.Series):
    report.log("\n--- 13. UMAP Visualization ---")
    n_samples = features.shape[0]
    if n_samples < 5:
        report.check(
            "UMAP", False,
            fail_explanation=(
                f"  Why: only {n_samples} samples available — UMAP needs a "
                f"meaningfully larger sample.\n"
                f"  Fix: re-run this validation script against the full "
                f"extracted dataset."
            ),
        )
        return

    n_neighbors = min(15, max(2, n_samples - 1))
    try:
        reducer = umap.UMAP(n_neighbors=n_neighbors, n_components=2, random_state=RANDOM_STATE)
        embedding = reducer.fit_transform(features)

        fig, ax = plt.subplots(figsize=(7, 6))
        for cls in sorted(labels.unique()):
            mask = labels == cls
            ax.scatter(embedding[mask, 0], embedding[mask, 1], label=cls, alpha=0.7, s=18)
        ax.set_title("UMAP of 256-D CNN features, colored by Disease_Class")
        ax.legend()
        fig.tight_layout()
        fig.savefig(UMAP_PLOT_PATH, dpi=120)
        plt.close(fig)

        report.check("UMAP", True, f"Saved plot: {UMAP_PLOT_PATH} (n_neighbors={n_neighbors})")
    except Exception as e:
        report.check(
            "UMAP", False,
            fail_explanation=(
                f"  Why: UMAP raised an error: {e}\n"
                f"  Cause: often a n_neighbors/sample-size mismatch, or NaN/Inf "
                f"values.\n"
                f"  Fix: re-run check #5 first and confirm it passes."
            ),
        )


# ---------------------------------------------------------------------------
# 14. CLASS SEPARATION (centroid distances)
# ---------------------------------------------------------------------------

def class_separation(report: Report, features: np.ndarray, labels: pd.Series):
    report.log("\n--- 14. Class Separation (centroid distances) ---")
    classes = sorted(labels.unique())
    centroids = {cls: features[labels == cls].mean(axis=0) for cls in classes}

    dist_matrix = pd.DataFrame(index=classes, columns=classes, dtype=float)
    for c1 in classes:
        for c2 in classes:
            dist_matrix.loc[c1, c2] = np.linalg.norm(centroids[c1] - centroids[c2])

    report.log(dist_matrix.round(3).to_string())
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    dist_matrix.round(4).to_csv(CENTROID_DISTANCE_CSV)
    report.log(f"  Saved: {CENTROID_DISTANCE_CSV}")

    off_diag = dist_matrix.values[~np.eye(len(classes), dtype=bool)]
    min_dist = off_diag.min()
    report.log(f"  Smallest inter-class centroid distance: {min_dist:.3f}")

    if min_dist < 1e-3:
        report.check(
            "Class Separation", False,
            fail_explanation=(
                "  Why: at least two classes have nearly identical centroids "
                "(distance ~0) in feature space.\n"
                "  Cause: the CNN may not be discriminating between these classes "
                "well, or there's a label mixup somewhere in the pipeline.\n"
                "  Fix: check the classification report from your CNN notebook "
                "for these specific classes before trusting fusion results."
            ),
        )
    else:
        report.check(
            "Class Separation", True,
            f"Smallest inter-class centroid distance: {min_dist:.3f} — classes "
            f"are distinguishable in feature space."
        )
    return dist_matrix


# ---------------------------------------------------------------------------
# 15. SILHOUETTE SCORE
# ---------------------------------------------------------------------------

def silhouette_check(report: Report, features: np.ndarray, labels: pd.Series):
    report.log("\n--- 15. Silhouette Score ---")
    n_classes = labels.nunique()
    n_samples = features.shape[0]

    if n_samples <= n_classes or n_classes < 2:
        report.check(
            "Silhouette Score", False,
            fail_explanation=(
                "  Why: not enough samples relative to the number of classes "
                "to compute a meaningful silhouette score.\n"
                "  Fix: re-run against the full dataset."
            ),
        )
        return

    score = silhouette_score(features, labels)
    report.log(f"  Silhouette score: {score:.4f}")
    if score > 0.5:
        interp = "strong, well-separated clusters by disease class."
    elif score > 0.25:
        interp = "moderate separation — classes overlap somewhat in feature space."
    elif score > 0.0:
        interp = "weak separation — substantial overlap between classes."
    else:
        interp = "no meaningful separation, or classes are intermixed/mislabeled."
    report.log(f"  Interpretation: {interp}")

    report.check("Silhouette Score", True, f"{score:.4f} ({interp})")
    return score


# ---------------------------------------------------------------------------
# 16. FEATURE CORRELATION HEATMAP
# ---------------------------------------------------------------------------

def feature_correlation_heatmap(report: Report, features: np.ndarray, n_features_to_plot: int = 40):
    report.log("\n--- 16. Feature Correlation ---")
    rng = np.random.default_rng(RANDOM_STATE)
    n_dims = features.shape[1]
    n_to_plot = min(n_features_to_plot, n_dims)
    selected = np.sort(rng.choice(n_dims, size=n_to_plot, replace=False))

    corr = np.corrcoef(features[:, selected], rowvar=False)

    fig, ax = plt.subplots(figsize=(8, 7))
    im = ax.imshow(corr, cmap="coolwarm", vmin=-1, vmax=1)
    ax.set_title(f"Correlation heatmap — {n_to_plot} randomly selected feature dims")
    ax.set_xticks(range(n_to_plot))
    ax.set_xticklabels(selected, rotation=90, fontsize=6)
    ax.set_yticks(range(n_to_plot))
    ax.set_yticklabels(selected, fontsize=6)
    fig.colorbar(im, ax=ax, label="Pearson correlation")
    fig.tight_layout()
    fig.savefig(CORRELATION_PLOT_PATH, dpi=120)
    plt.close(fig)

    report.log(f"  Saved plot: {CORRELATION_PLOT_PATH}")
    report.check("Feature Correlation", True, f"Computed over {n_to_plot} randomly sampled dimensions.")


# ---------------------------------------------------------------------------
# 17 & 18. SPLIT / DISEASE DISTRIBUTION
# ---------------------------------------------------------------------------

def distribution_checks(report: Report, feature_df: pd.DataFrame):
    report.log("\n--- 17. Split Distribution ---")
    split_counts = feature_df["Split"].value_counts()
    report.log(split_counts.to_string())
    unexpected_splits = set(feature_df["Split"].unique()) - set(EXPECTED_SPLITS)
    if unexpected_splits:
        report.log(f"  NOTE: unexpected split value(s) found: {unexpected_splits}")

    report.log("\n--- 18. Disease Distribution ---")
    disease_counts = feature_df["Disease_Class"].value_counts()
    report.log(disease_counts.to_string())


# ---------------------------------------------------------------------------
# ENTRY POINT
# ---------------------------------------------------------------------------

def main():
    report = Report()
    report.log("DERMAINTEL — Feature Extraction Validation")
    report.log("(read-only: no input files are modified by this script)")

    features = check_feature_shape(report)
    feature_df, feature_cols = check_csv_validation(report, features)
    check_id_consistency(report, feature_df)
    check_duplicates(report, feature_df)
    check_missing_values(report, features)
    report_feature_statistics(report, features)
    check_relu(report, features)
    dead_neuron_analysis(report, features)
    feature_variance_analysis(report, features)
    dead_feature_check(report, features)
    pca_analysis(report, features)

    labels = feature_df["Disease_Class"]
    tsne_visualization(report, features, labels)
    umap_visualization(report, features, labels)
    class_separation(report, features, labels)
    silhouette_check(report, features, labels)
    feature_correlation_heatmap(report, features)
    distribution_checks(report, feature_df)

    all_passed = report.summary_and_save()
    sys.exit(0 if all_passed else 1)


if __name__ == "__main__":
    main()
