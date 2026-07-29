# =============================================================================
# environmental.py
# Handles: real-time weather + pollution data from OpenWeatherMap
#          and dynamic risk score calculation
# API key loaded securely from .env file
# =============================================================================

import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# ── API Config (loaded from .env — never hardcoded) ───────────────────────────
API_KEY       = os.getenv("OPENWEATHER_API_KEY")
WEATHER_URL   = "https://api.openweathermap.org/data/2.5/weather"
UV_URL        = "https://api.openweathermap.org/data/2.5/uvi"
POLLUTION_URL = "http://api.openweathermap.org/data/2.5/air_pollution"

if not API_KEY:
    raise EnvironmentError("OPENWEATHER_API_KEY not found. Check your .env file.")


def get_environmental_data(city: str) -> dict:
    """
    Fetches real-time environmental data for a given city.

    Returns:
        {
            "city":        "Mumbai",
            "temperature": 32.4,
            "humidity":    78,
            "uv_index":    7.2,
            "aqi":         3,
            "aqi_label":   "Moderate",
            "pm2_5":       42.3,
            "description": "haze"
        }
    """
    env = {
        "city":        city,
        "temperature": None,
        "humidity":    None,
        "uv_index":    None,
        "aqi":         None,
        "aqi_label":   None,
        "pm2_5":       None,
        "description": None,
    }

    # Step 1: Weather (temperature, humidity, coordinates)
    try:
        r = requests.get(WEATHER_URL, params={
            "q":     city,
            "appid": API_KEY,
            "units": "metric"
        }, timeout=5)
        r.raise_for_status()
        data = r.json()

        env["temperature"] = round(data["main"]["temp"], 1)
        env["humidity"]    = data["main"]["humidity"]
        env["description"] = data["weather"][0]["description"]
        lat = data["coord"]["lat"]
        lon = data["coord"]["lon"]

    except Exception as e:
        print(f"Weather API error: {e}")
        return env

    # Step 2: UV Index
    try:
        r = requests.get(UV_URL, params={
            "lat":   lat,
            "lon":   lon,
            "appid": API_KEY,
        }, timeout=5)
        r.raise_for_status()
        env["uv_index"] = round(r.json().get("value", 0), 1)
    except Exception as e:
        print(f"UV API error: {e}")

    # Step 3: Air Pollution (AQI + PM2.5)
    try:
        r = requests.get(POLLUTION_URL, params={
            "lat":   lat,
            "lon":   lon,
            "appid": API_KEY,
        }, timeout=5)
        r.raise_for_status()
        pollution        = r.json()["list"][0]
        aqi_value        = pollution["main"]["aqi"]
        env["aqi"]       = aqi_value
        env["aqi_label"] = {1: "Good", 2: "Fair", 3: "Moderate", 4: "Poor", 5: "Very Poor"}.get(aqi_value, "Unknown")
        env["pm2_5"]     = round(pollution["components"].get("pm2_5", 0), 1)
    except Exception as e:
        print(f"Pollution API error: {e}")

    return env


def calculate_risk(prediction: str, lifestyle: dict, env: dict) -> dict:
    """
    Calculates dynamic risk score from prediction + lifestyle + real-time env data.

    Lifestyle scoring:
        stress:    high=3, medium=2, low=0
        sleep:     poor=2, average=1, good=0
        diet:      poor=2, average=1, good=0
        hydration: low=2,  medium=1,  high=0

    Environmental scoring (real-time):
        aqi:      VeryPoor/Poor=3, Moderate=2, Fair=1, Good=0
        uv_index: >=8 → +2,  >=5 → +1
        humidity: >=80% or <=20% → +1

    Condition multiplier:
        eczema=1.3, alopecia=1.2, acne=1.1, healthy=0.8
    """
    ls = {k.lower(): str(v).lower() for k, v in lifestyle.items()}

    # Lifestyle score
    lifestyle_score = 0
    stress = ls.get("stress", "low")
    if stress == "high":       lifestyle_score += 3
    elif stress == "medium":   lifestyle_score += 2

    sleep = ls.get("sleep", "good")
    if sleep == "poor":        lifestyle_score += 2
    elif sleep == "average":   lifestyle_score += 1

    diet = ls.get("diet", "good")
    if diet == "poor":         lifestyle_score += 2
    elif diet == "average":    lifestyle_score += 1

    hydration = ls.get("hydration", "high")
    if hydration == "low":     lifestyle_score += 2
    elif hydration == "medium": lifestyle_score += 1

    # Environmental score
    env_score = 0
    aqi_label = (env.get("aqi_label") or "Good").lower()
    if "very poor" in aqi_label or "poor" in aqi_label: env_score += 3
    elif "moderate" in aqi_label:                        env_score += 2
    elif "fair" in aqi_label:                            env_score += 1

    uv = env.get("uv_index") or 0
    if uv >= 8:   env_score += 2
    elif uv >= 5: env_score += 1

    humidity = env.get("humidity") or 50
    if humidity >= 80 or humidity <= 20:
        env_score += 1

    # Condition multiplier
    multiplier = {"eczema": 1.3, "alopecia": 1.2, "acne": 1.1, "healthy": 0.8}.get(prediction.lower(), 1.0)
    total_score = round((lifestyle_score + env_score) * multiplier)

    if total_score <= 3:    risk_level = "Low"
    elif total_score <= 7:  risk_level = "Medium"
    else:                   risk_level = "High"

    return {
        "risk_level":  risk_level,
        "risk_score":  total_score,
        "breakdown": {
            "lifestyle_score":      lifestyle_score,
            "environment_score":    env_score,
            "condition_multiplier": multiplier,
        }
    }


def get_env_recommendations(env: dict) -> list:
    """Returns real-time tips based on live environmental conditions."""
    tips = []

    aqi_label = (env.get("aqi_label") or "Good").lower()
    if "poor" in aqi_label or "moderate" in aqi_label:
        tips.append(f"Air quality is {env.get('aqi_label')} (PM2.5: {env.get('pm2_5')} µg/m³) please wear a mask outdoors")
        tips.append("Use a HEPA air purifier indoors to reduce particulate exposure on skin")

    uv = env.get("uv_index") or 0
    if uv >= 8:
        tips.append(f"UV index is very high ({uv}) — apply SPF 50+ and avoid sun between 10am to 4pm")
    elif uv >= 5:
        tips.append(f"UV index is moderate ({uv}) — apply SPF 30+ before going outdoors")

    humidity = env.get("humidity") or 50
    if humidity >= 80:
        tips.append(f"Humidity is very high ({humidity}%) — use a light non-comedogenic moisturiser")
    elif humidity <= 30:
        tips.append(f"Humidity is low ({humidity}%) — use a heavier moisturiser and drink extra water")

    temp = env.get("temperature") or 25
    if temp >= 35:
        tips.append(f"Temperature is {temp}°C — avoid heavy makeup and stay in shade")

    if not tips:
        tips.append(f"Environmental conditions in {env.get('city', 'your city')} are currently favourable for skin health")

    return tips
