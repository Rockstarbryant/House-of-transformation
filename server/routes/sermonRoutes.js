const express = require('express');
const { protect } = require('../middleware/supabaseAuth');
const { requirePermission } = require('../middleware/requirePermission');
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

// ===== PROTECTED & PERMISSION-BASED ROUTES =====
// Create sermon (with optional thumbnail + multiple images)
router.post(
  '/',
  protect,
  requirePermission('manage:sermons'),
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'images', maxCount: 4 }
  ]),
  createSermon
);

// Update sermon (with optional thumbnail + multiple images)
router.put(
  '/:id',
  protect,
  requirePermission('manage:sermons'),
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'images', maxCount: 4 }
  ]),
  updateSermon
);

// Delete sermon
router.delete(
  '/:id',
  protect,
  requirePermission('manage:sermons'),
  deleteSermon
);

// ===== LIKE ROUTE (Authenticated users only) =====
router.post('/:id/like', protect, toggleLike);

module.exports = router;