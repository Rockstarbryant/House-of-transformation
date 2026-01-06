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

const router = express.Router();

// ===== PUBLIC ROUTES (NO AUTH) =====
router.get('/', getSermons);
router.get('/:id', getSermon);

// ===== PROTECTED & AUTHORIZED ROUTES (Admin/Pastor/Bishop only) =====
// Create sermon
router.post(
  '/',
  protect,
  authorize('pastor', 'bishop', 'admin'),
  createSermon
);

// Update sermon
router.put(
  '/:id',
  protect,
  authorize('pastor', 'bishop', 'admin'),
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