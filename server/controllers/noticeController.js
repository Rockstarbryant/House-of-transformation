const Notice = require('../models/Notice');

/**
 * @desc    Get the single highest-priority active notice within date range
 * @route   GET /api/notices/active
 * @access  Public
 */
exports.getActiveNotice = async (req, res) => {
  try {
    const now = new Date();

    const notice = await Notice.findOne({
      active: true,
      $or: [
        // No date range set — always show
        { startDate: null, endDate: null },
        // Only startDate set — show after start
        { startDate: { $lte: now }, endDate: null },
        // Only endDate set — show until end
        { startDate: null, endDate: { $gte: now } },
        // Both dates set — show within range
        { startDate: { $lte: now }, endDate: { $gte: now } }
      ]
    })
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: notice || null
    });
  } catch (error) {
    console.error('[NOTICE] getActiveNotice error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch active notice' });
  }
};

/**
 * @desc    Get all notices (admin)
 * @route   GET /api/notices
 * @access  Protected – manage:announcements
 */
exports.getAllNotices = async (req, res) => {
  try {
    const notices = await Notice.find()
      .populate('createdBy', 'name email')
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, count: notices.length, data: notices });
  } catch (error) {
    console.error('[NOTICE] getAllNotices error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notices' });
  }
};

/**
 * @desc    Create a new notice
 * @route   POST /api/notices
 * @access  Protected – manage:announcements
 */
exports.createNotice = async (req, res) => {
  try {
    const {
      message,
      style,
      backgroundColor,
      textColor,
      active,
      startDate,
      endDate,
      priority,
      dismissible,
      linkUrl,
      linkLabel
    } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Notice message is required' });
    }

    const notice = await Notice.create({
      message: message.trim(),
      style: style || 'static',
      backgroundColor: backgroundColor || '#8B1A1A',
      textColor: textColor || '#FFFFFF',
      active: active ?? false,
      startDate: startDate || null,
      endDate: endDate || null,
      priority: priority ?? 0,
      dismissible: dismissible ?? true,
      linkUrl: linkUrl || null,
      linkLabel: linkLabel || null,
      createdBy: req.user._id
    });

    res.status(201).json({ success: true, data: notice });
  } catch (error) {
    console.error('[NOTICE] createNotice error:', error);
    res.status(500).json({ success: false, message: 'Failed to create notice' });
  }
};

/**
 * @desc    Update a notice
 * @route   PUT /api/notices/:id
 * @access  Protected – manage:announcements
 */
exports.updateNotice = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({ success: false, message: 'Notice not found' });
    }

    const allowedFields = [
      'message', 'style', 'backgroundColor', 'textColor',
      'active', 'startDate', 'endDate', 'priority',
      'dismissible', 'linkUrl', 'linkLabel'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        notice[field] = req.body[field];
      }
    });

    await notice.save();

    res.status(200).json({ success: true, data: notice });
  } catch (error) {
    console.error('[NOTICE] updateNotice error:', error);
    res.status(500).json({ success: false, message: 'Failed to update notice' });
  }
};

/**
 * @desc    Delete a notice
 * @route   DELETE /api/notices/:id
 * @access  Protected – manage:announcements
 */
exports.deleteNotice = async (req, res) => {
  try {
    const notice = await Notice.findByIdAndDelete(req.params.id);

    if (!notice) {
      return res.status(404).json({ success: false, message: 'Notice not found' });
    }

    res.status(200).json({ success: true, message: 'Notice deleted successfully' });
  } catch (error) {
    console.error('[NOTICE] deleteNotice error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete notice' });
  }
};

/**
 * @desc    Toggle active status
 * @route   PATCH /api/notices/:id/toggle
 * @access  Protected – manage:announcements
 */
exports.toggleNotice = async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id);

    if (!notice) {
      return res.status(404).json({ success: false, message: 'Notice not found' });
    }

    notice.active = !notice.active;
    await notice.save();

    res.status(200).json({ success: true, data: notice });
  } catch (error) {
    console.error('[NOTICE] toggleNotice error:', error);
    res.status(500).json({ success: false, message: 'Failed to toggle notice' });
  }
};