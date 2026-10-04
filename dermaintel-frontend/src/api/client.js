/**
 * api/client.js
 *
 * Thin fetch wrapper around the existing Express backend. This is the
 * ONLY place in the frontend that knows the backend's base URL and
 * HTTP shape. Nothing here changes, extends, or assumes any endpoint,
 * field, or contract beyond what app.js / database.js already expose:
 *
 *   POST /api/predict       multipart/form-data -> { success, data }
 *   GET  /api/predictions   -> { success, data, mongoConnected }
 *   GET  /api/health        -> { success, message, mongoConnected }
 *
 * The browser talks to Express only — it never calls Flask directly.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

/**
 * ApiError
 * Normalizes every failure mode (network, timeout, validation, server,
 * malformed response) into one error shape the UI can branch on.
 *
 * code: 'network' | 'timeout' | 'validation' | 'server' | 'malformed'
 */
export class ApiError extends Error {
  constructor(message, { status = null, code = 'server' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

async function parseJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * submitPrediction
 *
 * Sends the uploaded image plus the five environmental fields to
 * POST /api/predict, using the exact multipart field names app.js
 * expects (temperature, humidity, uv_index, aqi_pm25, stress).
 *
 * Returns the normalized `data` object from Express's
 * { success: true, data } response on success; throws ApiError
 * otherwise.
 */
export async function submitPrediction(file, environment, { signal } = {}) {
  const form = new FormData();
  form.append('image', file, file.name || 'upload.jpg');
  form.append('temperature', String(environment.temperature));
  form.append('humidity', String(environment.humidity));
  form.append('uv_index', String(environment.uvIndex));
  form.append('aqi_pm25', String(environment.aqi));
  form.append('stress', String(environment.stress));

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/predict`, {
      method: 'POST',
      body: form,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError('The analysis is taking longer than expected. Please try again.', {
        code: 'timeout',
      });
    }
    throw new ApiError(
      'Could not reach the DERMAINTEL backend. Make sure the Express server is running and reachable.',
      { code: 'network' }
    );
  }

  const body = await parseJsonSafely(response);

  if (!response.ok || !body || body.success !== true) {
    const message = body?.error || `The backend returned an unexpected error (HTTP ${response.status}).`;
    throw new ApiError(message, {
      status: response.status,
      code: response.status >= 500 ? 'server' : 'validation',
    });
  }

  const data = body.data;
  if (!data || typeof data.condition !== 'string' || typeof data.tier !== 'string') {
    throw new ApiError('The backend returned an incomplete prediction. Please try again.', {
      status: response.status,
      code: 'malformed',
    });
  }

  return data;
}

/**
 * fetchPredictionHistory
 *
 * Calls GET /api/predictions. Returns { entries, mongoConnected } —
 * `entries` is always an array (empty when there's no history yet or
 * MongoDB isn't connected), `mongoConnected` reflects the backend's
 * own flag so the UI can explain an empty list accurately.
 */
export async function fetchPredictionHistory({ signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/predictions`, { signal });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError(
      'Could not reach the DERMAINTEL backend. Make sure the Express server is running and reachable.',
      { code: 'network' }
    );
  }

  const body = await parseJsonSafely(response);

  if (!response.ok || !body || body.success !== true) {
    throw new ApiError(body?.error || `The backend returned an unexpected error (HTTP ${response.status}).`, {
      status: response.status,
      code: 'server',
    });
  }

  return {
    entries: Array.isArray(body.data) ? body.data : [],
    mongoConnected: Boolean(body.mongoConnected),
  };
}
