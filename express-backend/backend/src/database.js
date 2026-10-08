// database.js
//
// MongoDB is OPTIONAL for predictions, but REQUIRED for authentication.
// This file guarantees two different, deliberate behaviors side by side:
//
//   - Prediction functions: connectDB() never throws/blocks startup,
//     and savePrediction()/getHistory() silently no-op / return []
//     whenever Mongo isn't connected -- this degrade-gracefully
//     behavior is unchanged. What's new: every prediction is now owned
//     by the authenticated user who created it (userId, required),
//     and getHistory() only ever returns that same user's own history.
//
//   - The User model (new, for auth.js): Mongoose's default command
//     buffering is turned OFF for this schema only (bufferCommands:
//     false below), so a query made while disconnected fails fast and
//     explicitly instead of hanging until a buffering timeout. auth.js
//     is expected to check isDatabaseConnected() before any User
//     operation and return 503 if false -- auth must hard-fail when the
//     database is down, it must never silently degrade the way
//     predictions do.
//
// Nothing else in the app should touch mongoose directly except through
// what's exported here (the Prediction helpers, the User model, and the
// shared `mongoose` instance itself for session-store reuse in auth.js)
// -- this remains the only file that knows MongoDB exists.

const mongoose = require('mongoose');

const predictionSchema = new mongoose.Schema(
  {
    // Required: /api/predict is gated by auth.requireAuth, so every
    // real call site always has req.session.userId. Enforced at the
    // schema level (not just by convention in app.js) so a future bug
    // that somehow calls savePrediction() without a userId fails loudly
    // instead of silently saving an orphaned, unowned prediction.
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
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
    gradcam: mongoose.Schema.Types.Mixed,
    ood: mongoose.Schema.Types.Mixed,
    ttaApplied: Boolean,
    processingTimeMs: Number,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Every history read now filters by userId AND sorts by createdAt (see
// getHistory() below) -- a compound index serves both in one index,
// making a standalone createdAt index redundant for this access pattern.
predictionSchema.index({ userId: 1, createdAt: -1 });

const Prediction = mongoose.model('Prediction', predictionSchema);

// =====================================================================
// User schema (for auth.js) — Argon2id hashes, not raw passwords;
// verification/reset TOKENS ARE STORED HASHED (SHA-256, by auth.js
// before writing here), not in plaintext, so a database leak doesn't
// directly expose usable tokens. The raw token is only ever shown to
// the user once, in the emailed link.
// =====================================================================
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Null for Google-only accounts (no local password set).
    passwordHash: { type: String, default: null },
    // No `default: null` here, deliberately: a sparse index only
    // excludes documents where the field is genuinely MISSING, not
    // documents where it's explicitly stored as null -- Mongo treats
    // multiple explicit nulls as duplicate values for a unique index.
    // With no default, Mongoose simply omits this path entirely for
    // email/password users (no field written at all, not even null),
    // which is what makes `sparse` actually work as intended: any
    // number of password-only accounts can coexist, only two accounts
    // both genuinely linked to the same real Google ID collide.
    googleId: { type: String, unique: true, sparse: true },
    emailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, default: null },
    emailVerificationExpires: { type: Date, default: null },
    passwordResetTokenHash: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
  },
  { timestamps: true, bufferCommands: false }
);

userSchema.index({ emailVerificationTokenHash: 1 }, { sparse: true });
userSchema.index({ passwordResetTokenHash: 1 }, { sparse: true });

const User = mongoose.model('User', userSchema);

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
 * Saves a normalized prediction result, owned by `userId` (the
 * authenticated requester -- req.session.userId, always present since
 * /api/predict is gated by auth.requireAuth). No-ops quietly if Mongo
 * isn't connected — this must NEVER throw or delay the response to
 * React. `data` is the exact object already being returned to the
 * client; userId is passed separately rather than merged into it, so
 * the saved document can carry ownership without that field ever
 * leaking into the API response shape.
 */
async function savePrediction(data, userId) {
  if (!isConnected) return;

  try {
    await Prediction.create({ ...data, userId });
  } catch (err) {
    console.warn('⚠️  Failed to save prediction to MongoDB:', err.message);
  }
}

/**
 * Returns `userId`'s own recent prediction history, most recent first
 * -- never another user's. Returns [] (not an error) if Mongo isn't
 * connected.
 */
async function getHistory(userId, limit = 50) {
  if (!isConnected) return [];

  try {
    return await Prediction.find({ userId }).sort({ createdAt: -1 }).limit(limit);
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

module.exports = {
  connectDB,
  savePrediction,
  getHistory,
  isDatabaseConnected,
  disconnectDB,
  // For auth.js: query User directly with standard Mongoose methods
  // (findOne, create, findById, save, ...) — always check
  // isDatabaseConnected() first and return 503 if false; see the
  // schema comment above for why. No wrapper functions are provided
  // here deliberately, to keep this file compact (per the agreed plan)
  // rather than adding a thin per-query function for every lookup
  // auth.js needs (by email, by id, by token, by googleId, ...).
  User,
  // So connect-mongo (the session store) can reuse this exact
  // connection instead of opening a second independent one:
  //   MongoStore.create({ client: mongoose.connection.getClient() })
  mongoose,
};