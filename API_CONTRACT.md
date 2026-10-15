# DERMAINTEL API Contract

This document summarizes the known integration contract for DERMAINTEL's
Express application API and Flask ML inference service. Verify it
against route definitions in the current branch before treating it as a
formal external API specification.

## Service flow

``` text
React frontend
    |
    | HTTP / multipart form-data
    v
Express API (local port 5001)
    |
    | forwards image and contextual values
    v
Flask ML API (local port 5000)
    |
    | prediction, risk, recommendations, Grad-CAM
    v
Express normalizes response and stores relevant prediction data
    |
    v
React frontend
```

## 1. Express prediction endpoint

### `POST /api/predict`

Purpose: accept a skin image and contextual information, invoke Flask
inference, and return a prediction result.

**Content type:** `multipart/form-data`

Known form fields:

  Field           Type             Meaning
  --------------- ---------------- ------------------------------------
  `image`         File             Uploaded skin image
  `temperature`   Numeric string   Temperature
  `humidity`      Numeric string   Humidity
  `uv_index`      Numeric string   UV index
  `aqi_pm25`      Numeric string   Air-quality / PM2.5 value
  `stress`        Numeric string   Stress level, expected range 1--10

Confirm exact accepted ranges, validation rules, file-size limits, and
supported image formats in the current Express route and Flask
validation code.

### Successful response

The known Express response shape is:

``` json
{
  "success": true,
  "data": {
    "condition": "Acne",
    "confidence": 0.84,
    "severityScore": 42,
    "tier": "Medium",
    "recommendation": ["Example recommendation"],
    "environment": {
      "temperature": 28,
      "humidity": 60,
      "uvIndex": 5,
      "aqi": 35
    },
    "stress": 5,
    "gradcam": null,
    "ood": null,
    "ttaApplied": true,
    "processingTimeMs": 3500
  }
}
```

This is illustrative, not a guaranteed live response. Values are
examples; `gradcam` may contain a visual payload/reference or be null,
and optional fields may differ by implementation. Confirm the exact
serializer in the current Express route. The Flask response does not
necessarily include an `ood` field.

### Prediction history

A known route is:

`GET /api/predictions`

It retrieves saved predictions according to the route's access rules.
Confirm authentication middleware, query parameters, pagination, and
response shape in the current Express route.

## 2. Flask ML inference endpoint

### `POST /predict`

Purpose: classify an image and return risk information, recommendations,
and explainability output.

Express forwards the image and these contextual fields to Flask:

  Field              Type         Meaning
  ------------------ ------------ -----------------------------------
  Image upload       File/bytes   Skin image to classify
  `temperature`      Numeric      Temperature
  `humidity`         Numeric      Humidity
  `uv_index`         Numeric      UV index
  `aqi_pm25`         Numeric      Air quality / PM2.5
  `stress_penalty`   Numeric      Stress input forwarded by Express

The frontend field is known as `stress`; the Flask service has been
described as expecting `stress_penalty`. Verify that Express maps the
fields correctly in the current route.

### Successful response

Known intended Flask response structure:

``` json
{
  "prediction": {
    "class": "Acne",
    "class_index": 0,
    "confidence": 0.84
  },
  "risk": {
    "score": 42,
    "tier": "Medium"
  },
  "recommendations": ["Example recommendation"],
  "gradcam": null,
  "tta_applied": true,
  "processing_time_ms": 3500
}
```

This is illustrative. Confirm class-index mapping, confidence
representation, Grad-CAM encoding, and optional fields against the
current Flask implementation.

### Prediction pipeline

1.  Validate the uploaded image and contextual inputs.
2.  Preprocess the image and run CNN inference.
3.  Determine the final condition used for risk prediction.
4.  For Acne, Alopecia, or Eczema, build the contextual vector and
    disease one-hot encoding for the MLP.
5.  For Healthy Skin, bypass the MLP and assign score `0`, tier `Low`.
6.  Map the score to a risk tier.
7.  Generate recommendations.
8.  Attempt Grad-CAM generation.
9.  Return the result to Express.

Grad-CAM may be handled as a best-effort step; verify current exception
handling before assuming it cannot fail the request.

## 3. Risk scoring

The MLP input is described as eight values:

-   Temperature
-   Humidity
-   UV index
-   Air quality (AQI/PM2.5)
-   Stress
-   Acne one-hot value
-   Alopecia one-hot value
-   Eczema one-hot value

Healthy Skin bypasses the MLP and receives a score of `0`.

  Score       Tier
  ----------- --------
  `0–33`      Low
  `>33–66`    Medium
  `>66–100`   High

Scores are project estimates and are not clinically validated medical
assessments.

## 4. Authentication and other routes

The project includes authentication-related backend work. Exact route
paths, request bodies, cookie settings, session/token behavior, and
authorization requirements must be taken from the current authentication
route files. They are not enumerated here without verified route
definitions.

Do not infer signup, login, logout, profile, or password-reset endpoint
names from frontend screen names alone.

## 5. Error handling

Errors may occur due to invalid uploads, missing or invalid contextual
values, inference failures, unavailable downstream services, database
errors, or authentication/authorization failures.

Exact HTTP status codes and error JSON shapes must be confirmed in the
current Express and Flask exception handlers.

For debugging:

-   Check Express logs for forwarding and response-normalization errors.
-   Check Flask logs for image preprocessing, CNN, MLP, and Grad-CAM
    errors.
-   Confirm `FLASK_URL` points to a reachable Flask service.
-   Confirm required model and scaler artifacts are available.
-   Keep credentials and internal exception details out of client-facing
    responses.

## 6. Known local configuration

  Service            Local address
  ------------------ -------------------------
  React frontend     `http://localhost:5173`
  Express API        `http://localhost:5001`
  Flask ML service   `http://127.0.0.1:5000`

Known configuration names include `VITE_API_URL`, `FLASK_URL`,
`CLIENT_ORIGIN`, `MONGODB_URI`, and possibly `PORT`. Verify exact names
and defaults in the current branch.

## 7. Contract verification checklist

Before treating this document as authoritative, verify:

-   [ ] Express route path and HTTP method for prediction.
-   [ ] Image upload parser and exact file field name.
-   [ ] Form field names and validation ranges.
-   [ ] Express-to-Flask multipart field mapping.
-   [ ] Exact Express success response and optional fields.
-   [ ] Prediction-history route and authorization rules.
-   [ ] Authentication endpoint paths and cookie/token behavior.
-   [ ] HTTP status codes and error response shapes.
-   [ ] Grad-CAM representation and failure behavior.
-   [ ] Required environment variables and model artifact paths.

This document distinguishes known integration details from items
requiring verification in the current source.
