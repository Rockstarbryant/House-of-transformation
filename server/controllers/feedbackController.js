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

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Please specify feedback category'
      });
    }

    const feedbackObj = {
      category,
      feedbackData,
      isAnonymous: isAnonymous || false,
      isFirstTimeVisitor: isFirstTimeVisitor || false,
      isPublic: isPublic || false,
      allowFollowUp: allowFollowUp || false,
      shareOnPrayerList: shareOnPrayerList || false
    };

    if (req.user) {
      feedbackObj.user = req.user._id;
    }

    if (!isAnonymous) {
      if (name) feedbackObj.name = name;
      if (email) feedbackObj.email = email;
      if (phone) feedbackObj.phone = phone;
      feedbackObj.ipAddress = req.ip;
      feedbackObj.userAgent = req.get('user-agent');
    }

    const feedback = await Feedback.create(feedbackObj);

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

// @desc    Get all feedback (non-deleted, non-archived)
// @route   GET /api/feedback
// @access  Private - requires granular read permissions
exports.getAllFeedback = async (req, res) => {
  try {
    const { category, status, anonymous, startDate, endDate } = req.query;
    
    // Filter to include docs with isDeleted: false OR missing isDeleted field
    const baseFilter = { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] };
    
    let filter = { ...baseFilter };
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
      .populate('respondedBy', 'name')
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
// @access  Private - requires granular read permission for category
exports.getFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id)
      .populate('user', 'name email role')
      .populate('reviewedBy', 'name')
      .populate('respondedBy', 'name')
      .populate('archivedBy', 'name')
      .populate('deletedBy', 'name');

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Hide archived/deleted from non-admin unless they have permission
    if ((feedback.isDeleted || feedback.status === 'archived') && !req.user.role?.name === 'admin') {
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
      isPublic: true,
      isDeleted: false
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
      .select('-ipAddress -userAgent');

    if (!testimony || testimony.status !== 'published' || !testimony.isPublic || testimony.isDeleted) {
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
// @access  Private - requires read permission for category
exports.updateStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;

    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id,
      {
        status,
        adminNotes,
        reviewedBy: req.user._id,
        reviewedAt: Date.now()
      },
      { new: true, runValidators: true }
    ).populate('reviewedBy', 'name');

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    res.json({
      success: true,
      message: `Feedback marked as ${status}`,
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
// @access  Private - requires respond permission for category
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

    if (!feedback.allowFollowUp && !feedback.email) {
      return res.status(400).json({
        success: false,
        message: 'This feedback does not allow follow-up or has no contact information'
      });
    }

    feedback.response = response;
    feedback.respondedBy = req.user._id;
    feedback.respondedAt = Date.now();
    feedback.status = 'responded';
    feedback.reviewedBy = req.user._id;
    feedback.reviewedAt = Date.now();

    await feedback.save();

    const populatedFeedback = await Feedback.findById(feedback._id)
      .populate('respondedBy', 'name')
      .populate('reviewedBy', 'name');

    res.json({
      success: true,
      message: 'Response sent successfully',
      feedback: populatedFeedback
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
// @access  Private - requires publish permission (testimony only)
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
    feedback.reviewedBy = req.user._id;
    feedback.reviewedAt = Date.now();

    await feedback.save();

    const populatedFeedback = await Feedback.findById(feedback._id)
      .populate('reviewedBy', 'name');

    res.json({
      success: true,
      message: 'Testimony published successfully',
      feedback: populatedFeedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to publish testimony',
      error: error.message
    });
  }
};

// @desc    Archive feedback
// @route   PUT /api/feedback/:id/archive
// @access  Private - requires archive permission for category
exports.archiveFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    if (feedback.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Cannot archive deleted feedback'
      });
    }

    feedback.status = 'archived';
    feedback.archivedBy = req.user._id;
    feedback.archivedAt = Date.now();

    await feedback.save();

    const populatedFeedback = await Feedback.findById(feedback._id)
      .populate('archivedBy', 'name');

    res.json({
      success: true,
      message: 'Feedback archived successfully',
      feedback: populatedFeedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to archive feedback',
      error: error.message
    });
  }
};

// @desc    Unarchive feedback
// @route   PUT /api/feedback/:id/unarchive
// @access  Private - requires archive permission for category
exports.unarchiveFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    if (feedback.status !== 'archived') {
      return res.status(400).json({
        success: false,
        message: 'Only archived feedback can be unarchived'
      });
    }

    feedback.status = 'pending';
    feedback.archivedBy = null;
    feedback.archivedAt = null;

    await feedback.save();

    res.json({
      success: true,
      message: 'Feedback unarchived successfully',
      feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to unarchive feedback',
      error: error.message
    });
  }
};

