const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/supabaseAuth');
const {
  getActiveStream,
  getArchives,
  getStreamById,
  createStream,
  updateStream,
  archiveStream,
  addAISummary,
  deleteStream,
  getAnalytics
} = require('../controllers/livestreamController');

// ===== PUBLIC ROUTES (NO AUTH REQUIRED) =====

// MUST come before /:id route
router.get('/active', getActiveStream);
router.get('/archives', getArchives);
router.get('/:id', getStreamById);

// ===== ADMIN ROUTES (AUTH + ADMIN ROLE REQUIRED) =====

router.post('/', protect, authorize('admin'), createStream);
router.put('/:id', protect, authorize('admin'), updateStream);
router.put('/:id/archive', protect, authorize('admin'), archiveStream);
router.put('/:id/ai-summary', protect, authorize('admin'), addAISummary);
router.delete('/:id', protect, authorize('admin'), deleteStream);
router.get('/admin/analytics', protect, authorize('admin'), getAnalytics);

module.exports = router;