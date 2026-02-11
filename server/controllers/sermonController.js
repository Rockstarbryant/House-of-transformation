const Sermon = require('../models/Sermon');
const asyncHandler = require('../middleware/asyncHandler');

// @desc    Get all sermons
// @route   GET /api/sermons
// @access  Public
exports.getSermons = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const skip = (page - 1) * limit;
  const type = req.query.type;
  const category = req.query.category;
  const search = req.query.search;

  let query = {};
  
  if (type && type !== 'all') {
    query.type = type;
  }
  
  if (category && category !== 'All') {
    query.category = category;
  }
  
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { pastor: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  const sermons = await Sermon.find(query)
    .sort({ date: -1 })
    .limit(limit)
    .skip(skip);

  const total = await Sermon.countDocuments(query);

  res.json({
    success: true,
    sermons,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// @desc    Get single sermon
// @route   GET /api/sermons/:id
// @access  Public
exports.getSermon = asyncHandler(async (req, res) => {
  const sermon = await Sermon.findById(req.params.id);
  if (!sermon) {
    return res.status(404).json({ success: false, message: 'Sermon not found' });
  }
  
  res.json({ success: true, sermon });
});

// @desc    Track unique view
// @route   POST /api/sermons/:id/view
// @access  Public
exports.trackView = asyncHandler(async (req, res) => {
  const { deviceId } = req.body; // Client will send a unique device identifier
  
  if (!deviceId) {
    return res.status(400).json({ success: false, message: 'Device ID required' });
  }

  const sermon = await Sermon.findById(req.params.id);
  
  if (!sermon) {
    return res.status(404).json({ success: false, message: 'Sermon not found' });
  }

  // Check if this device has already viewed
  const alreadyViewed = sermon.viewedBy?.some(
    view => view.identifier === deviceId
  );

  if (!alreadyViewed) {
    if (!sermon.viewedBy) sermon.viewedBy = [];
    
    sermon.viewedBy.push({
      identifier: deviceId,
      viewedAt: new Date()
    });
    
    sermon.views = (sermon.views || 0) + 1;
    await sermon.save();
    
    console.log(`✅ New unique view tracked for sermon: ${sermon._id}`);
  }

  res.json({ 
    success: true, 
    views: sermon.views,
    alreadyViewed 
  });
});

// @desc    Toggle bookmark
// @route   POST /api/sermons/:id/bookmark
// @access  Private
exports.toggleBookmark = asyncHandler(async (req, res) => {
  const sermon = await Sermon.findById(req.params.id);
  
  if (!sermon) {
    return res.status(404).json({ success: false, message: 'Sermon not found' });
  }

  if (!sermon.bookmarkedBy) {
    sermon.bookmarkedBy = [];
  }

  const userId = req.user._id || req.user.id;
  const alreadyBookmarked = sermon.bookmarkedBy.some(
    id => id.toString() === userId.toString()
  );

  if (alreadyBookmarked) {
    sermon.bookmarkedBy = sermon.bookmarkedBy.filter(
      id => id.toString() !== userId.toString()
    );
  } else {
    sermon.bookmarkedBy.push(userId);
  }

  await sermon.save();
  console.log(`✅ Sermon ${alreadyBookmarked ? 'unbookmarked' : 'bookmarked'}: ${sermon._id}`);
  
  res.json({ 
    success: true, 
    bookmarked: !alreadyBookmarked,
    bookmarkCount: sermon.bookmarkedBy.length
  });
});

// @desc    Create sermon
// @route   POST /api/sermons
// @access  Private/Admin
exports.createSermon = asyncHandler(async (req, res) => {
  console.log('📝 Sermon creation started');
  console.log('📄 Thumbnail file:', req.files?.thumbnail ? 'EXISTS' : 'MISSING');
  console.log('🖼️  Images files:', req.files?.images?.length || 0);
  console.log('📋 Form data:', req.body);

  const { title, pastor, date, category, description,  descriptionHtml, videoUrl, type } = req.body;

  if (!title || !pastor || !date) {
    return res.status(400).json({ success: false, message: 'Title, pastor, and date are required' });
  }

  let sermonData = {
    title,
    pastor,
    date,
    category: category || 'Sunday Service',
    description,
    descriptionHtml,
    videoUrl,
    type: type || 'text',
    likes: 0,
    views: 0,
    comments: 0,
    images: []
  };

  // Handle thumbnail upload (OPTIONAL)
  if (type === 'photo' || type === 'video') {
    let thumbnailUrl = null;
    let publicId = null;

    if (req.file) {
      // File uploaded via form
      thumbnailUrl = req.file.secure_url || req.file.path;
      publicId = req.file.public_id;
      console.log('✅ Thumbnail from Cloudinary:', thumbnailUrl);
    } else if (req.body.thumbnail && typeof req.body.thumbnail === 'string') {
      // URL provided manually
      thumbnailUrl = req.body.thumbnail;
      console.log('✅ Thumbnail from URL:', thumbnailUrl);
    }

    // Thumbnail is now OPTIONAL - use default if not provided
    if (thumbnailUrl) {
      sermonData.thumbnail = thumbnailUrl;
      sermonData.thumbnailPublicId = publicId || null;
    }
  }

  if (type === 'video' && !videoUrl) {
    return res.status(400).json({ success: false, message: 'Video URL is required' });
  }

  // Handle multiple images
  if (req.files?.images) {
    const imageFiles = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
    
    sermonData.images = imageFiles.slice(0, 4).map((file, idx) => ({
      url: file.secure_url || file.path,
      publicId: file.public_id,
      position: idx + 1
    }));
    
    console.log(`✅ ${sermonData.images.length} images uploaded to Cloudinary`);
  }

  const sermon = await Sermon.create(sermonData);
  console.log('✅ Sermon created:', sermon._id);

  res.status(201).json({ success: true, sermon });
});


// @desc    Update sermon
// @route   PUT /api/sermons/:id
// @access  Private/Admin
exports.updateSermon = asyncHandler(async (req, res) => {
  const { type, videoUrl } = req.body;
  let updateData = { ...req.body };

  if (type === 'video' && !videoUrl) {
    return res.status(400).json({ success: false, message: 'Video URL is required' });
  }

  const sermon = await Sermon.findById(req.params.id);
  if (!sermon) {
    return res.status(404).json({ success: false, message: 'Sermon not found' });
  }

  // Handle new thumbnail upload
  if (req.file) {
    if (sermon.thumbnailPublicId) {
      const { cloudinary } = require('../config/cloudinaryConfig');
      try {
        await cloudinary.uploader.destroy(sermon.thumbnailPublicId);
        console.log('✅ Old thumbnail deleted:', sermon.thumbnailPublicId);
      } catch (error) {
        console.error('Error deleting old thumbnail:', error);
      }
    }

    updateData.thumbnail = req.file.secure_url || req.file.path;
    updateData.thumbnailPublicId = req.file.public_id;
  }

  // Handle new images upload
  if (req.files?.images) {
    // Delete old images from Cloudinary
    if (sermon.images && sermon.images.length > 0) {
      const { cloudinary } = require('../config/cloudinaryConfig');
      for (const img of sermon.images) {
        try {
          if (img.publicId) {
            await cloudinary.uploader.destroy(img.publicId);
            console.log('✅ Old image deleted:', img.publicId);
          }
        } catch (error) {
          console.error('Error deleting old image:', error);
        }
      }
    }

    const imageFiles = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
    
    updateData.images = imageFiles.slice(0, 4).map((file, idx) => ({
      url: file.secure_url || file.path,
      publicId: file.public_id,
      position: idx + 1
    }));
    
    console.log(`✅ ${updateData.images.length} new images uploaded`);
  }

  if (req.body.descriptionHtml !== undefined) {
  updateData.descriptionHtml = req.body.descriptionHtml;
  }


  const updatedSermon = await Sermon.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true, runValidators: true }
  );
  
  console.log('✅ Sermon updated:', updatedSermon._id);
  res.json({ success: true, sermon: updatedSermon });
});

// @desc    Delete sermon
// @route   DELETE /api/sermons/:id
// @access  Private/Admin
exports.deleteSermon = asyncHandler(async (req, res) => {
  const sermon = await Sermon.findById(req.params.id);
  
  if (!sermon) {
    return res.status(404).json({ success: false, message: 'Sermon not found' });
  }

  const { cloudinary } = require('../config/cloudinaryConfig');

  // Delete thumbnail
  if (sermon.thumbnailPublicId) {
    try {
      await cloudinary.uploader.destroy(sermon.thumbnailPublicId);
      console.log('✅ Thumbnail deleted:', sermon.thumbnailPublicId);
    } catch (error) {
      console.error('Error deleting thumbnail:', error);
    }
  }

  // Delete all images
  if (sermon.images && sermon.images.length > 0) {
    for (const img of sermon.images) {
      try {
        if (img.publicId) {
          await cloudinary.uploader.destroy(img.publicId);
          console.log('✅ Image deleted:', img.publicId);
        }
      } catch (error) {
        console.error('Error deleting image:', error);
      }
    }
  }

  await Sermon.findByIdAndDelete(req.params.id);
  
  console.log('✅ Sermon deleted:', sermon._id);
  res.json({ success: true, message: 'Sermon deleted successfully' });
});

// @desc    Like/Unlike sermon
// @route   POST /api/sermons/:id/like
// @access  Private
exports.toggleLike = asyncHandler(async (req, res) => {
  const sermon = await Sermon.findById(req.params.id);
  
  if (!sermon) {
    return res.status(404).json({ success: false, message: 'Sermon not found' });
  }

  if (!sermon.likedBy) {
    sermon.likedBy = [];
  }

  const userId = req.user._id || req.user.id;
  const alreadyLiked = sermon.likedBy.some(id => id.toString() === userId.toString());

  if (alreadyLiked) {
    sermon.likedBy = sermon.likedBy.filter(id => id.toString() !== userId.toString());
    sermon.likes = Math.max(0, (sermon.likes || 0) - 1);
  } else {
    sermon.likedBy.push(userId);
    sermon.likes = (sermon.likes || 0) + 1;
  }

  await sermon.save();
  console.log(`✅ Sermon ${alreadyLiked ? 'unliked' : 'liked'}:`, sermon._id);
  
  res.json({ success: true, likes: sermon.likes, liked: !alreadyLiked });
});

// @desc    Get user's bookmarked sermons
// @route   GET /api/sermons/bookmarks/my-bookmarks
// @access  Private
exports.getUserBookmarks = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const skip = (page - 1) * limit;

  // Find all sermons where user has bookmarked
  const sermons = await Sermon.find({ bookmarkedBy: userId })
    .sort({ updatedAt: -1 }) // Most recently bookmarked first
    .limit(limit)
    .skip(skip)
    .lean();

  const total = await Sermon.countDocuments({ bookmarkedBy: userId });

  // Add bookmark metadata for each sermon
  const sermonsWithMeta = sermons.map(sermon => ({
    ...sermon,
    bookmarkedAt: sermon.updatedAt, // You might want to add a separate bookmarkedAt field in the future
    isBookmarked: true
  }));

  res.json({
    success: true,
    sermons: sermonsWithMeta,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});

// @desc    Get user's liked sermons
// @route   GET /api/sermons/likes/my-likes
// @access  Private
exports.getUserLikes = asyncHandler(async (req, res) => {
  const userId = req.user._id || req.user.id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 12;
  const skip = (page - 1) * limit;

  // Find all sermons where user has liked
  const sermons = await Sermon.find({ likedBy: userId })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean();

  const total = await Sermon.countDocuments({ likedBy: userId });

  const sermonsWithMeta = sermons.map(sermon => ({
    ...sermon,
    likedAt: sermon.updatedAt,
    isLiked: true
  }));

  res.json({
    success: true,
    sermons: sermonsWithMeta,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
});