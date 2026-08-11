// server.js
//
// Entry point. Starts Express immediately — MongoDB is attempted in the
// background and NEVER blocks or fails startup. The prediction pipeline
// (React -> Express -> Flask -> Express -> React) works with or without it.
//
// SIGINT/SIGTERM close the MongoDB connection cleanly (if it's open)
// before the process exits.

require('dotenv').config();

const app = require('./app');
const db = require('./database');

const PORT = process.env.PORT || 5001;

const server = app.listen(PORT, () => {
  console.log(`✅ DermaIntel Express backend running on http://localhost:${PORT}`);
  console.log(`➡️  Forwarding ML requests to: ${process.env.FLASK_URL || 'http://127.0.0.1:5000'}`);
});

// Fire-and-forget: connects if MONGODB_URI is set and reachable, otherwise
// just logs a warning. Either way, the server above is already listening.
db.connectDB();

async function shutdown(signal) {
  console.log(`\n${signal} received — shutting down...`);
  server.close(async () => {
    await db.disconnectDB();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
