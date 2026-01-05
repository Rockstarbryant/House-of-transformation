// ============================================
// FILE 2: backend/controllers/galleryController.js
// PATH: REPLACE entire file: backend/controllers/galleryController.js
// DELETE the old one and paste this completely
// ============================================

const Gallery = require('../models/Gallery');
const asyncHandler = require('../middleware/asyncHandler');

exports.getPhotos = asyncHandler(async (req, res) => {
  const category = req.query.category;
  const query = category && category !== 'All' ? { category } : {};

  const photos = await Gallery.find(query)
    .sort({ createdAt: -1 })
    .populate('uploadedBy', 'name');

  res.json({ success: true, photos });
});

exports.uploadPhoto = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded. Please select a photo.'
    });
  }

  if (!req.body.title || req.body.title.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Title is required'
    });
  }

  const photoData = {
    title: req.body.title.trim(),
    description: req.body.description?.trim() || '',
    category: req.body.category || 'General',
    imageUrl: req.file.secure_url,
    imagePublicId: req.file.public_id,
    uploadedBy: req.user._id || req.user.id,
    likes: 0,
    likedBy: [],
    comments: 0
  };

  const photo = await Gallery.create(photoData);
  await photo.populate('uploadedBy', 'name email');

  console.log('✅ Photo uploaded successfully:', photo._id);

  res.status(201).json({
    success: true,
    message: 'Photo uploaded successfully',
    photo
  });
});

exports.deletePhoto = asyncHandler(async (req, res) => {
  const photo = await Gallery.findById(req.params.id);

  if (!photo) {
    return res.status(404).json({
      success: false,
      message: 'Photo not found'
    });
  }

  if (photo.imagePublicId) {
    const { cloudinary } = require('../config/cloudinaryConfig');
    try {
      await cloudinary.uploader.destroy(photo.imagePublicId);
      console.log('✅ Deleted from Cloudinary:', photo.imagePublicId);
    } catch (error) {
      console.error('Error deleting from Cloudinary:', error);
    }
  }

  await Gallery.findByIdAndDelete(req.params.id);

  console.log('✅ Photo deleted:', photo._id);

  res.json({
    success: true,
    message: 'Photo deleted successfully'
  });
});

exports.likePhoto = asyncHandler(async (req, res) => {
  const photo = await Gallery.findById(req.params.id);

  if (!photo) {
    return res.status(404).json({
      success: false,
      message: 'Photo not found'
    });
  }

  const userId = req.user._id || req.user.id;
  const alreadyLiked = photo.likedBy.some(id => id.toString() === userId.toString());

  if (alreadyLiked) {
    photo.likedBy = photo.likedBy.filter(id => id.toString() !== userId.toString());
    photo.likes = Math.max(0, photo.likes - 1);
  } else {
    photo.likedBy.push(userId);
    photo.likes += 1;
  }

  await photo.save();

  console.log(`✅ Photo ${alreadyLiked ? 'unliked' : 'liked'}:`, photo._id);

  res.json({
    success: true,
    likes: photo.likes,
    liked: !alreadyLiked
  });
});