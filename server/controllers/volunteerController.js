const Volunteer = require('../models/Volunteer');
const User = require('../models/User');

// Helper function to get client IP
const getClientIp = (req) => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         req.connection.socket?.remoteAddress ||
         'unknown';
};

// @desc    Get volunteer opportunities
// @route   GET /api/volunteers/opportunities
// @access  Public
exports.getOpportunities = async (req, res) => {
  try {
    const opportunities = [
      {
        id: 1,
        title: 'Worship Team',
        description: 'Join our praise and worship team',
        requirements: 'Musical ability, commitment to rehearsals',
        spots: 5,
        icon: '🎵'
      },
      {
        id: 2,
        title: 'Children\'s Ministry',
        description: 'Help teach and care for our youngest members',
        requirements: 'Love for children, patience, background check',
        spots: 8,
        icon: '👶'
      },
      {
        id: 3,
        title: 'Ushering Team',
        description: 'Welcome and guide visitors during services',
        requirements: 'Friendly demeanor, punctuality',
        spots: 10,
        icon: '🤝'
      },
      {
        id: 4,
        title: 'Technical Team',
        description: 'Manage sound, lights, and live streaming',
        requirements: 'Technical skills, willingness to learn',
        spots: 4,
        icon: '🎬'
      },
      {
        id: 5,
        title: 'Community Outreach',
        description: 'Serve in local outreach programs',
        requirements: 'Heart for service, availability',
        spots: 15,
        icon: '❤️'
      }
    ];
    res.json({ success: true, opportunities });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch opportunities',
      error: error.message 
    });
  }
};

// @desc    Check if user has active application
// @route   GET /api/volunteers/check-application
// @access  Private
exports.checkExistingApplication = async (req, res) => {
  try {
    // Check for any active applications (pending, approved, or interviewing)
    const existingApplication = await Volunteer.findOne({
      email: req.user.email,
      status: { $in: ['pending', 'approved', 'interviewing'] }
    });

    if (existingApplication) {
      return res.json({
        success: true,
        hasApplication: true,
        application: {
          id: existingApplication._id,
          ministry: existingApplication.ministry,
          status: existingApplication.status,
          appliedAt: existingApplication.appliedAt,
          isEditable: existingApplication.isEditable(),
          canChangeRole: existingApplication.isEditable() // Can only change if still editable
        }
      });
    }

    res.json({
      success: true,
      hasApplication: false
    });
  } catch (error) {
    console.error('Check application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check application status',
      error: error.message
    });
  }
};

// @desc    Submit volunteer application
// @route   POST /api/volunteers/apply
// @access  Private
exports.apply = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      ministry,
      availability,
      motivation,
      previousExperience,
      skills
    } = req.body;

    // Validation
    if (!fullName || !email || !phone || !ministry || !availability || !motivation) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Get client IP
    const ipAddress = getClientIp(req);

    // CHECK 1: Email-based restriction (active applications)
    const existingApplicationByEmail = await Volunteer.findOne({
      email: email.toLowerCase(),
      status: { $in: ['pending', 'approved', 'interviewing'] }
    });

    if (existingApplicationByEmail) {
      return res.status(400).json({
        success: false,
        message: 'Application already received',
        code: 'DUPLICATE_APPLICATION',
        existingApplication: {
          id: existingApplicationByEmail._id,
          ministry: existingApplicationByEmail.ministry,
          status: existingApplicationByEmail.status,
          appliedAt: existingApplicationByEmail.appliedAt,
          isEditable: existingApplicationByEmail.isEditable(),
          canChangeRole: existingApplicationByEmail.isEditable()
        }
      });
    }

    // CHECK 2: IP-based restriction (security measure)
    const existingApplicationByIP = await Volunteer.findOne({
      ipAddress: ipAddress,
      status: { $in: ['pending', 'approved', 'interviewing'] }
    });

    if (existingApplicationByIP) {
      return res.status(400).json({
        success: false,
        message: 'An application from this network has already been submitted',
        code: 'IP_RESTRICTION',
        existingApplication: {
          id: existingApplicationByIP._id,
          ministry: existingApplicationByIP.ministry,
          status: existingApplicationByIP.status,
          appliedAt: existingApplicationByIP.appliedAt
        }
      });
    }

    // Create application
    const application = await Volunteer.create({
      user: req.user._id,
      fullName,
      email: email.toLowerCase(),
      phone,
      ministry,
      availability,
      motivation,
      previousExperience: previousExperience || '',
      skills: skills || '',
      ipAddress: ipAddress,
      status: 'pending'
    });

    // Populate user data for response
    await application.populate('user', 'name email');

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully! We will review it and get back to you soon.',
      application: {
        id: application._id,
        ministry: application.ministry,
        status: application.status,
        appliedAt: application.appliedAt,
        isEditable: application.isEditable(),
        editableUntil: new Date(application.appliedAt.getTime() + 3 * 60 * 60 * 1000)
      }
    });
  } catch (error) {
    console.error('Application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit application',
      error: error.message
    });
  }
};

