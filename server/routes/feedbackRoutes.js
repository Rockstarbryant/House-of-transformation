const express = require('express');
const {
  submitFeedback,
  getAllFeedback,
  getFeedback,
  getPublicTestimonies,
  updateStatus,
  respondToFeedback,
  publishTestimony,
  deleteFeedback,
  getStats
} = require('../controllers/feedbackController');
const { protect, authorize, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Public routes (NO authentication required)
router.post('/', optionalAuth, submitFeedback); // optionalAuth attaches user if logged in
router.get('/testimonies/public', getPublicTestimonies);

// Admin routes
router.get('/', protect, authorize('admin', 'pastor', 'bishop'), getAllFeedback);
router.get('/stats', protect, authorize('admin', 'pastor', 'bishop'), getStats);
router.get('/:id', protect, authorize('admin', 'pastor', 'bishop'), getFeedback);
router.put('/:id/status', protect, authorize('admin', 'pastor', 'bishop'), updateStatus);
router.post('/:id/respond', protect, authorize('admin', 'pastor', 'bishop'), respondToFeedback);
router.put('/:id/publish', protect, authorize('admin', 'pastor', 'bishop'), publishTestimony);
router.delete('/:id', protect, authorize('admin'), deleteFeedback);

module.exports = router;