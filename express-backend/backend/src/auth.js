// auth.js
//
// The entire authentication layer for DERMAINTEL, kept in one file per
// the agreed architecture. Mounted by app.js as:
//
//   app.use(auth.sessionMiddleware);
//   app.use('/api/auth', auth.router);
//
// `requireAuth` is exported for protecting any future route (e.g.
// /api/predict), but is NOT applied to anything yet -- that's a
// separate decision for a later change to app.js.
//
// Authentication is REQUIRED to work, unlike prediction history, which
// is optional. Every route that touches the database checks
// db.isDatabaseConnected() first and responds 503 if Mongo is down --
// it never silently degrades the way savePrediction()/getHistory() do.
// See database.js's header comment for the matching half of this.
//
// Flow:
//   Signup/Login  -> validate -> argon2id hash/verify -> regenerate
//                    session -> session.userId set -> safe user JSON
//   Logout        -> destroy session -> clear cookie
//   GET /me       -> session.userId present? -> look up user -> JSON
//                    (200 either way; this is a status check, not a
//                    protected resource)
//   Email verify  -> raw token from the link -> SHA-256 hash it ->
//                    match against the stored hash -> mark verified
//   Forgot/Reset  -> same shape as email verify, plus: forgot-password
//                    ALWAYS returns the same generic response whether
//                    or not the email exists, to avoid account
//                    enumeration, and the reset email is sent
//                    fire-and-forget (not awaited) so response timing
//                    doesn't leak whether the account exists either.
//   Google OAuth  -> /google redirects to Google's consent screen ->
//                    /google/callback verifies the ID token, finds-or-
//                    creates/links a User by googleId/email, then
//                    regenerates the session the same way local login
//                    does, and redirects back to the frontend.

const crypto = require('crypto');

const express = require('express');
const argon2 = require('argon2');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');

const db = require('./database');

// ---- Config (all from env; nothing secret is hard-coded) ----
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// In production, a missing SESSION_SECRET must fail startup loudly --
// never silently sign sessions with a secret sitting in source control.
// The insecure fallback below only ever applies outside production.
if (IS_PRODUCTION && !process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required in production.');
}
const SESSION_SECRET = process.env.SESSION_SECRET || 'dev-only-insecure-secret-change-me';
const SESSION_MAX_AGE_MS = Number(process.env.SESSION_MAX_AGE_MS) || 7 * 24 * 60 * 60 * 1000; // 7 days
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL; // e.g. http://localhost:5001/api/auth/google/callback

const EMAIL_FROM = process.env.EMAIL_FROM || 'no-reply@dermaintel.local';
const EMAIL_VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const PASSWORD_RESET_TTL_MS = 60 * 60 * 1000; // 1h

// =====================================================================
// Session store
// =====================================================================
// connect-mongo manages its OWN connection to the same MONGODB_URI,
// rather than trying to reuse mongoose's (which may not be connected
// yet at require-time, since server.js connects it non-blocking after
// the server is already listening). If MONGODB_URI isn't set at all,
// fall back to express-session's built-in MemoryStore so requiring this
// module never crashes the whole app (predictions must keep working
// even with no database configured) -- every auth route below still
// independently checks isDatabaseConnected() and 503s before doing
// anything that needs persistence, so this fallback never silently
// accepts a signup/login it can't actually honor.
let sessionStore;
try {
  if (process.env.MONGODB_URI && process.env.MONGODB_URI.trim()) {
    sessionStore = MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: 'sessions',
      ttl: SESSION_MAX_AGE_MS / 1000,
    });
    // connect-mongo v6 builds TWO internal promises off its connection
    // attempt (clientP, and collectionP derived from it) and catches
    // NEITHER itself -- left alone, a connection failure becomes an
    // unhandled rejection that crashes the entire Node process (taking
    // predictions down too), not just a failed session store. Both
    // must be caught, not just one -- verified directly: catching only
    // clientP still crashes on collectionP's separate rejection.
    sessionStore.clientP.catch((err) => {
      console.warn('⚠️  Mongo session store connection failed:', err.message);
    });
    sessionStore.collectionP.catch(() => {}); // same underlying error, already logged above
  } else {
    console.warn('⚠️  MONGODB_URI not set — sessions will use an in-memory store (auth routes will 503).');
  }
} catch (err) {
  console.warn('⚠️  Failed to initialize Mongo session store — falling back to in-memory:', err.message);
}

