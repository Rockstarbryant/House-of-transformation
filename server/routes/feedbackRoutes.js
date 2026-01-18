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
  archiveFeedback,
  unarchiveFeedback,
  softDeleteFeedback,
  getRecycledFeedback,
  restoreFromRecycle,
  deleteFeedback,
  getStats
} = require('../controllers/feedbackController');

const router = express.Router();

// ===== PUBLIC ROUTES (NO AUTHENTICATION REQUIRED) =====
// POST submit feedback - supports anonymous
router.post('/', optionalAuth, submitFeedback);

// GET public testimonies list
router.get('/testimonies/public', getPublicTestimonies);

// GET SINGLE PUBLIC TESTIMONY
router.get('/public/:id', getPublicTestimony);

// ===== PROTECTED ROUTES (AUTH + GRANULAR PERMISSIONS) =====

// IMPORTANT: Place specific routes BEFORE wildcard /:id routes

// Stats route - specific
router.get('/stats/overview', protect, requirePermission('view:feedback:stats', 'manage:feedback'), getStats);

// Recycled feedback list - specific
router.get('/recycled/list', protect, requireAdmin, getRecycledFeedback);

// GET all feedback (filtered by user's read permissions)
router.get('/', protect, getAllFeedback);

// GET single feedback - MUST BE AFTER specific routes
router.get('/:id', protect, getFeedback);

// PUT update status
router.put('/:id/status', protect, updateStatus);

// POST respond to feedback
router.post('/:id/respond', protect, respondToFeedback);

// PUT publish testimony
router.put('/:id/publish', protect, requirePermission('publish:feedback:testimony', 'manage:feedback'), publishTestimony);

// PUT archive feedback
router.put('/:id/archive', protect, archiveFeedback);

// PUT unarchive feedback
router.put('/:id/unarchive', protect, unarchiveFeedback);

// PUT soft delete feedback
router.put('/:id/soft-delete', protect, softDeleteFeedback);

// PUT restore from recycle bin
router.put('/:id/restore', protect, requireAdmin, restoreFromRecycle);

// DELETE permanently delete feedback
router.delete('/:id', protect, requireAdmin, deleteFeedback);

module.exports = router;