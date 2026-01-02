const Gallery = require('../models/Gallery');

// @desc    Get all photos
// @route   GET /api/gallery
// @access  Public
exports.getPhotos = async (req, res) => {
  try {
    const category = req.query.category;
    const query = category && category !== 'All' ? { category } : {};

    const photos = await Gallery.find(query)
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'name');

    res.json({ success: true, photos });
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Upload photo
// @route   POST /api/gallery
// @access  Private/Admin
exports.uploadPhoto = async (req, res) => {
  try {
    // Check if file was uploaded by multer
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded. Please select a photo.' 
      });
    }

    // Validate required fields
    if (!req.body.title || req.body.title.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Title is required' 
      });
    }

    // Create photo data
    const photoData = {
      title: req.body.title.trim(),
      description: req.body.description?.trim() || '',
      category: req.body.category || 'General',
      imageUrl: `/uploads/gallery/${req.file.filename}`, // Path where file is stored
      uploadedBy: req.user._id || req.user.id,
      likes: 0,
      likedBy: [],
      comments: 0
    };

    // Create and save photo to database
    const photo = await Gallery.create(photoData);

    // Populate user info
    await photo.populate('uploadedBy', 'name email');

    console.log('✅ Photo uploaded successfully:', photo._id);
    
    res.status(201).json({ 
      success: true, 
      message: 'Photo uploaded successfully',
      photo 
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Error uploading photo' 
    });
  }
};

// @desc    Delete photo
// @route   DELETE /api/gallery/:id
// @access  Private/Admin
exports.deletePhoto = async (req, res) => {
  try {
    const photo = await Gallery.findByIdAndDelete(req.params.id);
    
    if (!photo) {
      return res.status(404).json({ 
        success: false, 
        message: 'Photo not found' 
      });
    }

    // Optional: Delete file from disk
    // const fs = require('fs');
    // const path = require('path');
    // const filePath = path.join(__dirname, '../' + photo.imageUrl);
    // if (fs.existsSync(filePath)) {
    //   fs.unlinkSync(filePath);
    // }

    console.log('✅ Photo deleted:', photo._id);
    
    res.json({ 
      success: true, 
      message: 'Photo deleted successfully' 
    });
  } catch (error) {
    console.error('❌ Delete error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};

// @desc    Like photo
// @route   POST /api/gallery/:id/like
// @access  Private
exports.likePhoto = async (req, res) => {
  try {
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
      // Unlike - remove user from likedBy array
      photo.likedBy = photo.likedBy.filter(id => id.toString() !== userId.toString());
      photo.likes = Math.max(0, photo.likes - 1);
    } else {
      // Like - add user to likedBy array
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
  } catch (error) {
    console.error('❌ Like error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
};