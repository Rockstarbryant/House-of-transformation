// server/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// General API rate limit (100 requests per 15 minutes per IP)
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

// Strict limit for auth endpoints (5 attempts per 15 minutes)
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again later'
});

// Strict limit for signup (3 per 15 minutes)
exports.signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: 'Too many signup attempts, please try again later'
});