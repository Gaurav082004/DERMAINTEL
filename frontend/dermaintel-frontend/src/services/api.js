// services/api.js
//
// The ONLY file that talks to the Express backend. Every request in the
// app goes through here — components never build fetch calls themselves.
// This is also the single place that would need to change if the
// backend's base URL or contract ever moves.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001';

/**
 * Runs a full prediction: uploads the image + environmental values to
 * Express's /api/predict, which forwards to Flask and normalizes the
 * response.
 *
 * @param {Object} params
 * @param {File} params.image
 * @param {number|string} params.temperature
 * @param {number|string} params.humidity
 * @param {number|string} params.uvIndex
 * @param {number|string} params.aqiPm25
 * @param {number|string} params.stress
 * @returns {Promise<Object>} the parsed `data` object from a successful response
 * @throws {Error} with a user-facing `.message` on any failure
 */
export async function runPrediction({ image, temperature, humidity, uvIndex, aqiPm25, stress }) {
  const formData = new FormData();
  formData.append('image', image);
  formData.append('temperature', temperature);
  formData.append('humidity', humidity);
  formData.append('uv_index', uvIndex);
  formData.append('aqi_pm25', aqiPm25);
  formData.append('stress', stress);

  let response;
  try {
    response = await fetch(`${API_URL}/api/predict`, {
      method: 'POST',
      body: formData,
    });
  } catch (networkErr) {
    throw new Error(
      'Could not reach the DermaIntel server. Check that the Express backend is running.'
    );
  }

  let body;
  try {
    body = await response.json();
  } catch (parseErr) {
    throw new Error('The server returned an unreadable response.');
  }

  if (!response.ok || !body.success) {
    throw new Error(body?.error || 'Analysis failed. Please try again.');
  }

  return body.data;
}

/**
 * Fetches recent prediction history. Returns [] on any failure so the
 * History section can degrade gracefully instead of blocking the page.
 */
export async function fetchHistory() {
  try {
    const response = await fetch(`${API_URL}/api/predictions`);
    const body = await response.json();
    if (!response.ok || !body.success) return [];
    return body.data || [];
  } catch {
    return [];
  }
}

/**
 * Checks backend health. Used to show a subtle connection status if needed.
 */
export async function checkHealth() {
  try {
    const response = await fetch(`${API_URL}/api/health`);
    const body = await response.json();
    return body;
  } catch {
    return { success: false };
  }
}
