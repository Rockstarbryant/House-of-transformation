// ============================================
// FILE 3: backend/routes/galleryRoutes.js
// PATH: REPLACE entire file: backend/routes/galleryRoutes.js
// DELETE the old one and paste this completely
// ============================================

const express = require('express');
const { protect, authorize } = require('../middleware/supabaseAuth');
const {
  getPhotos,
  uploadPhoto,
  deletePhoto,
  likePhoto
} = require('../controllers/galleryController');
const { upload } = require('../config/cloudinaryConfig');

const router = express.Router();

router.get('/', getPhotos);

router.post(
  '/',
  protect,
  authorize('pastor', 'bishop', 'admin'),
  upload.single('photo'),
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