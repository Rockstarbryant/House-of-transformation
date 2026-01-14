// feedbackRoutes.js

const express = require('express');
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
const { protect, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ===== PUBLIC ROUTES (NO authentication required) =====
// POST submit feedback - supports anonymous
router.post('/', optionalAuth, submitFeedback);

// GET public testimonies list
router.get('/testimonies/public', getPublicTestimonies);

// ✅ GET SINGLE PUBLIC TESTIMONY - MUST BE BEFORE generic /:id route
router.get('/public/:id', getPublicTestimony); // Use controller to get single

// ===== ADMIN ROUTES (MUST come BEFORE generic routes) =====
router.get('/stats', protect, authorize('admin', 'pastor', 'bishop'), getStats);

// ===== ADMIN ROUTES (Generic - catches all other feedback endpoints) =====
router.get('/', protect, authorize('admin', 'pastor', 'bishop'), getAllFeedback);
router.get('/:id', protect, authorize('admin', 'pastor', 'bishop'), getFeedback);
router.put('/:id/status', protect, authorize('admin', 'pastor', 'bishop'), updateStatus);
router.post('/:id/respond', protect, authorize('admin', 'pastor', 'bishop'), respondToFeedback);
router.put('/:id/publish', protect, authorize('admin', 'pastor', 'bishop'), publishTestimony);
router.delete('/:id', protect, authorize('admin'), deleteFeedback);

module.exports = router;