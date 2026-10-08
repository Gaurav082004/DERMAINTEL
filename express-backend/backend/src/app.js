// app.js
//
// The whole Express application: CORS/body middleware, the /api/predict
// and /api/predictions routes, request validation, the call out to
// Flask, and response normalization into the shape React expects.
//
// React sends the environmental values directly (temperature, humidity,
// uv_index, aqi_pm25, stress) — Express does NOT fetch or derive them
// from anywhere. It only validates, forwards to Flask, and normalizes
// Flask's response.
//
// Flow for POST /api/predict:
//   1. Validate image + temperature + humidity + uv_index + aqi_pm25 + stress
//   2. Send image + those 5 fields to Flask's /predict, renaming
//      stress -> stress_penalty (Flask's field name), everything else
//      passed straight through unchanged
//   3. Normalize Flask's REAL nested response shape
//      (prediction.class, prediction.confidence, risk.score, risk.tier,
//      recommendations[], gradcam, ood, tta_applied, processing_time_ms)
//      into { success, data: {...} } for React
//   4. Best-effort save to MongoDB (never blocks the response)
//   5. Respond to React
//
// Authentication (signup/login/session/etc.) lives entirely in auth.js
// and is mounted below. It does not touch the prediction flow above in
// any way: /api/predict, /api/predictions, and /api/health remain
// exactly as they were -- public, unauthenticated, unchanged responses.
// See the note above the auth wiring below for why.

const express = require('express');
const cors = require('cors');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');

const db = require('./database');
const auth = require('./auth');

const app = express();

// ---- Config ----
const FLASK_URL = process.env.FLASK_URL || 'http://127.0.0.1:5000';
const FLASK_PREDICT_PATH = process.env.FLASK_PREDICT_PATH || '/predict';
const FLASK_TIMEOUT_MS = Number(process.env.FLASK_TIMEOUT_MS) || 30000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Matches app.py's _ALLOWED_IMAGE_CONTENT_TYPES exactly.
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];

// Render (like most PaaS providers) terminates TLS and proxies requests
// to this process through one reverse-proxy hop, setting X-Forwarded-For
// /X-Forwarded-Proto. Trusting exactly that one hop (not an unbounded
// chain -- that would let a client spoof their own X-Forwarded-For and
// bypass rate limiting) is required for two things: auth.js's login/
// signup rate limiter to key off the real client IP instead of
// throwing/misbehaving on the proxy's IP, and for Express to correctly
// recognize the connection as secure (relevant to secure cookies) when
// TLS was terminated upstream. Harmless locally -- with no proxy in
// front of a local dev server, there's no X-Forwarded-* header to trust
// in the first place, so this is a no-op outside of Render.
app.set('trust proxy', 1);

// ---- Middleware ----
app.use(cors({ origin: CLIENT_ORIGIN, methods: ['GET', 'POST'], credentials: true }));
app.use(express.json());

// Authentication layer (signup/login/logout/session/etc.) -- all route
// logic lives in auth.js; this just mounts it. sessionMiddleware is
// applied globally (harmless for routes that never read req.session)
// so any route can check login state consistently without extra wiring.
//
// auth.requireAuth is applied directly on /api/predict and
// /api/predictions below (route-level middleware, not here) -- both
// now require a logged-in session. Everything about the prediction
// logic itself (validation, the Flask call, response shape) is
// unchanged; the only difference is an earlier 401 for logged-out
// requests, same JSON error shape as every other validation failure.
app.use(auth.sessionMiddleware);
app.use('/api/auth', auth.router);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// =====================================================================
// GET /api/health — works with or without MongoDB
// =====================================================================
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'DermaIntel Express backend is running',
    mongoConnected: db.isDatabaseConnected(),
  });
});

// =====================================================================
// GET /api/predictions — returns [] instead of erroring if Mongo is down
// =====================================================================
app.get('/api/predictions', auth.requireAuth, async (req, res) => {
  const history = await db.getHistory(req.session.userId);
  res.json({ success: true, data: history, mongoConnected: db.isDatabaseConnected() });
});

// =====================================================================
// Small validation helper: is this a finite number?
// =====================================================================
function isValidNumber(value) {
  if (value === undefined || value === null || value === '') return false;
  return !Number.isNaN(Number(value)) && Number.isFinite(Number(value));
}

