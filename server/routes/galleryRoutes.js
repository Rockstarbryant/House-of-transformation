const express = require('express');
const { protect } = require('../middleware/supabaseAuth');
const { requirePermission } = require('../middleware/requirePermission');
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
  requirePermission('manage:gallery'),
  upload.single('photo'),
  uploadPhoto
);

router.delete(
  '/:id',
  protect,
  requirePermission('manage:gallery'),
  deletePhoto
);

router.post('/:id/like', protect, likePhoto);

module.exports = router;