/**
 * Winston Logger — H.O.T Church API
 *
 * Single transport: MongoDB Atlas (winston-mongodb)
 * Collection: app_logs  (30-day TTL, capped at 50k docs)
 *
 * Usage anywhere in the backend:
 *   const logger = require('../config/logger');
 *   logger.info('Payment initiated', { userId, amount, checkoutRequestId });
 *   logger.error('M-Pesa callback failed', { error: err.message, stack: err.stack });
 */

const { createLogger, format } = require('winston');
const { MongoDB: MongoTransport } = require('winston-mongodb');

const { combine, timestamp, errors, json, metadata } = format;

// ─── Shared format for all transports ────────────────────────────────────────
// Produces structured JSON with: level, message, timestamp, service, metadata{}
const structuredFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  errors({ stack: true }), // captures err.stack when an Error is passed
  metadata({                // moves all extra fields into a nested `metadata` key
    fillExcept: ['message', 'level', 'timestamp', 'service'],
  }),
  json()
);

// ─── MongoDB transport ────────────────────────────────────────────────────────
const mongoTransport = new MongoTransport({
  db: process.env.MONGODB_URI,
  collection: 'app_logs',

  // Only persist info and above to MongoDB (debug stays local in dev)
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',

  // Connection options — keep the pool small so the transport doesn't compete
  // with your main Mongoose connection. useUnifiedTopology removed — deprecated
  // since MongoDB Node driver v4 and causes a console warning.
  options: {
    maxPoolSize: 2,
    minPoolSize: 1,
  },

  // Keep the last 50k log documents
  capped: true,
  cappedMax: 50000,

  // 30-day TTL index on the `timestamp` field — Atlas will auto-expire old logs
  expireAfterSeconds: 60 * 60 * 24 * 30,

  format: structuredFormat,

  // Let winston handle uncaught exceptions / unhandled rejections through this transport
  handleExceptions: true,
  handleRejections: true,

  // Store the parsed metadata object rather than a stringified blob
  storeHost: true,  // also records the server hostname in each doc
  label: 'hot-church-api',
});

// Emit a warning if the transport fails (e.g. Atlas down) rather than crashing
mongoTransport.on('error', (err) => {
  // Can't use logger here (circular), so fall back to stderr
  process.stderr.write(`[winston-mongodb] transport error: ${err.message}\n`);
});

// ─── Logger instance ──────────────────────────────────────────────────────────
const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',

  defaultMeta: {
    service: 'hot-church-api',
    environment: process.env.NODE_ENV || 'development',
  },

  transports: [mongoTransport],

  // Do NOT exit the process on a handled exception
  exitOnError: false,
});

// ─── HTTP-level helper (used by requestLogger middleware) ─────────────────────
// Morgan → winston stream bridge
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

module.exports = logger;