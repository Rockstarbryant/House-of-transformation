/**
 * HTTP Request Logger Middleware
 *
 * Replaces the raw `morgan` import in server.js with a Morgan instance
 * that writes through Winston → MongoDB.
 *
 * Each HTTP log document stored in app_logs will look like:
 * {
 *   level: 'http',
 *   message: 'POST /api/payments 200 143ms',
 *   timestamp: '2025-03-21 14:22:01.443',
 *   service: 'hot-church-api',
 *   metadata: {
 *     method: 'POST',
 *     url: '/api/payments',
 *     status: 200,
 *     responseTime: '143',
 *     ip: '41.90.xxx.xxx',
 *     userAgent: 'Mozilla/5.0 ...',
 *   }
 * }
 *
 * Usage in server.js:
 *   const requestLogger = require('./middleware/requestLogger');
 *   app.use(requestLogger);
 */

const morgan = require('morgan');
const logger = require('../config/logger');

// ─── Custom Morgan token: real IP behind Render's proxy ──────────────────────
morgan.token('real-ip', (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  );
});

// ─── Morgan format ────────────────────────────────────────────────────────────
// Captures: method, URL, status, response time, IP, and user-agent
const morganFormat =
  ':method :url :status :response-time ms - :real-ip - :user-agent';

// ─── Skip health-check and static routes (no noise in MongoDB) ───────────────
const skipRoutes = (req) => {
  const skip = ['/api/health', '/status', '/uploads'];
  return skip.some((path) => req.originalUrl.startsWith(path));
};

// ─── Morgan instance with Winston stream ─────────────────────────────────────
const requestLogger = morgan(morganFormat, {
  stream: logger.stream,
  skip: skipRoutes,
});

module.exports = requestLogger;