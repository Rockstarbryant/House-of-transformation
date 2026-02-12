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
    // ✅ Permission check
const hasPermission = req.user && (
  req.user.role?.name === 'admin' ||
  req.user.role?.permissions?.includes('view:feedback') ||
  req.user.role?.permissions?.includes('manage:feedback')
);

if (!hasPermission) {
  return res.status(403).json({
    success: false,
    message: 'Access denied: Insufficient permissions',
    requiredPermissions: ['view:feedback', 'manage:feedback']
  });
}
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

    if (!response || !response.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Response text is required'
      });
    }

    const feedback = await Feedback.findById(req.params.id);

    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Check if feedback is anonymous or has no email
    if (feedback.isAnonymous) {
      return res.status(400).json({
        success: false,
        message: 'Cannot respond to anonymous feedback - no email available'
      });
    }

    if (!feedback.email) {
      return res.status(400).json({
        success: false,
        message: 'Cannot respond - feedback has no email address'
      });
    }

    if (!feedback.allowFollowUp) {
      return res.status(400).json({
        success: false,
        message: 'User has not allowed follow-up contact'
      });
    }

    // Update feedback in database (save first before sending email)
    feedback.response = response;
    feedback.respondedBy = req.user._id;
    feedback.respondedAt = Date.now();
    feedback.status = 'responded';
    feedback.reviewedBy = req.user._id;
    feedback.reviewedAt = Date.now();

    await feedback.save();

    // Prepare email content based on category
    const emailService = require('../services/emailService');
    
    let feedbackContent = '';
    if (feedback.feedbackData) {
      if (feedback.feedbackData.message) {
        feedbackContent = feedback.feedbackData.message;
      } else if (feedback.feedbackData.testimony) {
        feedbackContent = feedback.feedbackData.testimony;
      } else if (feedback.feedbackData.story) {
        feedbackContent = feedback.feedbackData.story;
      } else if (feedback.feedbackData.suggestion) {
        feedbackContent = feedback.feedbackData.suggestion;
      } else if (feedback.feedbackData.request) {
        feedbackContent = feedback.feedbackData.request;
      } else if (feedback.feedbackData.description) {
        feedbackContent = feedback.feedbackData.description;
      } else {
        feedbackContent = 'Your feedback';
      }
    }

    const categoryNames = {
      sermon: 'Sermon Feedback',
      service: 'Service Experience',
      testimony: 'Testimony',
      suggestion: 'Suggestion',
      prayer: 'Prayer Request',
      general: 'General Feedback'
    };

    const categoryName = categoryNames[feedback.category] || 'Feedback';
    const emailSubject = `Response to Your ${categoryName}`;
    
    const emailHtml = `
      <div style="font-family: 'Segoe UI', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f7f9;">
        <div style="width: 100%; overflow: hidden;">
          <img src="https://res.cloudinary.com/dcu8uuzrs/image/upload/v1768895135/church-gallery/jy2zygpn8zqqddq7aqjv.jpg" alt="House of Transformation" style="width: 100%; height: 150px; display: block; object-fit: cover;">
        </div>
        
        <div style="background: #ffffff; padding: 40px 25px; border-radius: 0; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
          <p style="font-size: 18px; color: #1a1a1a; margin-bottom: 20px;">Dear <strong>${feedback.name || 'Friend'}</strong>,</p>
          
          <p style="font-size: 16px; color: #4a4a4a; line-height: 1.6;">
            Thank you for connecting with us and sharing your ${categoryName.toLowerCase()}. 
            Your engagement helps us grow and serve our community better in Mombasa and beyond.
          </p>
          
          <div style="background: #fafafa; padding: 20px; border-left: 4px solid #8B1A1A; margin: 30px 0; border-radius: 4px;">
            <p style="margin: 0 0 10px 0; color: #8B1A1A; font-size: 12px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700;">
              Your ${categoryName}
            </p>
            <p style="margin: 0; color: #555; font-size: 15px; line-height: 1.6; font-style: italic; white-space: pre-wrap;">
              "${feedbackContent.substring(0, 300)}${feedbackContent.length > 300 ? '...' : ''}"
            </p>
          </div>
          
          <div style="background: #fff; padding: 25px; border: 1px solid #eee; border-radius: 12px; margin: 30px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
               <span style="font-size: 14px; color: #8B1A1A; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Our Response</span>
            </div>
            <p style="margin: 0; color: #2d3436; font-size: 16px; line-height: 1.8; white-space: pre-wrap;">
              ${response}
            </p>
          </div>
          
          <p style="font-size: 15px; color: #636e72; line-height: 1.6; margin-top: 30px; text-align: center;">
            Need to talk more? Just reply to this email. We are here for you.
          </p>
          
          <div style="text-align: center; margin-top: 40px; border-top: 1px solid #f0f0f0; padding-top: 25px;">
            <p style="font-size: 16px; color: #1a1a1a; margin-bottom: 5px; font-weight: 600;">
              Blessings,
            </p>
            <p style="font-size: 16px; color: #8B1A1A; margin: 0; font-weight: 700;">
              House of Transformation Team
            </p>
          </div>
        </div>
        
        <div style="padding: 30px 20px; text-align: center;">
          <p style="color: #a0a0a0; font-size: 12px; margin: 0; line-height: 1.5;">
            House of Transformation Church<br>
            Mombasa, Kenya<br>
            <a href="mailto:info@houseoftransformation.org" style="color: #8B1A1A; text-decoration: none; font-weight: bold;">info@houseoftransformation.org</a>
          </p>
          <p style="color: #cbd5e0; font-size: 11px; margin: 20px 0 0 0;">
            This is a follow-up to your recent ${categoryName.toLowerCase()} submission.
          </p>
        </div>
      </div>
    `;

    const emailText = `
Dear ${feedback.name || 'Friend'},

Thank you for your ${categoryName.toLowerCase()}. We appreciate you taking the time to share with us.

YOUR ${categoryName.toUpperCase()}:
${feedbackContent}

OUR RESPONSE:
${response}

If you have any questions, feel free to contact us directly.

May God bless you abundantly!

In Christ,
House of Transformation Team

---
House of Transformation Church
Busia, Kenya
info@houseoftransformation.org
    `.trim();

    // Send email
    console.log('[FEEDBACK-RESPOND] Sending email to:', feedback.email);
    
    const emailResult = await emailService.sendEmail({
      to: feedback.email,
      subject: emailSubject,
      text: emailText,
      html: emailHtml
    });

    if (emailResult.success) {
      // Email sent successfully - update responseSentAt
      feedback.responseSentAt = Date.now();
      await feedback.save();
      
      console.log('[FEEDBACK-RESPOND] ✅ Response sent and email delivered to:', feedback.email);

      const populatedFeedback = await Feedback.findById(feedback._id)
        .populate('respondedBy', 'name')
        .populate('reviewedBy', 'name');

      return res.json({
        success: true,
        message: 'Response sent successfully and email delivered! ✉️',
        feedback: populatedFeedback,
        emailSent: true,
        emailMessageId: emailResult.messageId
      });
    } else {
      // Email failed - don't set responseSentAt
      console.error('[FEEDBACK-RESPOND] ❌ Email failed:', emailResult.error);
      
      const populatedFeedback = await Feedback.findById(feedback._id)
        .populate('respondedBy', 'name')
        .populate('reviewedBy', 'name');

      return res.json({
        success: true,
        message: 'Response saved in database, but email delivery failed. Please contact the user directly.',
        feedback: populatedFeedback,
        emailSent: false,
        emailError: emailResult.error
      });
    }

  } catch (error) {
    console.error('[FEEDBACK-RESPOND] Error:', error);
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
    // ✅ Permission check
const hasPermission = req.user && (
  req.user.role?.name === 'admin' ||
  req.user.role?.permissions?.includes('view:feedback') ||
  req.user.role?.permissions?.includes('manage:feedback')
);

if (!hasPermission) {
  return res.status(403).json({
    success: false,
    message: 'Access denied: Insufficient permissions',
    requiredPermissions: ['view:feedback', 'manage:feedback']
  });
}
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