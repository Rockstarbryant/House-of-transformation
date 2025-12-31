const Sermon = require('../models/Sermon');

// @desc    Get all sermons
// @route   GET /api/sermons
// @access  Public
exports.getSermons = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;
    const type = req.query.type;
    const category = req.query.category;
    const search = req.query.search;

    // Build query
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
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single sermon
// @route   GET /api/sermons/:id
// @access  Public
exports.getSermon = async (req, res) => {
  try {
    const sermon = await Sermon.findById(req.params.id);
    if (!sermon) {
      return res.status(404).json({ message: 'Sermon not found' });
    }
    
    // Increment views
    sermon.views = (sermon.views || 0) + 1;
    await sermon.save();
    
    res.json({ success: true, sermon });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create sermon
// @route   POST /api/sermons
// @access  Private/Admin
exports.createSermon = async (req, res) => {
  try {
    const { title, pastor, date, category, description, thumbnail, videoUrl, type } = req.body;

    // Validate required fields
    if (!title || !pastor || !date) {
      return res.status(400).json({ message: 'Title, pastor, and date are required' });
    }

    // Validate type-specific fields
    if (type === 'photo' && !thumbnail) {
      return res.status(400).json({ message: 'Thumbnail is required for photo sermons' });
    }
    
    if (type === 'video' && !videoUrl) {
      return res.status(400).json({ message: 'Video URL is required for video sermons' });
    }

    const sermon = await Sermon.create({
      title,
      pastor,
      date,
      category: category || 'Sunday Service',
      description,
      thumbnail,
      videoUrl,
      type: type || 'text',
      likes: 0,
      views: 0,
      comments: 0
    });

    res.status(201).json({ success: true, sermon });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update sermon
// @route   PUT /api/sermons/:id
// @access  Private/Admin
exports.updateSermon = async (req, res) => {
  try {
    const { type, thumbnail, videoUrl } = req.body;

    // Validate type-specific fields
    if (type === 'photo' && !thumbnail) {
      return res.status(400).json({ message: 'Thumbnail is required for photo sermons' });
    }
    
    if (type === 'video' && !videoUrl) {
      return res.status(400).json({ message: 'Video URL is required for video sermons' });
    }

    const sermon = await Sermon.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!sermon) {
      return res.status(404).json({ message: 'Sermon not found' });
    }
    
    res.json({ success: true, sermon });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete sermon
// @route   DELETE /api/sermons/:id
// @access  Private/Admin
exports.deleteSermon = async (req, res) => {
  try {
    const sermon = await Sermon.findByIdAndDelete(req.params.id);
    
    if (!sermon) {
      return res.status(404).json({ message: 'Sermon not found' });
    }
    
    res.json({ success: true, message: 'Sermon deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Like/Unlike sermon
// @route   POST /api/sermons/:id/like
// @access  Private
exports.toggleLike = async (req, res) => {
  try {
    const sermon = await Sermon.findById(req.params.id);
    
    if (!sermon) {
      return res.status(404).json({ message: 'Sermon not found' });
    }

    if (!sermon.likedBy) {
      sermon.likedBy = [];
    }

    const userId = req.user.id;
    const alreadyLiked = sermon.likedBy.includes(userId);

    if (alreadyLiked) {
      sermon.likedBy = sermon.likedBy.filter(id => id.toString() !== userId);
      sermon.likes = Math.max(0, (sermon.likes || 0) - 1);
    } else {
      sermon.likedBy.push(userId);
      sermon.likes = (sermon.likes || 0) + 1;
    }

    await sermon.save();
    res.json({ success: true, likes: sermon.likes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};