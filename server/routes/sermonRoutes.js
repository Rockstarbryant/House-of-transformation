const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getSermons,
  getSermon,
  createSermon,
  updateSermon,
  deleteSermon,
  toggleLike
} = require('../controllers/sermonController');
const { upload } = require('../config/cloudinaryConfig');

const router = express.Router();

// ===== PUBLIC ROUTES (NO AUTH) =====
router.get('/', getSermons);
router.get('/:id', getSermon);

// ===== PROTECTED & AUTHORIZED ROUTES (Admin/Pastor/Bishop only) =====
// Create sermon (with optional file upload)
router.post(
  '/',
  protect,
  authorize('pastor', 'bishop', 'admin'),
  upload.single('thumbnail'),
  createSermon
);

// Update sermon (with optional file upload)
router.put(
  '/:id',
  protect,
  authorize('pastor', 'bishop', 'admin'),
  upload.single('thumbnail'),
  updateSermon
);

// Delete sermon
router.delete(
  '/:id',
  protect,
  authorize('pastor', 'bishop', 'admin'),
  deleteSermon
);

// ===== LIKE ROUTE (Authenticated users only) =====
router.post('/:id/like', protect, toggleLike);

module.exports = router;