const Volunteer = require('../models/Volunteer');
const User = require('../models/User');

// @desc    Get volunteer opportunities
// @route   GET /api/volunteers/opportunities
// @access  Public
exports.getOpportunities = async (req, res) => {
  try {
    // In a real app, you might have an Opportunity model
    // For now, return static data that matches your frontend
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

    // Check if user already applied for this ministry
    const existingApplication = await Volunteer.findOne({
      user: req.user.id,
      ministry: ministry,
      status: { $in: ['pending', 'approved', 'interviewing'] }
    });

    if (existingApplication) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active application for this ministry'
      });
    }

    // Create application
    const application = await Volunteer.create({
      user: req.user.id,
      fullName,
      email,
      phone,
      ministry,
      availability,
      motivation,
      previousExperience: previousExperience || '',
      skills: skills || '',
      status: 'pending'
    });

    // Populate user data for response
    await application.populate('user', 'name email');

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully! We will review it and get back to you soon.',
      application
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

// @desc    Get volunteer profile
// @route   GET /api/volunteers/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    // Get all applications for this user
    const applications = await Volunteer.find({ user: req.user.id });
    
    // Calculate stats
    const approvedApplications = applications.filter(app => app.status === 'approved');
    const totalHours = approvedApplications.reduce((sum, app) => sum + (app.hours || 0), 0);
    const activeMinistries = [...new Set(approvedApplications.map(app => app.ministry))];

    // Determine volunteer level based on hours
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

    res.json({
      success: true,
      applications
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

    // If approved, you might want to update the user's role
    if (status === 'approved') {
      const user = await User.findById(application.user._id);
      if (user && user.role === 'member') {
        user.role = 'volunteer';
        await user.save();
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
    
    // Get total hours - handle empty result
    const totalHoursResult = await Volunteer.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$hours' } } }
    ]);
    const totalHours = totalHoursResult.length > 0 ? totalHoursResult[0].total : 0;

    // Get ministry breakdown
    const ministryBreakdown = await Volunteer.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$ministry', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Log for debugging
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