// @desc    Soft delete feedback (move to recycle bin)
// @route   PUT /api/feedback/:id/soft-delete
// @access  Private - requires archive permission for category
exports.softDeleteFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    feedback.isDeleted = true;
    feedback.deletedBy = req.user._id;
    feedback.deletedAt = Date.now();

    await feedback.save();

    res.json({
      success: true,
      message: 'Feedback moved to recycle bin. Will be permanently deleted after 30 days.',
      feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete feedback',
      error: error.message
    });
  }
};

// @desc    Get recycled feedback (soft deleted)
// @route   GET /api/feedback/recycled
// @access  Private/Admin
exports.getRecycledFeedback = async (req, res) => {
  try {
    const recycled = await Feedback.find({ isDeleted: true })
      .populate('user', 'name email')
      .populate('deletedBy', 'name')
      .sort({ deletedAt: -1 });

    res.json({
      success: true,
      count: recycled.length,
      recycled
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recycled feedback',
      error: error.message
    });
  }
};

// @desc    Restore feedback from recycle bin
// @route   PUT /api/feedback/:id/restore
// @access  Private/Admin
exports.restoreFromRecycle = async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    if (!feedback.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Only deleted feedback can be restored'
      });
    }

    feedback.isDeleted = false;
    feedback.deletedBy = null;
    feedback.deletedAt = null;

    await feedback.save();

    res.json({
      success: true,
      message: 'Feedback restored successfully',
      feedback
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to restore feedback',
      error: error.message
    });
  }
};

// @desc    Permanently delete feedback (admin only - after 30 days or manually)
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
      message: 'Feedback permanently deleted'
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
// @route   GET /api/feedback/stats/overview
// @access  Private - requires view:feedback:stats permission
exports.getStats = async (req, res) => {
  try {
    console.log('[STATS] Fetching feedback statistics...');
    
    // Filter: exclude soft deleted OR include docs where isDeleted is not true
    const filter = { $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }] };

    // Get pending count
    const pending = await Feedback.countDocuments({ 
      status: 'pending', 
      ...filter 
    });
    
    // Get urgent prayers count
    const urgentPrayers = await Feedback.countDocuments({ 
      category: 'prayer', 
      'feedbackData.urgency': 'Urgent', 
      status: { $in: ['pending', 'reviewed'] }, 
      ...filter
    });
    
    // Get testimonies to review
    const testimoniesToReview = await Feedback.countDocuments({ 
      category: 'testimony', 
      status: 'pending', 
      ...filter
    });
    
    // Get items in recycle
    const inRecycle = await Feedback.countDocuments({ isDeleted: true });

    // Get total feedback
    const total = await Feedback.countDocuments(filter);

    // Get this week
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thisWeek = await Feedback.countDocuments({ 
      submittedAt: { $gte: oneWeekAgo },
      ...filter
    });

    // Get anonymous count
    const anonymous = await Feedback.countDocuments({ 
      isAnonymous: true,
      ...filter
    });

    // Get by category
    const byCategory = await Feedback.aggregate([
      { $match: filter },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // Get by status
    const byStatus = await Feedback.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Get average ratings
    const sermonRatings = await Feedback.aggregate([
      { $match: { category: 'sermon', 'feedbackData.rating': { $exists: true }, ...filter } },
      { $group: { _id: null, avgRating: { $avg: '$feedbackData.rating' }, count: { $sum: 1 } } }
    ]);

    const serviceRatings = await Feedback.aggregate([
      { $match: { category: 'service', 'feedbackData.ratings.overall': { $exists: true }, ...filter } },
      { $group: { _id: null, avgRating: { $avg: '$feedbackData.ratings.overall' }, count: { $sum: 1 } } }
    ]);

    const stats = {
      total,
      thisWeek,
      anonymous,
      byCategory,
      byStatus,
      pending,
      testimoniesToReview,
      urgentPrayers,
      inRecycle,
      averageSermonRating: sermonRatings[0]?.avgRating || 0,
      sermonRatingsCount: sermonRatings[0]?.count || 0,
      averageServiceRating: serviceRatings[0]?.avgRating || 0,
      serviceRatingsCount: serviceRatings[0]?.count || 0
    };

    console.log('[STATS] Final stats:', stats);

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[STATS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};