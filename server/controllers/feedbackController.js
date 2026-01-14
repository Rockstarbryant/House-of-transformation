const Feedback = require('../models/Feedback');

// @desc    Submit feedback (NO AUTH REQUIRED - supports anonymous)
// @route   POST /api/feedback
// @access  Public
exports.submitFeedback = async (req, res) => {
  try {
    const {
      category,
      name,
      email,
      phone,
      isAnonymous,
      isFirstTimeVisitor,
      isPublic,
      allowFollowUp,
      shareOnPrayerList,
      feedbackData
    } = req.body;

    // Validation
    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Please specify feedback category'
      });
    }

    // Create feedback object
    const feedbackObj = {
      category,
      feedbackData,
      isAnonymous: isAnonymous || false,
      isFirstTimeVisitor: isFirstTimeVisitor || false,
      isPublic: isPublic || false,
      allowFollowUp: allowFollowUp || false,
      shareOnPrayerList: shareOnPrayerList || false
    };

    // Add user reference if authenticated
    if (req.user) {
      feedbackObj.user = req.user.id;
    }

    // Add contact info only if not anonymous
    if (!isAnonymous) {
      if (name) feedbackObj.name = name;
      if (email) feedbackObj.email = email;
      if (phone) feedbackObj.phone = phone;
    }

    // Add IP for spam prevention (not stored if anonymous)
    if (!isAnonymous) {
      feedbackObj.ipAddress = req.ip;
      feedbackObj.userAgent = req.get('user-agent');
    }

    // Create feedback
    const feedback = await Feedback.create(feedbackObj);

    // Send email notification to admin (if not anonymous or if prayer urgent)
    if (category === 'prayer' && feedbackData.urgency === 'Urgent') {
      // TODO: Send urgent prayer notification
    }

    res.status(201).json({
      success: true,
      message: isAnonymous 
        ? 'Thank you for your anonymous feedback! Your voice matters to us.'
        : 'Thank you for your feedback! We\'ll review it shortly.',
      referenceId: isAnonymous ? null : `FB-${feedback._id.toString().slice(-6).toUpperCase()}`,
      feedback: {
        id: feedback._id,
        category: feedback.category,
        submittedAt: feedback.submittedAt
      }
    });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: error.message
    });
  }
};

// @desc    Get all feedback (Admin)
// @route   GET /api/feedback
// @access  Private/Admin
exports.getAllFeedback = async (req, res) => {
  try {
    const { category, status, anonymous, startDate, endDate } = req.query;
    
    // Build filter
    let filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (anonymous === 'true') filter.isAnonymous = true;
    if (startDate || endDate) {
      filter.submittedAt = {};
      if (startDate) filter.submittedAt.$gte = new Date(startDate);
      if (endDate) filter.submittedAt.$lte = new Date(endDate);
    }

    const feedback = await Feedback.find(filter)
      .populate('user', 'name email')
      .populate('reviewedBy', 'name')
      .sort({ submittedAt: -1 })
      .limit(100);

    res.json({
      success: true,
      count: feedback.length,
      feedback
    });
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback',
      error: error.message
    });
  }
};

// @desc    Get single feedback
// @route   GET /api/feedback/:id
// @access  Private/Admin
exports.getFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate('user', 'name email role')
      .populate('reviewedBy', 'name');

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    res.json({
      success: true,
      feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch feedback',
      error: error.message
    });
  }
};

// @desc    Get public testimonies
// @route   GET /api/feedback/testimonies/public
// @access  Public
exports.getPublicTestimonies = async (req, res) => {
  try {
    const testimonies = await Feedback.find({
      category: 'testimony',
      status: 'published',
      isPublic: true
    })
      .select('feedbackData.title feedbackData.story feedbackData.testimonyDate feedbackData.testimonyType name isAnonymous submittedAt')
      .sort({ 'feedbackData.testimonyDate': -1 })
      .limit(20);

    res.json({
      success: true,
      count: testimonies.length,
      testimonies
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch testimonies',
      error: error.message
    });
  }
};

