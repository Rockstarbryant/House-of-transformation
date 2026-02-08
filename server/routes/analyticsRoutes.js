// server/routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/supabaseAuth');
const analyticsController = require('../controllers/analyticsController');

/**
 * All analytics routes require admin permission
 */
router.use(protect);

/**
 * @route   GET /api/analytics/overview
 * @desc    Get overview statistics
 * @access  Private/Admin
 */
router.get('/overview', analyticsController.getOverview);

/**
 * @route   GET /api/analytics/users
 * @desc    Get user analytics
 * @access  Private/Admin
 */
router.get('/users', analyticsController.getUserAnalytics);

/**
 * @route   GET /api/analytics/content
 * @desc    Get content analytics (sermons, blogs, events, gallery)
 * @access  Private/Admin
 */
router.get('/content', analyticsController.getContentAnalytics);

/**
 * @route   GET /api/analytics/engagement
 * @desc    Get engagement analytics (feedback, volunteers, livestreams)
 * @access  Private/Admin
 */
router.get('/engagement', analyticsController.getEngagementAnalytics);

/**
 * @route   GET /api/analytics/financial
 * @desc    Get financial analytics (campaigns, pledges, payments)
 * @access  Private/Admin
 */
router.get('/financial', analyticsController.getFinancialAnalytics);

/**
 * @route   GET /api/analytics/communication
 * @desc    Get communication analytics (emails, announcements)
 * @access  Private/Admin
 */
router.get('/communication', analyticsController.getCommunicationAnalytics);

/**
 * @route   GET /api/analytics/system
 * @desc    Get system analytics (audit logs, banned users, activity)
 * @access  Private/Admin
 */
router.get('/system', analyticsController.getSystemAnalytics);

module.exports = router;