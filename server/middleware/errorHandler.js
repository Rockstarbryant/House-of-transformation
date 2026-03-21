/**
 * Global Error Handler — H.O.T Church API
 *
 * FULL REPLACEMENT for middleware/errorHandler.js
 *
 * Logs all errors to MongoDB via Winston, then sends a JSON response.
 *
 * Sentry error capture is handled upstream in server.js via:
 *   Sentry.setupExpressErrorHandler(app)  ← correct v10 API, called before this
 *
 * That call sets res.sentry (Sentry event ID) on 500 errors, which this
 * handler includes in the response body so users can quote it to you.
 */

const logger = require('../config/logger');

// ─── Main error handler ───────────────────────────────────────────────────────
const errorHandler = (err, req, res, next) => {
  // ── Determine status code ──────────────────────────────────────────────────
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Server error';

  // ── Mongoose: invalid ObjectId ─────────────────────────────────────────────
  if (err.name === 'CastError') {
    statusCode = 404;
    message = 'Resource not found';
  }

  // ── Mongoose: duplicate key ────────────────────────────────────────────────
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    message = `${field} already exists`;
  }

  // ── Mongoose: validation error ─────────────────────────────────────────────
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  // ── JWT errors ─────────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // ── Log to MongoDB via Winston ─────────────────────────────────────────────
  const logPayload = {
    statusCode,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip || req.headers['x-forwarded-for'],
    userId: req.user?._id?.toString(),
    userEmail: req.user?.email,
    userAgent: req.headers['user-agent'],
    // Only log body on non-auth routes and scrub sensitive fields
    ...(req.originalUrl.includes('/auth/')
      ? {}
      : { body: sanitiseBody(req.body) }),
  };

  if (statusCode >= 500) {
    logger.error(message, {
      ...logPayload,
      stack: err.stack,
      sentryEventId: res.sentry, // set by Sentry.setupExpressErrorHandler upstream
    });
  } else if (statusCode >= 400) {
    logger.warn(message, logPayload);
  }

  // ── Respond ────────────────────────────────────────────────────────────────
  const body = {
    success: false,
    message:
      process.env.NODE_ENV === 'production' && statusCode === 500
        ? 'An unexpected error occurred. Our team has been notified.'
        : message,
  };

  // Include Sentry event ID in 500 responses so users can quote it back to you
  if (statusCode === 500 && res.sentry) {
    body.errorRef = res.sentry;
  }

  // Include validation details for 400 errors
  if (statusCode === 400 && err.name === 'ValidationError') {
    body.errors = Object.values(err.errors).map((e) => e.message);
  }

  // Full stack in development
  if (process.env.NODE_ENV !== 'production') {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
};

// ─── Utility: strip sensitive keys from request body before logging ───────────
function sanitiseBody(body) {
  if (!body || typeof body !== 'object') return body;
  const SENSITIVE = new Set([
    'password', 'confirmPassword', 'currentPassword', 'newPassword',
    'token', 'refreshToken', 'mpesaConsumerKey', 'mpesaConsumerSecret',
    'mpesaPasskey', 'smtpPassword', 'apiKey', 'serviceKey',
  ]);
  return Object.fromEntries(
    Object.entries(body).map(([k, v]) =>
      SENSITIVE.has(k) ? [k, '[Filtered]'] : [k, v]
    )
  );
}

module.exports = { errorHandler };
/*
// server/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  // Log error (implement proper logging)
  console.error({
    timestamp: new Date().toISOString(),
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  // Mongoose errors
  if (err.name === 'CastError') {
    return res.status(404).json({
      success: false,
      message: 'Resource not found',
      ...(process.env.NODE_ENV === 'development' && { error: err.message })
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: messages
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Server error' 
    : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { 
      error: err.message,
      stack: err.stack 
    })
  });
};

module.exports = errorHandler;
*/

/**
 * Global Error Handler — H.O.T Church API
 *
 * FULL REPLACEMENT for middleware/errorHandler.js
 *
 * Changes from original:
 *  1. All errors are logged to MongoDB via Winston before responding
 *  2. Unhandled errors are captured by Sentry with full context
 *  3. Sentry's error handler is exported separately so server.js can
 *     mount it immediately before this handler (required by Sentry)
 *
 * Mount order in server.js (important):
 *   app.use(Sentry.expressErrorHandler());  // must come before errorHandler
 *   app.use(errorHandler);
 */

