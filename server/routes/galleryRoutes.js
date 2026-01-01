const express = require('express');
const { protect } = require('../middleware/auth');
const authorize = require('../middleware/roleAuth');
const {
  getPhotos,
  uploadPhoto,
  deletePhoto,
  likePhoto
} = require('../controllers/galleryController');
//const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');      

const router = express.Router();

router.route('/')
  .get(getPhotos);

// Protected routes - only pastor/bishop/admin can upload/delete
router.post(
  '/',
  protect,
  authorize('pastor', 'bishop', 'admin'),
  uploadPhoto
);

router.delete(
  '/:id',
  protect,
  authorize('pastor', 'bishop', 'admin'),
  deletePhoto
);

router.post('/:id/like', protect, likePhoto);

module.exports = router;