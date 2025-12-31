const express = require('express');
const {
  getSermons,
  getSermon,
  createSermon,
  updateSermon,
  deleteSermon,
  toggleLike
} = require('../controllers/sermonController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getSermons);
router.get('/:id', getSermon);

// Protected routes (admin only)
router.post('/', protect, authorize('admin'), createSermon);
router.put('/:id', protect, authorize('admin'), updateSermon);
router.delete('/:id', protect, authorize('admin'), deleteSermon);

// Like route (authenticated users)
router.post('/:id/like', protect, toggleLike);

module.exports = router;