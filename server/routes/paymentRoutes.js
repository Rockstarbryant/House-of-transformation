// server/routes/paymentRoutes.js
const express = require('express');
const {
  initiateMpesaPayment,
  mpesaCallback,
  recordManualPayment,
  getUserPayments,
  getAllPayments
} = require('../controllers/paymentController');

const { protect } = require('../middleware/supabaseAuth');
const { requirePermission } = require('../middleware/requirePermission');
const { idempotencyMiddleware } = require('../middleware/idempotencyMiddleware');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// ✅ RATE LIMITERS FOR PAYMENT ENDPOINTS

// Strict rate limit on payment initiation (prevent spam/DoS)
const paymentInitiateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 payment initiations per 15 minutes per IP/user
  message: {
    success: false,
    message: 'Too many payment requests. Please wait 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    // Rate limit by user ID if authenticated, IP if not
    return req.user ? req.user._id.toString() : req.ip;
  }
});

// Moderate rate limit on manual payment recording (admin action)
const manualPaymentLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Max 20 manual payments per minute
  message: {
    success: false,
    message: 'Too many requests. Please wait.'
  },
  keyGenerator: (req, res) => req.user._id.toString()
});

// Webhook callback (no rate limit - M-Pesa server)
// But add timeout protection
const callbackTimeout = (req, res, next) => {
  req.setTimeout(10000); // 10 second timeout for webhooks
  next();
};

// ============================================
// PUBLIC ROUTES
// ============================================

// ✅ M-Pesa webhook callback (no auth, timeout protection)
router.post('/mpesa-callback', callbackTimeout, mpesaCallback);

// ============================================
// USER ROUTES (Protected, Authenticated)
// ============================================

// Initiate M-Pesa payment for pledge
// ✅ REQUIRES: idempotency-key header + rate limiting
router.post(
  '/mpesa/initiate',
  protect,
  paymentInitiateLimiter,
  idempotencyMiddleware,
  initiateMpesaPayment
);

// Get user's own payment history
// ✅ No rate limit, just authentication
router.get('/history', protect, getUserPayments);

// ============================================
// ADMIN/PRIVILEGED ROUTES
// ============================================

// Record manual payment (admin only)
// ✅ REQUIRES: process:payments permission + rate limiting
router.post(
  '/manual',
  protect,
  manualPaymentLimiter,
  requirePermission('process:payments', 'manage:donations'),
  recordManualPayment
);

// Get all payments (admin only)
// ✅ REQUIRES: view:payments:all permission
router.get(
  '/',
  protect,
  requirePermission('view:payments:all', 'manage:donations'),
  getAllPayments
);

module.exports = router;