const express = require('express');
const { protect } = require('../middleware/supabaseAuth');
const { requirePermission, requireAdmin } = require('../middleware/requirePermission');
const { optionalAuth } = require('../middleware/supabaseAuth');
const {
  submitFeedback,
  getAllFeedback,
  getFeedback,
  getPublicTestimonies,
  getPublicTestimony,
  updateStatus,
  respondToFeedback,
  publishTestimony,
  deleteFeedback,
  getStats
} = require('../controllers/feedbackController');

const router = express.Router();

// ===== PUBLIC ROUTES (NO AUTHENTICATION REQUIRED) =====
// POST submit feedback - supports anonymous
router.post('/', optionalAuth, submitFeedback);

// GET public testimonies list
router.get('/testimonies/public', getPublicTestimonies);

// GET SINGLE PUBLIC TESTIMONY (MUST BE BEFORE generic /:id route)
router.get('/public/:id', getPublicTestimony);

// ===== PROTECTED ROUTES (AUTH + manage:feedback PERMISSION REQUIRED) =====
router.get('/stats', protect, requirePermission('manage:feedback'), getStats);
router.get('/', protect, requirePermission('manage:feedback'), getAllFeedback);
router.get('/:id', protect, requirePermission('manage:feedback'), getFeedback);
router.put('/:id/status', protect, requirePermission('manage:feedback'), updateStatus);
router.post('/:id/respond', protect, requirePermission('manage:feedback'), respondToFeedback);
router.put('/:id/publish', protect, requirePermission('manage:feedback'), publishTestimony);

// ===== ADMIN ONLY ROUTE =====
router.delete('/:id', protect, requireAdmin, deleteFeedback);

module.exports = router;