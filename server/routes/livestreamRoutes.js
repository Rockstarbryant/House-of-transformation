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
  getAnalytics
} = require('../controllers/livestreamController');

// ===== PUBLIC ROUTES (NO AUTH REQUIRED) =====
router.get('/active', getActiveStream);
router.get('/archives', getArchives);
router.get('/:id', getStreamById);

// ===== PROTECTED ROUTES (AUTH + manage:livestream PERMISSION REQUIRED) =====
router.post('/', protect, requirePermission('manage:livestream'), createStream);
router.put('/:id', protect, requirePermission('manage:livestream'), updateStream);
router.put('/:id/archive', protect, requirePermission('manage:livestream'), archiveStream);
router.put('/:id/ai-summary', protect, requirePermission('manage:livestream'), addAISummary);
router.delete('/:id', protect, requirePermission('manage:livestream'), deleteStream);
router.get('/admin/analytics', protect, requirePermission('manage:livestream'), getAnalytics);

module.exports = router;