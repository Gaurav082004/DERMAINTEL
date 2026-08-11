// database.js
//
// MongoDB is OPTIONAL. This file guarantees that:
//   - connectDB() never throws and never blocks server startup
//   - savePrediction() and getHistory() silently no-op / return []
//     whenever Mongo isn't connected
//
// Nothing else in the app should touch mongoose directly — this is the
// only file that knows MongoDB exists, so it can be swapped out later
// without touching app.js's prediction flow.

const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema(
  {
    condition: String,
    confidence: Number,
    environment: {
      city: String,
      temperature: Number,
      humidity: Number,
      uvIndex: Number,
      aqi: Number,
    },
    stress: Number,
    severityScore: Number,
    tier: String,
    recommendation: mongoose.Schema.Types.Mixed,
    gradcam: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const Prediction = mongoose.model('Prediction', predictionSchema);

let isConnected = false;

/**
 * Attempts to connect to MongoDB if MONGODB_URI is set.
 * Never throws — logs a warning and leaves isConnected=false on any failure.
 * Safe to call once at startup; the rest of the app checks isConnected
 * before ever touching the database.
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri || !uri.trim()) {
    console.warn('⚠️  MONGODB_URI not set — running WITHOUT prediction history persistence.');
    return false;
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    isConnected = true;
    console.log('✅ MongoDB connected — prediction history persistence is ON.');
  } catch (err) {
    isConnected = false;
    console.warn('⚠️  MongoDB connection failed — continuing WITHOUT persistence.');
    console.warn(`   Reason: ${err.message}`);
  }

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    console.warn('⚠️  MongoDB disconnected — persistence paused.');
  });

  mongoose.connection.on('connected', () => {
    isConnected = true;
  });

  return isConnected;
}

/**
 * Saves a normalized prediction result. No-ops quietly if Mongo isn't
 * connected — this must NEVER throw or delay the response to React.
 */
async function savePrediction(data) {
  if (!isConnected) return;

  try {
    await Prediction.create(data);
  } catch (err) {
    console.warn('⚠️  Failed to save prediction to MongoDB:', err.message);
  }
}

/**
 * Returns recent prediction history, most recent first.
 * Returns [] (not an error) if Mongo isn't connected.
 */
async function getHistory(limit = 50) {
  if (!isConnected) return [];

  try {
    return await Prediction.find().sort({ createdAt: -1 }).limit(limit);
  } catch (err) {
    console.warn('⚠️  Failed to read prediction history from MongoDB:', err.message);
    return [];
  }
}

function isDatabaseConnected() {
  return isConnected;
}

/**
 * Closes the MongoDB connection cleanly, if one is open.
 * Safe to call even when Mongo was never connected.
 */
async function disconnectDB() {
  if (mongoose.connection.readyState === 0) return;
  try {
    await mongoose.connection.close();
    console.log('🛑 MongoDB connection closed.');
  } catch (err) {
    console.warn('⚠️  Error while closing MongoDB connection:', err.message);
  }
}

module.exports = { connectDB, savePrediction, getHistory, isDatabaseConnected, disconnectDB };