// @desc    Edit existing volunteer application (one-time within 3 hours)
// @route   PUT /api/volunteers/:id/edit
// @access  Private
exports.editApplication = async (req, res) => {
  try {
    const { ministry, availability, motivation, previousExperience, skills } = req.body;

    const application = await Volunteer.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    // Verify user owns this application
    if (application.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this application'
      });
    }

    // Check if application is still editable
    if (!application.isEditable()) {
      return res.status(400).json({
        success: false,
        message: 'Application can no longer be edited',
        code: 'EDIT_WINDOW_CLOSED',
        reason: application.editCount > 0 
          ? 'You have already edited this application once'
          : 'More than 3 hours have passed since application submission'
      });
    }

    // Update application
    application.ministry = ministry;
    application.availability = availability;
    application.motivation = motivation;
    application.previousExperience = previousExperience || '';
    application.skills = skills || '';

    // Lock editing after this edit
    await application.lockEditing();

    res.json({
      success: true,
      message: 'Application updated successfully. No further changes allowed.',
      application: {
        id: application._id,
        ministry: application.ministry,
        status: application.status,
        appliedAt: application.appliedAt,
        editedAt: application.lastEditedAt,
        isEditable: false,
        editLockedAt: application.editLockedAt
      }
    });
  } catch (error) {
    console.error('Edit application error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to edit application',
      error: error.message
    });
  }
};

// @desc    Get volunteer profile
// @route   GET /api/volunteers/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const applications = await Volunteer.find({ user: req.user.id });
    
    const approvedApplications = applications.filter(app => app.status === 'approved');
    const totalHours = approvedApplications.reduce((sum, app) => sum + (app.hours || 0), 0);
    const activeMinistries = [...new Set(approvedApplications.map(app => app.ministry))];

    let level = 'Starter';
    if (totalHours > 100) {
      level = 'Legend';
    } else if (totalHours > 50) {
      level = 'Champion';
    } else if (totalHours > 20) {
      level = 'Active';
    }

    res.json({
      success: true,
      profile: {
        hours: totalHours,
        ministries: activeMinistries.length,
        level: level,
        applications: applications
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
      error: error.message
    });
  }
};

// @desc    Get user's applications
// @route   GET /api/volunteers/my-applications
// @access  Private
exports.getMyApplications = async (req, res) => {
  try {
    const applications = await Volunteer.find({ user: req.user.id })
      .sort({ appliedAt: -1 });

    const applicationsWithMetadata = applications.map(app => ({
      ...app.toObject(),
      isEditable: app.isEditable(),
      editableUntil: new Date(app.appliedAt.getTime() + 3 * 60 * 60 * 1000)
    }));

    res.json({
      success: true,
      applications: applicationsWithMetadata
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: error.message
    });
  }
};

// @desc    Get all volunteer applications (Admin)
// @route   GET /api/volunteers/applications
// @access  Private/Admin
exports.getAllApplications = async (req, res) => {
  try {
    const { status, ministry } = req.query;
    
    let filter = {};
    if (status) filter.status = status;
    if (ministry) filter.ministry = ministry;

    const applications = await Volunteer.find(filter)
      .populate('user', 'name email')
      .populate('reviewedBy', 'name')
      .sort({ appliedAt: -1 });

    res.json({
      success: true,
      count: applications.length,
      applications
    });
  } catch (error) {
    console.error('Fetch applications error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch applications',
      error: error.message
    });
  }
};

// @desc    Update volunteer application status (Admin)
// @route   PUT /api/volunteers/:id
// @access  Private/Admin
exports.updateStatus = async (req, res) => {
  try {
    const { status, adminNotes, startDate } = req.body;

    const updateData = {
      status,
      reviewedAt: Date.now(),
      reviewedBy: req.user.id
    };

    if (adminNotes) updateData.adminNotes = adminNotes;
    if (status === 'approved' && startDate) updateData.startDate = startDate;

    const application = await Volunteer.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('user', 'name email')
      .populate('reviewedBy', 'name');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    if (status === 'approved') {
      const Role = require('../models/Role');
      const user = await User.findById(application.user._id).populate('role');
      
      if (user) {
        const volunteerRole = await Role.findOne({ name: 'volunteer' });
        if (volunteerRole && user.role.name !== 'volunteer') {
          user.role = volunteerRole._id;
          await user.save();
        }
      }
    }

    res.json({
      success: true,
      message: `Application ${status} successfully`,
      application
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update application',
      error: error.message
    });
  }
};

// @desc    Update volunteer hours (Admin)
// @route   PUT /api/volunteers/:id/hours
// @access  Private/Admin
exports.updateHours = async (req, res) => {
  try {
    const { hours } = req.body;

    const application = await Volunteer.findByIdAndUpdate(
      req.params.id,
      { $inc: { hours: hours } },
      { new: true }
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Volunteer record not found'
      });
    }

    res.json({
      success: true,
      message: 'Hours updated successfully',
      application
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update hours',
      error: error.message
    });
  }
};

// @desc    Delete volunteer application (Admin)
// @route   DELETE /api/volunteers/:id
// @access  Private/Admin
exports.deleteApplication = async (req, res) => {
  try {
    const application = await Volunteer.findById(req.params.id);

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found'
      });
    }

    await application.deleteOne();

    res.json({
      success: true,
      message: 'Application deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete application',
      error: error.message
    });
  }
};

// @desc    Get volunteer statistics (Admin)
// @route   GET /api/volunteers/stats
// @access  Private/Admin
exports.getStats = async (req, res) => {
  try {
    const totalApplications = await Volunteer.countDocuments();
    const pendingApplications = await Volunteer.countDocuments({ status: 'pending' });
    const approvedVolunteers = await Volunteer.countDocuments({ status: 'approved' });
    
    const totalHoursResult = await Volunteer.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$hours' } } }
    ]);
    const totalHours = totalHoursResult.length > 0 ? totalHoursResult[0].total : 0;

    const ministryBreakdown = await Volunteer.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$ministry', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('Volunteer Stats:', {
      totalApplications,
      pendingApplications,
      approvedVolunteers,
      totalHours,
      ministryBreakdown
    });

    res.json({
      success: true,
      stats: {
        totalApplications,
        pendingApplications,
        approvedVolunteers,
        totalHours,
        ministryBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};