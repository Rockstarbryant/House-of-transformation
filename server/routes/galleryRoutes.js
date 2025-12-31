const express = require('express');
const {
  getPhotos,
  uploadPhoto,
  deletePhoto,
  likePhoto
} = require('../controllers/galleryController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.route('/')
  .get(getPhotos);

// Upload with multer middleware
router.post('/upload', protect, authorize('admin'), upload.single('photo'), uploadPhoto);

router.route('/:id')
  .delete(protect, authorize('admin'), deletePhoto);

router.post('/:id/like', protect, likePhoto);

module.exports = router;