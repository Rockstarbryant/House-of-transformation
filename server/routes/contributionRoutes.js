// server/routes/contributionRoutes.js
const express = require('express');
const {
  createContribution,
  initiateMpesaContributionPayment,
  getAllContributions,
  verifyContribution
} = require('../controllers/contributionController');

const { protect } = require('../middleware/supabaseAuth');
const { optionalAuth } = require('../middleware/supabaseAuth');
const { requirePermission } = require('../middleware/requirePermission');

const router = express.Router();

// PUBLIC ROUTES - Anyone can contribute
router.post('/', optionalAuth, createContribution);
router.post('/mpesa/initiate', optionalAuth, initiateMpesaContributionPayment);

// ADMIN ROUTES - View and manage contributions
router.get('/', protect, requirePermission('view:payments:all', 'manage:donations'), getAllContributions);
router.patch('/:id/verify', protect, requirePermission('verify:payments', 'manage:donations'), verifyContribution);

module.exports = router;