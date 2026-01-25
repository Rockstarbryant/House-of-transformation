// server/routes/donationAnalyticsRoutes.js
const express = require('express');
const {
  getDashboardAnalytics,
  getCampaignAnalytics
} = require('../controllers/donationAnalyticsController');

const { protect } = require('../middleware/supabaseAuth');
const { requirePermission } = require('../middleware/requirePermission');

const router = express.Router();

// ============================================
// ANALYTICS ROUTES
// ============================================

/**
 * GET /api/donations/analytics/dashboard
 * Requires: view:donation:reports OR manage:donations
 * Returns: Complete dashboard analytics with all charts data
 */
router.get(
  '/dashboard',
  protect,
  requirePermission('view:donation:reports', 'manage:donations'),
  getDashboardAnalytics
);

/**
 * GET /api/donations/analytics/campaign/:campaignId
 * Requires: view:campaigns OR manage:donations
 * Returns: Detailed analytics for a specific campaign
 */
router.get(
  '/campaign/:campaignId',
  protect,
  requirePermission('view:campaigns', 'manage:donations'),
  getCampaignAnalytics
);

module.exports = router;