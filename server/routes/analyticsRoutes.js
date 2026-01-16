// server/routes/analyticsRoutes.js
const express = require('express');
const {
  getOverview,
  getUserAnalytics,
  getContentAnalytics,
  getEngagementAnalytics,
  getRecentActivity,
  getGrowthTrends
} = require('../controllers/analyticsController');

const { protect } = require('../middleware/supabaseAuth');
const { requirePermission } = require('../middleware/requirePermission');

const router = express.Router();

console.log('[ANALYTICS-ROUTES] Initializing analytics routes...');

// ============================================
// ANALYTICS ROUTES (require view:analytics permission)
// ============================================

// Overview dashboard stats
router.get('/overview', protect, requirePermission('view:analytics'), getOverview);

// User analytics
router.get('/users', protect, requirePermission('view:analytics'), getUserAnalytics);

// Content analytics (sermons, blogs, gallery)
router.get('/content', protect, requirePermission('view:analytics'), getContentAnalytics);

// Engagement analytics (feedback, volunteers, events, livestreams)
router.get('/engagement', protect, requirePermission('view:analytics'), getEngagementAnalytics);

// Recent activity timeline
router.get('/activity', protect, requirePermission('view:analytics'), getRecentActivity);

// Growth trends over time
router.get('/trends', protect, requirePermission('view:analytics'), getGrowthTrends);

console.log('[ANALYTICS-ROUTES] Routes registered successfully');

module.exports = router;