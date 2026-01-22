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

const router = express.Router();

// ============================================
// PUBLIC ROUTES
// ============================================

// M-Pesa webhook callback (no auth)
router.post('/mpesa-callback', mpesaCallback);

// ============================================
// USER ROUTES
// ============================================

// Initiate M-Pesa payment
router.post('/mpesa/initiate', protect, initiateMpesaPayment);

// Get user's own payment history
router.get('/history', protect, getUserPayments);

// ============================================
// ADMIN/PRIVILEGED ROUTES - GRANULAR PERMISSIONS
// ============================================

// Record manual payment (requires process:payments)
router.post('/manual', protect, requirePermission('process:payments', 'manage:donations'), recordManualPayment);

// Get all payments (requires view:payments:all)
router.get('/', protect, requirePermission('view:payments:all', 'manage:donations'), getAllPayments);

module.exports = router;