const sessionMiddleware = session({
  name: 'dermaintel.sid',
  secret: SESSION_SECRET,
  store: sessionStore, // undefined -> express-session's default MemoryStore
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: IS_PRODUCTION,
    // 'none' is required for the cross-site Vercel-frontend /
    // Render-backend deployment (every request is cross-site, so
    // 'lax' would never send the cookie back); 'none' requires
    // Secure=true, which IS_PRODUCTION already guarantees above.
    // 'lax' is kept for local dev, where frontend/backend are on the
    // same site (e.g. both localhost) and Secure=false is expected.
    sameSite: IS_PRODUCTION ? 'none' : 'lax',
    maxAge: SESSION_MAX_AGE_MS,
  },
});

// =====================================================================
// Small shared helpers
// =====================================================================

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value) {
  return typeof value === 'string' && EMAIL_RE.test(value.trim());
}

function isValidPassword(value) {
  return typeof value === 'string' && value.length >= 8;
}

/** Fields safe to ever send to the client -- never passwordHash or token hashes. */
function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
  };
}

/** Raw token for the emailed link + its SHA-256 hash for storage/lookup. */
function generateToken() {
  const raw = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(raw).digest('hex');
  return { raw, hash };
}

/** Every DB-touching route starts with this -- see module header comment. */
function requireDbOrFail(res) {
  if (!db.isDatabaseConnected()) {
    res.status(503).json({ success: false, error: 'Authentication service is temporarily unavailable.' });
    return false;
  }
  return true;
}

/** Regenerate the session (prevents session fixation) and set the user, waiting for the store write before responding. */
function establishSession(req, userId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) return reject(err);
      req.session.userId = String(userId);
      req.session.save((saveErr) => (saveErr ? reject(saveErr) : resolve()));
    });
  });
}

let mailTransport = null;
function getMailTransport() {
  if (mailTransport) return mailTransport;
  mailTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return mailTransport;
}

/** Fire-and-forget by design -- see module header comment on forgot-password timing. */
function sendMailBestEffort(to, subject, text) {
  getMailTransport()
    .sendMail({ from: EMAIL_FROM, to, subject, text })
    .catch((err) => console.warn('⚠️  Failed to send email:', err.message));
}

const googleClient =
  GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET
    ? new OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL)
    : null;

// =====================================================================
// Rate limiting -- applied to the three routes attackers would brute
// force or abuse for enumeration/spam (login, signup, forgot-password).
// =====================================================================
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many attempts. Please try again later.' },
});

// =====================================================================
// requireAuth -- exported for future protected routes, not applied here
// =====================================================================
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, error: 'Authentication required.' });
  }
  next();
}

// =====================================================================
// Router
// =====================================================================
const router = express.Router();

