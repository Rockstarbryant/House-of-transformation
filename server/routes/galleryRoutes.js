const express = require('express');
const { protect } = require('../middleware/auth');
const authorize = require('../middleware/roleAuth');
const {
  getPhotos,
  uploadPhoto,
  deletePhoto,
  likePhoto
} = require('../controllers/galleryController');
const upload = require('../middleware/upload');

const router = express.Router();

// GET all photos - Public
router.get('/', getPhotos);

// POST upload photo - Protected, only pastor/bishop/admin
// IMPORTANT: upload.single('photo') processes the multipart form data
router.post(
  '/',
  protect,
  authorize('pastor', 'bishop', 'admin'),
  upload.single('photo'),  // ← THIS WAS MISSING!
  uploadPhoto
);

// DELETE photo - Protected, only pastor/bishop/admin
router.delete(
  '/:id',
  protect,
  authorize('pastor', 'bishop', 'admin'),
  deletePhoto
);

// POST like photo - Protected
router.post('/:id/like', protect, likePhoto);

module.exports = router;