# =============================================================================
# app.py  —  Skin Condition Classification API
# Combines: image classifier + real-time environmental data
# =============================================================================

import os
from flask import Flask, request, jsonify
from flask_cors import CORS

from classifier import predict
from environmental import get_environmental_data, calculate_risk, get_env_recommendations

os.environ["CUDA_VISIBLE_DEVICES"] = "-1"   # Force CPU

app = Flask(__name__)
CORS(app)
app.config["MAX_CONTENT_LENGTH"] = 10 * 1024 * 1024   # 10 MB max upload


# =============================================================================
# ROUTES
# =============================================================================

@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "status":    "running",
        "endpoints": {
            "POST /predict": "image + city + lifestyle -> full prediction",
            "GET  /health":  "server status",
            "GET  /environment?city=Mumbai": "live env data for a city"
        }
    }), 200


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"}), 200


@app.route("/environment", methods=["GET"])
def environment():
    """
    Test endpoint — returns live environmental data for any city.
    Usage: GET /environment?city=Mumbai
    """
    city = request.args.get("city", "Mumbai")
    data = get_environmental_data(city)
    return jsonify(data), 200


@app.route("/predict", methods=["POST"])
def predict_route():
    """
    Main endpoint.

    Form fields:
        image      (file, required)   — JPG / PNG / WebP
        city       (text, optional)   — e.g. Mumbai, Delhi, Bangalore
        stress     (text, optional)   — low / medium / high
        sleep      (text, optional)   — good / average / poor
        diet       (text, optional)   — good / average / poor
        hydration  (text, optional)   — high / medium / low

    Response:
        {
            "prediction":              "Acne",
            "confidence":              0.87,
            "recommendations": {
                "diet":      [...],
                "skincare":  [...],
                "lifestyle": [...],
                "environment_tips": [...]
            },
            "risk_level":   "High",
            "risk_score":   9,
            "risk_breakdown": { ... },
            "environmental_data": {
                "city":        "Mumbai",
                "temperature": 33.2,
                "humidity":    79,
                "uv_index":    7.1,
                "aqi":         3,
                "aqi_label":   "Moderate",
                "pm2_5":       44.2
            }
        }
    """

    # 1. Validate image
    if "image" not in request.files:
        return jsonify({"error": "No image provided. Send a file with field name 'image'."}), 400

    image_file = request.files["image"]
    if image_file.filename == "":
        return jsonify({"error": "Image field is empty."}), 400

    image_bytes = image_file.read()
    if len(image_bytes) == 0:
        return jsonify({"error": "Uploaded file is empty."}), 400

    # 2. Run image classification
    try:
        result = predict(image_bytes)
    except ValueError as e:
        return jsonify({"error": str(e)}), 422
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 503

    predicted_class = result["prediction"]

    # 3. Collect lifestyle inputs
    lifestyle = {}
    for key in ["stress", "sleep", "diet", "hydration"]:
        val = request.form.get(key)
        if val:
            lifestyle[key] = val

    # 4. Fetch real-time environmental data
    city = request.form.get("city", "Mumbai")
    env_data = get_environmental_data(city)

    # 5. Calculate dynamic risk score
    risk = calculate_risk(predicted_class, lifestyle, env_data)

    # 6. Get environment-specific tips
    env_tips = get_env_recommendations(env_data)

    # 7. Add env tips into recommendations
    result["recommendations"]["environment_tips"] = env_tips

    # 8. Build final response
    response = {
        "prediction":         predicted_class,
        "confidence":         result["confidence"],
        "recommendations":    result["recommendations"],
        "risk_level":         risk["risk_level"],
        "risk_score":         risk["risk_score"],
        "risk_breakdown":     risk["breakdown"],
        "environmental_data": env_data,
    }

    return jsonify(response), 200


# =============================================================================
# ERROR HANDLERS
# =============================================================================

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Endpoint not found. Use POST /predict"}), 404

@app.errorhandler(413)
def too_large(e):
    return jsonify({"error": "File too large. Max 10MB."}), 413

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error", "details": str(e)}), 500


# =============================================================================
# RUN
# =============================================================================

if __name__ == "__main__":
    print("=" * 50)
    print("  Skin Condition API  —  http://127.0.0.1:5000")
    print("=" * 50)
    app.run(debug=True, host="0.0.0.0", port=5000)