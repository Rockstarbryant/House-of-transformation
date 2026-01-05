const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getPhotos,
  uploadPhoto,
  deletePhoto,
  likePhoto
} = require('../controllers/galleryController');
const upload = require('../middleware/upload');

const router = express.Router();

// ===== PUBLIC ROUTES =====
// GET all photos - Public
router.get('/', getPhotos);

// ===== PROTECTED & AUTHORIZED ROUTES =====
// POST upload photo - Only pastor/bishop/admin can upload
router.post(
  '/',
  protect,
  authorize('pastor', 'bishop', 'admin'),
  upload.single('photo'),
  uploadPhoto
);

// DELETE photo - Only pastor/bishop/admin can delete
router.delete(
  '/:id',
  protect,
  authorize('pastor', 'bishop', 'admin'),
  deletePhoto
);

// ===== PROTECTED ROUTES (All authenticated users) =====
// POST like photo - Any authenticated user can like
router.post('/:id/like', protect, likePhoto);

module.exports = router;