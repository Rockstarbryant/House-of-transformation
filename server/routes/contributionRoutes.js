// server/routes/contributionRoutes.js - UPDATED
const express = require('express');
const {
  createContribution,
  initiateMpesaContributionPayment,
  getAllContributions,
  verifyContribution,
  updateContribution,
  deleteContribution
} = require('../controllers/contributionController');

const { protect } = require('../middleware/supabaseAuth');
const { optionalAuth } = require('../middleware/supabaseAuth');
const { requirePermission } = require('../middleware/requirePermission');
const { idempotencyMiddleware } = require('../middleware/idempotencyMiddleware');

const router = express.Router();

// PUBLIC ROUTES
router.post('/', optionalAuth, createContribution);
router.post('/mpesa/initiate', optionalAuth, idempotencyMiddleware, initiateMpesaContributionPayment);


// ADMIN ROUTES
router.get('/', protect, requirePermission('view:payments:all', 'manage:donations'), getAllContributions);
router.patch('/:id/verify', protect, requirePermission('verify:payments', 'manage:donations'), verifyContribution);

// ✅ NEW: Edit and Delete (cash/bank only)
router.put('/:id', protect, requirePermission('verify:payments', 'manage:donations'), updateContribution);
router.delete('/:id', protect, requirePermission('verify:payments', 'manage:donations'), deleteContribution);

module.exports = router;