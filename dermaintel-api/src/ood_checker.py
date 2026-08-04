"""
DERMAINTEL — Out-of-Distribution (OOD) Detection Utilities
=============================================================

Pure NumPy heuristics for flagging a softmax prediction as likely
out-of-distribution (i.e. the input probably doesn't belong to any of the
4 trained classes: Acne, Alopecia, Eczema, Healthy). These functions do
NOT load or call any model — they operate purely on an already-computed
probability vector.

No TensorFlow. No classes. Exactly two public functions, as specified.
"""

import numpy as np

NUM_CLASSES = 4


def is_ood_maxprob(probs, threshold=0.60):
    """
    Flag a prediction as out-of-distribution using the max-probability
    heuristic.

    If the model's single highest class probability is below `threshold`,
    the model isn't confidently committing to ANY of the 4 classes — a
    common signal that the input doesn't resemble the training
    distribution (e.g. it isn't a skin image at all).

    Parameters
    ----------
    probs : np.ndarray
        1D array of 4 softmax probabilities, e.g. [0.03, 0.82, 0.10, 0.05].
    threshold : float, default 0.60
        OOD is flagged when max(probs) < threshold.

    Returns
    -------
    bool
        True if max(probs) < threshold (flagged OOD), False otherwise.

    Raises
    ------
    ValueError
        If `probs` is not a 1D NumPy array of length 4.
    """
    if not isinstance(probs, np.ndarray):
        raise ValueError(f"probs must be a NumPy array, got {type(probs)}.")
    if probs.ndim != 1:
        raise ValueError(f"probs must be one-dimensional, got shape {probs.shape}.")
    if probs.shape[0] != NUM_CLASSES:
        raise ValueError(f"probs must have length {NUM_CLASSES}, got {probs.shape[0]}.")

    max_prob = np.max(probs)
    return bool(max_prob < threshold)


def is_ood_entropy(probs, threshold=1.2):
    """
    Flag a prediction as out-of-distribution using Shannon entropy.

    Computes:
        H = -sum(p * log(p))
    over the 4 class probabilities. High entropy means probability mass is
    spread relatively evenly across classes (the model is "unsure" among
    several classes at once) — a second, complementary OOD signal to the
    max-probability check above. A prediction can have a moderately high
    max probability yet still have unusually high entropy if the remaining
    mass is spread unevenly across the other 3 classes, so the two checks
    are not redundant.

    A small epsilon is added inside the log to avoid log(0) for any class
    with probability exactly 0.0.

    Parameters
    ----------
    probs : np.ndarray
        1D array of 4 softmax probabilities.
    threshold : float, default 1.2
        OOD is flagged when entropy > threshold. Note: for 4 classes, the
        maximum possible entropy (uniform distribution) is ln(4) ≈ 1.386,
        so a threshold of 1.2 sits fairly close to maximum uncertainty.

    Returns
    -------
    bool
        True if entropy > threshold (flagged OOD), False otherwise.

    Raises
    ------
    ValueError
        If `probs` is not a 1D NumPy array of length 4.
    """
    if not isinstance(probs, np.ndarray):
        raise ValueError(f"probs must be a NumPy array, got {type(probs)}.")
    if probs.ndim != 1:
        raise ValueError(f"probs must be one-dimensional, got shape {probs.shape}.")
    if probs.shape[0] != NUM_CLASSES:
        raise ValueError(f"probs must have length {NUM_CLASSES}, got {probs.shape[0]}.")

    epsilon = 1e-12
    entropy = -np.sum(probs * np.log(probs + epsilon))
    return bool(entropy > threshold)


def combine_ood(probs, maxprob_threshold=0.60, entropy_threshold=1.2):
    """
    Combine the max-probability and entropy OOD heuristics into a single
    verdict.

    This function does not duplicate either heuristic's logic — it simply
    calls `is_ood_maxprob()` and `is_ood_entropy()` and reports which one(s)
    triggered.

    Parameters
    ----------
    probs : np.ndarray
        1D array of 4 softmax probabilities. Validated by the underlying
        `is_ood_maxprob()` / `is_ood_entropy()` calls, which will raise
        ValueError on malformed input.
    maxprob_threshold : float, default 0.60
        Threshold forwarded to `is_ood_maxprob()`.
    entropy_threshold : float, default 1.2
        Threshold forwarded to `is_ood_entropy()`.

    Returns
    -------
    tuple[bool, str]
        (True, "Low maximum probability")
            Only the max-probability check triggered.
        (True, "High prediction entropy")
            Only the entropy check triggered.
        (True, "Both low confidence and high entropy")
            Both checks triggered.
        (False, "Prediction accepted")
            Neither check triggered.
    """
    low_confidence = is_ood_maxprob(probs, threshold=maxprob_threshold)
    high_entropy = is_ood_entropy(probs, threshold=entropy_threshold)

    if low_confidence and high_entropy:
        return True, "Both low confidence and high entropy"
    if low_confidence:
        return True, "Low maximum probability"
    if high_entropy:
        return True, "High prediction entropy"
    return False, "Prediction accepted"


if __name__ == "__main__":
    # High confidence prediction: one class clearly dominates.
    high_confidence_probs = np.array([0.03, 0.90, 0.05, 0.02])

    # Low confidence prediction: no class reaches the maxprob threshold.
    low_confidence_probs = np.array([0.30, 0.35, 0.20, 0.15])

    # High entropy prediction: probability mass spread fairly evenly.
    high_entropy_probs = np.array([0.28, 0.27, 0.24, 0.21])

    test_cases = [
        ("High confidence prediction", high_confidence_probs),
        ("Low confidence prediction", low_confidence_probs),
        ("High entropy prediction", high_entropy_probs),
    ]

    for label, probs in test_cases:
        print(f"\n{label}: probs={probs}")
        print(f"  is_ood_maxprob -> {is_ood_maxprob(probs)}")
        print(f"  is_ood_entropy -> {is_ood_entropy(probs)}")
        print(f"  combine_ood    -> {combine_ood(probs)}")