// =====================================================================
// POST /api/predict
// =====================================================================
app.post('/api/predict', auth.requireAuth, upload.single('image'), async (req, res, next) => {
  try {
    // ---- 1. Validate ----
    const { temperature, humidity, uv_index, aqi_pm25, stress } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'An image file is required.' });
    }
    if (!ALLOWED_IMAGE_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported image format. Allowed types: JPEG, PNG.',
      });
    }

    const fields = { temperature, humidity, uv_index, aqi_pm25 };
    for (const [name, value] of Object.entries(fields)) {
      if (!isValidNumber(value)) {
        return res.status(400).json({
          success: false,
          error: `A numeric value for "${name}" is required.`,
        });
      }
    }

    if (!isValidNumber(stress)) {
      return res.status(400).json({ success: false, error: 'A numeric stress value is required.' });
    }
    const stressNum = Number(stress);
    if (stressNum < 1 || stressNum > 10) {
      return res.status(400).json({ success: false, error: 'Stress must be between 1 and 10.' });
    }

    // ---- 2. Forward to Flask with its EXACT field names ----
    // stress -> stress_penalty is the only rename; everything else is
    // passed straight through unchanged.
    const form = new FormData();
    form.append('image', req.file.buffer, {
      filename: req.file.originalname || 'upload.jpg',
      contentType: req.file.mimetype,
    });
    form.append('temperature', String(Number(temperature)));
    form.append('humidity', String(Number(humidity)));
    form.append('uv_index', String(Number(uv_index)));
    form.append('aqi_pm25', String(Number(aqi_pm25)));
    form.append('stress_penalty', String(stressNum));

    let flaskResponse;
    try {
      flaskResponse = await axios.post(`${FLASK_URL}${FLASK_PREDICT_PATH}`, form, {
        headers: form.getHeaders(),
        timeout: FLASK_TIMEOUT_MS,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || err.code === 'ECONNABORTED' || !err.response) {
        return res.status(503).json({
          success: false,
          error: 'The ML inference service is unavailable. Please try again shortly.',
        });
      }

      const flaskStatus = err.response.status;
      const flaskError = err.response.data?.error;

      if (flaskStatus === 400) {
        // Covers app.py's own validation errors AND OOD rejection.
        return res.status(400).json({
          success: false,
          error: flaskError || 'The uploaded image could not be processed.',
        });
      }

      // Any 5xx from Flask -> clean generic message, nothing internal leaked.
      return res.status(502).json({
        success: false,
        error: 'ML inference service encountered an internal error.',
      });
    }

    // ---- 3. Normalize Flask's REAL response shape ----
    const flaskData = flaskResponse.data || {};
    const prediction = flaskData.prediction || {};
    const risk = flaskData.risk || {};

    if (
      !prediction.class ||
      prediction.confidence === undefined ||
      risk.score === undefined ||
      !risk.tier
    ) {
      return res.status(502).json({
        success: false,
        error: 'ML inference service returned an incomplete prediction.',
      });
    }

    const normalized = {
      condition: prediction.class,
      confidence: prediction.confidence,
      severityScore: risk.score,
      tier: risk.tier,
      recommendation: Array.isArray(flaskData.recommendations) ? flaskData.recommendations : [],
      environment: {
        temperature: Number(temperature),
        humidity: Number(humidity),
        uvIndex: Number(uv_index),
        aqi: Number(aqi_pm25),
      },
      stress: stressNum,
      gradcam: flaskData.gradcam || null,
      ood: flaskData.ood || null,
      ttaApplied: flaskData.tta_applied,
      processingTimeMs: flaskData.processing_time_ms,
    };

    // ---- 4. Best-effort save (never blocks the response) ----
    // userId passed separately, not merged into `normalized` -- that
    // object is also the exact response body returned below, and
    // ownership must never leak into the API response shape.
    db.savePrediction(normalized, req.session.userId).catch(() => {});

    // ---- 5. Respond to React ----
    return res.status(200).json({ success: true, data: normalized });
  } catch (err) {
    next(err);
  }
});

// ---- 404 ----
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ---- Centralized error handler ----
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Something went wrong on the server.' : err.message;
  res.status(statusCode).json({ success: false, error: message });
});

module.exports = app;