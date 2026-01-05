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
  console.log('📁 Upload request received');
  console.log('📄 req.file:', req.file ? 'EXISTS' : 'MISSING');
  console.log('📝 req.body:', req.body);

  // ✅ CHECK 1: File exists
  if (!req.file) {
    console.error('❌ No file uploaded');
    return res.status(400).json({
      success: false,
      message: 'No file uploaded. Please select a photo.'
    });
  }

  // ✅ CHECK 2: Cloudinary returned URL
  if (!req.file.secure_url) {
    console.error('❌ Cloudinary did not return secure_url');
    console.error('❌ req.file:', req.file);
    return res.status(400).json({
      success: false,
      message: 'Image upload to Cloudinary failed. Check your Cloudinary credentials.'
    });
  }

  // ✅ CHECK 3: Title required
  if (!req.body.title || req.body.title.trim() === '') {
    console.error('❌ Title is required');
    return res.status(400).json({
      success: false,
      message: 'Title is required'
    });
  }

  try {
    // ✅ All validations passed, create photo
    const photoData = {
      title: req.body.title.trim(),
      description: req.body.description?.trim() || '',
      category: req.body.category || 'General',
      imageUrl: req.file.secure_url, // ✅ Cloudinary URL
      imagePublicId: req.file.public_id, // ✅ For deletion
      uploadedBy: req.user._id || req.user.id,
      likes: 0,
      likedBy: [],
      comments: 0
    };

    console.log('✅ Creating photo with data:', {
      title: photoData.title,
      imageUrl: photoData.imageUrl ? 'URL present' : 'URL MISSING',
      category: photoData.category
    });

    const photo = await Gallery.create(photoData);
    await photo.populate('uploadedBy', 'name email');

    console.log('✅ Photo uploaded successfully:', photo._id);

    res.status(201).json({
      success: true,
      message: 'Photo uploaded successfully',
      photo
    });
  } catch (error) {
    console.error('❌ Database save error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error saving photo: ' + error.message
    });
  }
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