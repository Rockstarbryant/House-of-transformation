// server/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

// General API rate limit (100 requests per 15 minutes per IP)
exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'Too many requests, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false
});

// Strict limit for auth endpoints (10 attempts per 15 minutes)
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: 'Too many login attempts, please try again after 15 minutes'
});

// Strict limit for signup (5 per 15 minutes)
exports.signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many signup attempts, please try again later'
});