// @desc    Get single public testimony by ID
// @route   GET /api/feedback/public/:id
// @access  Public
exports.getPublicTestimony = async (req, res) => {
  try {
    const testimony = await Feedback.findById(req.params.id)
      .populate('user', 'name email role')
      .select('-ipAddress -userAgent'); // Hide sensitive data

    if (!testimony || testimony.status !== 'published' || !testimony.isPublic) {
      return res.status(404).json({
        success: false,
        message: 'Testimony not found'
      });
    }

    res.json({
      success: true,
      feedback: testimony
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: 'Testimony not found',
      error: error.message
    });
  }
};

// @desc    Update feedback status
// @route   PUT /api/feedback/:id/status
// @access  Private/Admin
exports.updateStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;

    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      {
        status,
        adminNotes,
        reviewedBy: req.user.id,
        reviewedAt: Date.now()
      },
      { new: true, runValidators: true }
    );

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    res.json({
      success: true,
      message: `Feedback ${status} successfully`,
      feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update status',
      error: error.message
    });
  }
};

// @desc    Respond to feedback
// @route   POST /api/feedback/:id/respond
// @access  Private/Admin
exports.respondToFeedback = async (req, res) => {
  try {
    const { response } = req.body;

    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Check if feedback allows follow-up or has contact info
    if (!feedback.allowFollowUp && !feedback.email) {
      return res.status(400).json({
        success: false,
        message: 'This feedback does not allow follow-up or has no contact information'
      });
    }

    feedback.response = response;
    feedback.responseSentAt = Date.now();
    feedback.status = 'responded';
    feedback.reviewedBy = req.user.id;
    feedback.reviewedAt = Date.now();

    await feedback.save();

    // TODO: Send email response if email exists
    if (feedback.email) {
      // Send email here
    }

    res.json({
      success: true,
      message: 'Response sent successfully',
      feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send response',
      error: error.message
    });
  }
};

// @desc    Publish testimony
// @route   PUT /api/feedback/:id/publish
// @access  Private/Admin
exports.publishTestimony = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Testimony not found'
      });
    }

    if (feedback.category !== 'testimony') {
      return res.status(400).json({
        success: false,
        message: 'Only testimonies can be published'
      });
    }

    feedback.status = 'published';
    feedback.isPublic = true;
    feedback.reviewedBy = req.user.id;
    feedback.reviewedAt = Date.now();

    await feedback.save();

    res.json({
      success: true,
      message: 'Testimony published successfully',
      feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to publish testimony',
      error: error.message
    });
  }
};

// @desc    Delete feedback
// @route   DELETE /api/feedback/:id
// @access  Private/Admin
exports.deleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    await feedback.deleteOne();

    res.json({
      success: true,
      message: 'Feedback deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete feedback',
      error: error.message
    });
  }
};

// @desc    Get feedback statistics
// @route   GET /api/feedback/stats
// @access  Private/Admin
exports.getStats = async (req, res) => {
  try {
    const stats = await Feedback.getStats();

    // Get average ratings for sermons and services
    const sermonRatings = await Feedback.aggregate([
      { $match: { category: 'sermon', 'feedbackData.rating': { $exists: true } } },
      { $group: { _id: null, avgRating: { $avg: '$feedbackData.rating' }, count: { $sum: 1 } } }
    ]);

    const serviceRatings = await Feedback.aggregate([
      { $match: { category: 'service', 'feedbackData.ratings.overall': { $exists: true } } },
      { $group: { _id: null, avgRating: { $avg: '$feedbackData.ratings.overall' }, count: { $sum: 1 } } }
    ]);

    // Get pending count (needs review)
    const pending = await Feedback.countDocuments({ status: 'pending' });

    // Get testimonies awaiting publication
    const testimoniesToReview = await Feedback.countDocuments({
      category: 'testimony',
      status: 'pending'
    });

    // Get urgent prayers
    const urgentPrayers = await Feedback.countDocuments({
      category: 'prayer',
      'feedbackData.urgency': 'Urgent',
      status: { $in: ['pending', 'reviewed'] }
    });

    res.json({
      success: true,
      stats: {
        ...stats,
        averageSermonRating: sermonRatings[0]?.avgRating || 0,
        sermonRatingsCount: sermonRatings[0]?.count || 0,
        averageServiceRating: serviceRatings[0]?.avgRating || 0,
        serviceRatingsCount: serviceRatings[0]?.count || 0,
        pending,
        testimoniesToReview,
        urgentPrayers
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};