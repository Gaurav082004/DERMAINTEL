# =============================================================================
# classifier.py
# Handles: model loading, image preprocessing, skin condition prediction
# =============================================================================

import io
import numpy as np
from PIL import Image
from tensorflow.keras.models import load_model

# ── Config ────────────────────────────────────────────────────────────────────
MODEL_PATH  = r"C:\Users\GAURAV\project\ml\best_skin_model_finetuned.keras"
IMG_SIZE    = (224, 224)
CLASS_NAMES = ["acne", "alopecia", "eczema", "healthy"]

# ── Recommendations per condition ─────────────────────────────────────────────
RECOMMENDATIONS = {
    "acne": {
        "diet":      ["Avoid oily/fried foods", "Reduce dairy intake", "Drink 8-10 glasses of water daily", "Eat zinc-rich foods: pumpkin seeds, lentils"],
        "skincare":  ["Wash face twice daily with gentle cleanser", "Use oil-free moisturiser and SPF", "Apply salicylic acid 2% on affected areas", "Never pop pimples"],
        "lifestyle": ["Reduce stress through meditation or walks", "Aim for 7-9 hours sleep", "Shower immediately after exercise"],
    },
    "alopecia": {
        "diet":      ["Increase protein: eggs, lean meat, legumes", "Iron-rich foods: spinach, lentils, red meat", "Biotin-rich foods: nuts, eggs, sweet potatoes", "Omega-3: salmon, walnuts, flaxseeds"],
        "skincare":  ["Massage scalp 5 mins daily for circulation", "Use mild sulfate-free shampoo", "Avoid tight hairstyles", "Protect scalp from sun with hat or SPF spray"],
        "lifestyle": ["Manage stress — cortisol triggers alopecia", "Avoid heat styling tools", "Get thyroid and hormonal levels checked"],
    },
    "eczema": {
        "diet":      ["Avoid trigger foods: dairy, eggs, soy, wheat", "Anti-inflammatory foods: turmeric, fatty fish", "Stay well-hydrated", "Consider probiotic supplements"],
        "skincare":  ["Moisturise within 3 mins of bathing", "Use fragrance-free moisturiser (CeraVe, Eucerin)", "Avoid harsh soaps and detergents", "Take lukewarm showers only"],
        "lifestyle": ["Keep indoor humidity at 45-55%", "Avoid scratching — keep nails short", "Use HEPA air purifier at home"],
    },
    "healthy": {
        "diet":      ["Maintain balanced diet with fruits and vegetables", "Drink 8 glasses of water daily", "Limit processed foods and added sugars"],
        "skincare":  ["Apply SPF 30+ every morning", "Exfoliate gently once a week", "Use Vitamin C serum for antioxidant protection"],
        "lifestyle": ["Maintain 7-9 hours sleep", "Exercise 3-5 times per week", "Annual skin check with dermatologist"],
    },
}

# ── Load model once at startup ─────────────────────────────────────────────────
print("Loading skin classification model...")
try:
    _model = load_model(MODEL_PATH)
    _model.predict(np.zeros((1, 224, 224, 3), dtype=np.float32), verbose=0)
    print("Model loaded successfully.")
except Exception as e:
    print(f"ERROR loading model: {e}")
    _model = None


def preprocess(image_bytes: bytes) -> np.ndarray:
    """Convert raw image bytes to model-ready numpy array."""
    try:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except Exception:
        raise ValueError("Invalid image file. Send a JPG, PNG or WebP.")
    img = img.resize(IMG_SIZE, Image.LANCZOS)
    arr = np.array(img, dtype=np.float32) / 255.0
    return np.expand_dims(arr, axis=0)  # shape: (1, 224, 224, 3)


def predict(image_bytes: bytes) -> dict:
    """
    Run prediction on image bytes.
    Returns dict with class, confidence, and recommendations.
    """
    if _model is None:
        raise RuntimeError("Model not loaded. Check MODEL_PATH.")

    arr         = preprocess(image_bytes)
    probs       = _model.predict(arr, verbose=0)[0]
    idx         = int(np.argmax(probs))
    class_name  = CLASS_NAMES[idx]
    confidence  = round(float(probs[idx]), 4)

    return {
        "prediction":      class_name.capitalize(),
        "confidence":      confidence,
        "recommendations": RECOMMENDATIONS[class_name],
    }