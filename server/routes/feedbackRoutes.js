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

// ===== PUBLIC ROUTES (NO authentication required) =====
// POST submit feedback - supports anonymous
router.post('/', optionalAuth, submitFeedback);

// GET public testimonies - anyone can view
router.get('/testimonies/public', getPublicTestimonies);

// ✅ NEW: Get single public testimony by ID
router.get('/testimonies/public/:id', async (req, res) => {
  try {
    const testimony = await Feedback.findById(req.params.id);

    if (!testimony || testimony.status !== 'published' || !testimony.isPublic) {
      return res.status(404).json({
        success: false,
        message: 'Testimony not found'
      });
    }

    res.json({
      success: true,
      feedback: testimony
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: 'Testimony not found'
    });
  }
});

// ===== ADMIN ROUTES (MUST come BEFORE generic /api/feedback routes) =====
// IMPORTANT: Put specific routes BEFORE generic ones!
// GET /api/feedback/stats - MUST be before GET /api/feedback/:id
router.get('/stats', protect, authorize('admin', 'pastor', 'bishop'), getStats);

// ===== ADMIN ROUTES (Generic - catches all other feedback endpoints) =====
// GET all feedback - with filters
router.get('/', protect, authorize('admin', 'pastor', 'bishop'), getAllFeedback);

// GET single feedback by ID
router.get('/:id', protect, authorize('admin', 'pastor', 'bishop'), getFeedback);

// PUT update feedback status
router.put('/:id/status', protect, authorize('admin', 'pastor', 'bishop'), updateStatus);

// POST respond to feedback
router.post('/:id/respond', protect, authorize('admin', 'pastor', 'bishop'), respondToFeedback);

// PUT publish testimony
router.put('/:id/publish', protect, authorize('admin', 'pastor', 'bishop'), publishTestimony);

// DELETE feedback
router.delete('/:id', protect, authorize('admin'), deleteFeedback);

module.exports = router;