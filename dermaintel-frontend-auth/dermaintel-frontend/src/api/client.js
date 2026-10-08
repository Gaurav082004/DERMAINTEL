/**
 * api/client.js
 *
 * Thin fetch wrapper around the existing Express backend. This is the
 * ONLY place in the frontend that knows the backend's base URL and
 * HTTP shape.
 *
 *   POST /api/predict              multipart/form-data -> { success, data }
 *   GET  /api/predictions          -> { success, data, mongoConnected }
 *   GET  /api/health               -> { success, message, mongoConnected }
 *   POST /api/auth/signup          { name, email, password } -> { success, data }
 *   POST /api/auth/login           { email, password } -> { success, data }
 *   POST /api/auth/logout          -> { success }
 *   GET  /api/auth/me              -> { success, data: { authenticated, user? } }
 *   GET  /api/auth/verify-email    ?token=... -> { success, data } | { success:false, error }
 *   POST /api/auth/forgot-password { email } -> { success, message } (always, by design)
 *   POST /api/auth/reset-password  { token, newPassword } -> { success, message }
 *   GET  /api/auth/google          full-page redirect, not called via fetch (see
 *                                  getGoogleLoginUrl) -- Express sets the session
 *                                  cookie itself after the OAuth round trip.
 *
 * The browser talks to Express only — it never calls Flask directly.
 *
 * Every auth call includes credentials: 'include' so the browser sends/
 * accepts the HttpOnly session cookie across the Vercel/Render origins
 * (Express's CORS is already configured with credentials: true to match).
 * /api/predict and /api/predictions now require that same session, since
 * they're gated by requireAuth on the backend -- both were updated here
 * accordingly, not just the new auth calls.
 */

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001';

/**
 * ApiError
 * Normalizes every failure mode (network, timeout, validation, server,
 * malformed response) into one error shape the UI can branch on.
 *
 * code: 'network' | 'timeout' | 'validation' | 'server' | 'malformed' | 'auth'
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
 * otherwise. A 401 here means the session expired or was never
 * present -- ApiError's code is 'auth' in that case so callers (e.g.
 * ProtectedRoute, or the page itself) can redirect to /login rather
 * than showing a generic error.
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
      credentials: 'include',
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
      code: response.status === 401 ? 'auth' : response.status >= 500 ? 'server' : 'validation',
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
 * own flag so the UI can explain an empty list accurately. A 401 here
 * (no session) surfaces as ApiError code 'auth', same as above.
 */
export async function fetchPredictionHistory({ signal } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/predictions`, { credentials: 'include', signal });
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
      code: response.status === 401 ? 'auth' : 'server',
    });
  }

  return {
    entries: Array.isArray(body.data) ? body.data : [],
    mongoConnected: Boolean(body.mongoConnected),
  };
}

// =====================================================================
// Authentication
// =====================================================================

/**
 * Shared helper for every /api/auth/* JSON endpoint: sends credentials,
 * JSON-encodes a body when given one, and normalizes failures into
 * ApiError the same way the two functions above do. Returns the full
 * parsed response body (not just `.data`) since a couple of auth
 * endpoints (forgot-password) use `.message` instead of `.data`.
 */
async function authRequest(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(
      'Could not reach the DERMAINTEL backend. Make sure the Express server is running and reachable.',
      { code: 'network' }
    );
  }

  const data = await parseJsonSafely(response);

  if (!response.ok || !data || data.success !== true) {
    throw new ApiError(data?.error || `The backend returned an unexpected error (HTTP ${response.status}).`, {
      status: response.status,
      code: response.status === 401 ? 'auth' : response.status === 429 ? 'rate_limit' : 'validation',
    });
  }

  return data;
}

/** POST /api/auth/signup. Returns the created user on success. */
export async function signup({ name, email, password }) {
  const body = await authRequest('/api/auth/signup', { method: 'POST', body: { name, email, password } });
  return body.data;
}

/** POST /api/auth/login. Returns the logged-in user on success. */
export async function login({ email, password }) {
  const body = await authRequest('/api/auth/login', { method: 'POST', body: { email, password } });
  return body.data;
}

/** POST /api/auth/logout. */
export async function logout() {
  await authRequest('/api/auth/logout', { method: 'POST' });
}

/**
 * GET /api/auth/me — ALWAYS resolves (even when logged out, this is a
 * success response with { authenticated: false }), it only throws on a
 * genuine network/server failure. Used to restore session state on app
 * load.
 */
export async function getCurrentUser() {
  const body = await authRequest('/api/auth/me');
  return body.data;
}

/** GET /api/auth/verify-email?token=... */
export async function verifyEmail(token) {
  const body = await authRequest(`/api/auth/verify-email?token=${encodeURIComponent(token)}`);
  return body.data;
}

/**
 * POST /api/auth/forgot-password — by backend design, this ALWAYS
 * returns the same generic success message whether or not the email
 * exists (prevents account enumeration), so a resolved promise here
 * never implies the email was actually found.
 */
export async function forgotPassword(email) {
  const body = await authRequest('/api/auth/forgot-password', { method: 'POST', body: { email } });
  return body.message;
}

/** POST /api/auth/reset-password */
export async function resetPassword({ token, newPassword }) {
  const body = await authRequest('/api/auth/reset-password', { method: 'POST', body: { token, newPassword } });
  return body.message;
}

/**
 * Google Sign-In is a full-page redirect (the backend does the OAuth
 * round trip and sets the session cookie itself), not a fetch call --
 * this just centralizes the URL the way every other backend contact
 * point lives in this file. Usage: window.location.href = getGoogleLoginUrl()
 * or <a href={getGoogleLoginUrl()}>.
 */
export function getGoogleLoginUrl() {
  return `${API_BASE_URL}/api/auth/google`;
}
