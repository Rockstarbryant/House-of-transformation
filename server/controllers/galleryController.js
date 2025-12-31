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
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload photo
// @route   POST /api/gallery/upload
// @access  Private/Admin
exports.uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const photoData = {
      title: req.body.title || 'Untitled',
      description: req.body.description || '',
      category: req.body.category || 'General',
      imageUrl: `/uploads/gallery/${req.file.filename}`, // Store relative path
      uploadedBy: req.user.id
    };

    const photo = await Gallery.create(photoData);
    res.status(201).json({ success: true, photo });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete photo
// @route   DELETE /api/gallery/:id
// @access  Private/Admin
exports.deletePhoto = async (req, res) => {
  try {
    const photo = await Gallery.findByIdAndDelete(req.params.id);
    if (!photo) {
      return res.status(404).json({ message: 'Photo not found' });
    }
    
    // Optionally delete the file from disk
    // const fs = require('fs');
    // const filePath = path.join(__dirname, '../' + photo.imageUrl);
    // if (fs.existsSync(filePath)) {
    //   fs.unlinkSync(filePath);
    // }

    res.json({ success: true, message: 'Photo deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Like photo
// @route   POST /api/gallery/:id/like
// @access  Private
exports.likePhoto = async (req, res) => {
  try {
    const photo = await Gallery.findById(req.params.id);
    if (!photo) {
      return res.status(404).json({ message: 'Photo not found' });
    }

    const alreadyLiked = photo.likedBy.includes(req.user.id);

    if (alreadyLiked) {
      // Unlike
      photo.likedBy = photo.likedBy.filter(id => id.toString() !== req.user.id);
      photo.likes -= 1;
    } else {
      // Like
      photo.likedBy.push(req.user.id);
      photo.likes += 1;
    }

    await photo.save();
    res.json({ success: true, likes: photo.likes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};