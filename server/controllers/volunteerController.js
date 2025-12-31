const Volunteer = require('../models/Volunteer');

// @desc    Get volunteer opportunities
// @route   GET /api/volunteers/opportunities
// @access  Public
exports.getOpportunities = async (req, res) => {
  try {
    // In a real app, you'd have an Opportunity model
    // For now, return static data
    const opportunities = [
      { id: 1, title: 'Worship Team', spots: 5 },
      { id: 2, title: 'Children\'s Ministry', spots: 8 },
      { id: 3, title: 'Ushering Team', spots: 10 }
    ];
    res.json({ success: true, opportunities });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Submit volunteer application
// @route   POST /api/volunteers/apply
// @access  Private
exports.apply = async (req, res) => {
  try {
    const applicationData = {
      ...req.body,
      user: req.user.id
    };
    const application = await Volunteer.create(applicationData);
    res.status(201).json({ 
      success: true, 
      message: 'Application submitted successfully',
      application 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get volunteer profile
// @route   GET /api/volunteers/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const volunteer = await Volunteer.findOne({ user: req.user.id });
    
    if (!volunteer) {
      return res.json({
        success: true,
        profile: {
          hours: 0,
          ministries: 0,
          level: 'Starter'
        }
      });
    }

    res.json({
      success: true,
      profile: {
        hours: volunteer.hours || 0,
        ministries: volunteer.ministries.length,
        level: volunteer.hours > 50 ? 'Champion' : volunteer.hours > 20 ? 'Active' : 'Starter'
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update volunteer status
// @route   PUT /api/volunteers/:id
// @access  Private/Admin
exports.updateStatus = async (req, res) => {
  try {
    const volunteer = await Volunteer.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    if (!volunteer) {
      return res.status(404).json({ message: 'Application not found' });
    }
    res.json({ success: true, volunteer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all volunteer applications
// @route   GET /api/volunteers/applications
// @access  Private/Admin
exports.getAllApplications = async (req, res) => {
  try {
    const applications = await Volunteer.find()
      .populate('user', 'name email')
      .sort({ appliedAt: -1 });
    res.json({ success: true, applications });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};