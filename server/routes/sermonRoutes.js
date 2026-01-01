const express = require('express');
const { protect } = require('../middleware/auth');
const authorize = require('../middleware/roleAuth');
const {
  getSermons,
  getSermon,
  createSermon,
  updateSermon,
  deleteSermon,
  toggleLike
} = require('../controllers/sermonController');
//const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getSermons);
router.get('/:id', getSermon);

// Protected routes - only pastor/bishop/admin can create/update/delete
router.post(
  '/',
  protect,
  authorize('pastor', 'bishop', 'admin'),
  createSermon
);

router.put(
  '/:id',
  protect,
  authorize('pastor', 'bishop', 'admin'),
  updateSermon
);

router.delete(
  '/:id',
  protect,
  authorize('pastor', 'bishop', 'admin'),
  deleteSermon
);

// Like route (authenticated users)
router.post('/:id/like', protect, toggleLike);

module.exports = router;