// ---- POST /signup ----
router.post('/signup', authLimiter, async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Name is required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'A valid email is required.' });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });
    }

    if (!requireDbOrFail(res)) return;

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await db.User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const { raw: verifyToken, hash: verifyTokenHash } = generateToken();

    const user = await db.User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      emailVerified: false,
      emailVerificationTokenHash: verifyTokenHash,
      emailVerificationExpires: new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS),
    });

    sendMailBestEffort(
      user.email,
      'Verify your DermaIntel account',
      `Verify your email: ${CLIENT_ORIGIN}/verify-email?token=${verifyToken}`
    );

    await establishSession(req, user._id);
    return res.status(201).json({ success: true, data: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// ---- POST /login ----
router.post('/login', authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!isValidEmail(email) || typeof password !== 'string' || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    if (!requireDbOrFail(res)) return;

    // Same generic error for "no such user", "Google-only account" (no
    // passwordHash), and "wrong password" -- never reveal which case it was.
    const genericError = () => res.status(401).json({ success: false, error: 'Invalid email or password.' });

    const user = await db.User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !user.passwordHash) return genericError();

    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) return genericError();

    await establishSession(req, user._id);
    return res.status(200).json({ success: true, data: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// ---- POST /logout ----
router.post('/logout', (req, res, next) => {
  if (!req.session) return res.status(200).json({ success: true });
  req.session.destroy((err) => {
    if (err) return next(err);
    res.clearCookie('dermaintel.sid');
    return res.status(200).json({ success: true });
  });
});

// ---- GET /me (current-user / session check) ----
router.get('/me', async (req, res, next) => {
  try {
    if (!req.session || !req.session.userId) {
      return res.status(200).json({ success: true, data: { authenticated: false } });
    }
    if (!requireDbOrFail(res)) return;

    const user = await db.User.findById(req.session.userId);
    if (!user) {
      return res.status(200).json({ success: true, data: { authenticated: false } });
    }
    return res.status(200).json({ success: true, data: { authenticated: true, user: publicUser(user) } });
  } catch (err) {
    next(err);
  }
});

// ---- GET /verify-email?token=... ----
router.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (typeof token !== 'string' || !token) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification link.' });
    }
    if (!requireDbOrFail(res)) return;

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await db.User.findOne({
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired verification link.' });
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpires = null;
    await user.save();

    return res.status(200).json({ success: true, data: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// ---- POST /forgot-password ----
router.post('/forgot-password', authLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, error: 'A valid email is required.' });
    }
    if (!requireDbOrFail(res)) return;

    // Always the same response, found or not -- prevents account
    // enumeration via this endpoint.
    const genericResponse = () =>
      res.status(200).json({ success: true, message: 'If that email exists, a reset link has been sent.' });

    const user = await db.User.findOne({ email: email.trim().toLowerCase() });
    if (user && user.passwordHash) {
      const { raw: resetToken, hash: resetTokenHash } = generateToken();
      user.passwordResetTokenHash = resetTokenHash;
      user.passwordResetExpires = new Date(Date.now() + PASSWORD_RESET_TTL_MS);
      await user.save();

      // Not awaited: keeps response timing identical to the
      // user-not-found path above (see module header comment).
      sendMailBestEffort(
        user.email,
        'Reset your DermaIntel password',
        `Reset your password: ${CLIENT_ORIGIN}/reset-password?token=${resetToken}`
      );
    }

    return genericResponse();
  } catch (err) {
    next(err);
  }
});

// ---- POST /reset-password ----
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    if (typeof token !== 'string' || !token) {
      return res.status(400).json({ success: false, error: 'Invalid or expired reset link.' });
    }
    if (!isValidPassword(newPassword)) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters.' });
    }
    if (!requireDbOrFail(res)) return;

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await db.User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    });
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired reset link.' });
    }

    user.passwordHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    user.passwordResetTokenHash = null;
    user.passwordResetExpires = null;
    await user.save();

    // If the browser making this request happens to still hold an
    // active session (e.g. under the old, possibly-compromised
    // password), don't leave it logged in past the reset -- the whole
    // point of resetting is often "someone else may have access".
    // Deliberately scoped to just THIS session, not every session this
    // user has anywhere: killing all of them would mean reaching into
    // the session store directly (it's keyed by session ID, not
    // userId), a bigger change than this warrants right now.
    if (req.session) {
      req.session.destroy(() => {});
    }

    return res.status(200).json({ success: true, message: 'Password has been reset. Please log in.' });
  } catch (err) {
    next(err);
  }
});

