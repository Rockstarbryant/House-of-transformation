// server/routes/mpesaCallbackRoutes.js - ✅ NEW FILE
const express = require('express');
const {
  handleStkPushCallback,
  handleC2BValidation,
  handleC2BConfirmation,
  registerC2BUrls
} = require('../controllers/mpesaCallbackController');

const { protect } = require('../middleware/supabaseAuth');
const { requirePermission } = require('../middleware/requirePermission');

const router = express.Router();

// ============================================
// PUBLIC ROUTES (M-Pesa callbacks)
// These endpoints are called by Safaricom servers
// Do NOT apply authentication middleware
// ============================================

// STK Push callback (for contributions and pledges)
router.post('/stk/callback', handleStkPushCallback);

// C2B validation (called before accepting payment)
router.post('/c2b/validation', handleC2BValidation);

// C2B confirmation (called after payment is accepted)
router.post('/c2b/confirmation', handleC2BConfirmation);

// ============================================
// ADMIN ROUTES (for registering URLs with M-Pesa)
// ============================================

// Register C2B URLs with M-Pesa API
router.post('/c2b/register', protect, requirePermission('manage:donations'), registerC2BUrls);

module.exports = router;