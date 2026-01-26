const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/supabaseAuth');
const { requirePermission } = require('../middleware/requirePermission');
const {
  getActiveStream,
  getArchives,
  getStreamById,
  createStream,
  updateStream,
  archiveStream,
  addAISummary,
  deleteStream,
  getTranscript,
  updateTranscript,
  extractTranscript,
  generateSummaryFromTranscript,
  getAnalytics
} = require('../controllers/livestreamController');

// ===== PUBLIC ROUTES (NO AUTH REQUIRED) =====
router.get('/active', getActiveStream);
// Get transcript (PUBLIC - view only)
router.get('/:id/transcript', getTranscript);
router.get('/archives', getArchives);
router.get('/:id', getStreamById);

// ===== PROTECTED ROUTES (AUTH + manage:livestream PERMISSION REQUIRED) =====
router.post('/', protect, requirePermission('manage:livestream'), createStream);
router.put('/:id', protect, requirePermission('manage:livestream'), updateStream);
router.put('/:id/archive', protect, requirePermission('manage:livestream'), archiveStream);
router.put('/:id/ai-summary', protect, requirePermission('manage:livestream'), addAISummary);
router.delete('/:id', protect, requirePermission('manage:livestream'), deleteStream);
router.get('/admin/analytics', protect, requirePermission('manage:livestream'), getAnalytics);
// ===== TRANSCRIPT ROUTES =====

// Update cleaned transcript (ADMIN ONLY)
router.put(
  '/:id/transcript',
  protect,
  requirePermission('manage:livestream'),
  updateTranscript
);

// Extract transcript from video URL (ADMIN ONLY)
router.post(
  '/:id/transcript/extract',
  protect,
  requirePermission('manage:livestream'),
  extractTranscript
);

// Generate AI summary from transcript (ADMIN ONLY)
router.post(
  '/:id/transcript/generate-summary',
  protect,
  requirePermission('manage:livestream'),
  generateSummaryFromTranscript
);

module.exports = router;