// Both Google routes are reached by full browser navigation (the
// frontend sends the user here via a plain link/redirect, not fetch),
// so unlike every other route in this file, they must NEVER respond
// with a raw JSON error body -- there's no JS on the receiving end to
// parse it, the user would just see raw JSON in their browser instead
// of landing back in the app. Every failure path below redirects back
// into the SPA with a short `?error=<code>` instead; the frontend reads
// that code and shows its own message.
function redirectWithError(res, code) {
  return res.redirect(`${CLIENT_ORIGIN}/login?error=${encodeURIComponent(code)}`);
}

// ---- GET /google (start OAuth) ----
router.get('/google', (req, res, next) => {
  if (!googleClient) {
    return redirectWithError(res, 'google_not_configured');
  }

  // CSRF protection: a random, single-use value bound to this browser's
  // session, checked again on callback below. Without this, an attacker
  // could craft their own Google OAuth link, trick a victim into
  // completing it, and bind the attacker's Google account to the
  // victim's session (login CSRF) -- the whole point of `state` is
  // proving the callback belongs to the same browser that started this
  // flow, not just that it has a valid code from Google.
  const state = crypto.randomBytes(16).toString('hex');
  req.session.oauthState = state;

  req.session.save((err) => {
    if (err) return next(err);
    const url = googleClient.generateAuthUrl({
      scope: ['openid', 'email', 'profile'],
      prompt: 'select_account',
      state,
    });
    return res.redirect(url);
  });
});

// ---- GET /google/callback ----
router.get('/google/callback', async (req, res) => {
  try {
    if (!googleClient) {
      return redirectWithError(res, 'google_not_configured');
    }

    const { code, state } = req.query;

    // Validate `state` BEFORE anything else, and consume it (one-time
    // use) regardless of outcome -- a stolen/replayed callback URL
    // must not be usable twice.
    const expectedState = req.session.oauthState;
    delete req.session.oauthState;
    if (!expectedState || typeof state !== 'string' || state !== expectedState) {
      return redirectWithError(res, 'google_auth_failed');
    }

    if (typeof code !== 'string' || !code) {
      // User denied consent on Google's screen, or Google sent an
      // error instead of a code -- either way, same generic message
      // (never reveal which).
      return redirectWithError(res, 'google_auth_failed');
    }

    if (!db.isDatabaseConnected()) {
      return redirectWithError(res, 'service_unavailable');
    }

    const { tokens } = await googleClient.getToken(code);
    const ticket = await googleClient.verifyIdToken({ idToken: tokens.id_token, audience: GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const name = payload.name || email;

    let user = await db.User.findOne({ googleId });
    if (!user) {
      // Link to an existing local account with the same email, but
      // ONLY if Google itself has verified that email. Without this
      // check, anyone able to create a Google account using someone
      // else's unverified email address could take over an existing
      // DermaIntel account just by signing in with Google -- the
      // email match alone is not proof of ownership, Google's
      // verification of it is.
      user = await db.User.findOne({ email });
      if (user) {
        if (!payload.email_verified) {
          return redirectWithError(res, 'google_email_unverified');
        }
        user.googleId = googleId;
        if (!user.emailVerified) user.emailVerified = true; // Google already verified it
        await user.save();
      } else {
        user = await db.User.create({
          name,
          email,
          googleId,
          emailVerified: Boolean(payload.email_verified),
        });
      }
    }

    await establishSession(req, user._id);
    return res.redirect(CLIENT_ORIGIN);
  } catch (err) {
    // Deliberately NOT next(err) here -- see the comment above this
    // route group for why a JSON error response is wrong for a
    // browser-navigated endpoint. Logged server-side so the real cause
    // (expired code, Google outage, bad audience config, etc.) is still
    // visible in the logs, just not shown raw to the user.
    console.error('Google OAuth callback failed:', err.message);
    return redirectWithError(res, 'google_auth_failed');
  }
});

module.exports = { router, sessionMiddleware, requireAuth };