const Announcement = require('../models/Announcement');
const User = require('../models/User');

// ============================================
// SSE CLIENTS MANAGEMENT
// ============================================
let sseClients = [];

// Add SSE client
const addSSEClient = (client) => {
  sseClients.push(client);
  console.log(`[SSE] Client connected. Total clients: ${sseClients.length}`);
};

// Remove SSE client
const removeSSEClient = (client) => {
  sseClients = sseClients.filter(c => c !== client);
  console.log(`[SSE] Client disconnected. Total clients: ${sseClients.length}`);
};

// Broadcast to all SSE clients
const broadcastToClients = (data) => {
  console.log(`[SSE] Broadcasting to ${sseClients.length} clients`);
  sseClients.forEach(client => {
    try {
      client.write(`data: ${JSON.stringify(data)}\n\n`);
    } catch (error) {
      console.error('[SSE] Error broadcasting to client:', error);
    }
  });
};

// ============================================
// SSE STREAM ENDPOINT
// ============================================
exports.streamAnnouncements = async (req, res) => {
  try {
    console.log('[SSE] New SSE connection request');

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable buffering for nginx
    res.write(': SSE stream initialized\n\n');

    // Add this client to the list
    addSSEClient(res);

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', message: 'SSE connection established' })}\n\n`);

    // Send current unread count
    if (req.user) {
      const unreadCount = await Announcement.countDocuments({
        isActive: true,
        'readBy.user': { $ne: req.user._id },
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: new Date() } }
        ]
      });

      res.write(`data: ${JSON.stringify({ 
        type: 'unreadCount', 
        count: unreadCount 
      })}\n\n`);
    }

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      res.write(`:heartbeat\n\n`);
    }, 30000); // Every 30 seconds

    // Clean up on client disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      removeSSEClient(res);
      console.log('[SSE] Client connection closed');
    });

  } catch (error) {
    console.error('[SSE] Stream error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to establish SSE connection'
    });
  }
};

// ============================================
// GET ALL ANNOUNCEMENTS (with filters)
// ============================================
exports.getAllAnnouncements = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      priority,
      category,
      isActive,
      unreadOnly,
      startDate,
      endDate,
      search
    } = req.query;

    const query = {};

    // Build query filters
    if (priority) query.priority = priority;
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    // Unread only filter
    if (unreadOnly === 'true' && req.user) {
      query['readBy.user'] = { $ne: req.user._id };
    }

    // Exclude expired announcements
    const now = new Date();
    query.$or = [
      { expiresAt: null },
      { expiresAt: { $gt: now } }
    ];

    const skip = (page - 1) * limit;

    const announcements = await Announcement.find(query)
      .populate('author', 'name email')
      .populate('targetRoles', 'name')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Announcement.countDocuments(query);

    // Add isRead flag for current user
    const announcementsWithReadStatus = announcements.map(announcement => {
      const announcementObj = announcement.toObject();
      announcementObj.isRead = req.user ? announcement.isReadBy(req.user._id) : false;
      return announcementObj;
    });

    res.json({
      success: true,
      count: announcements.length,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      announcements: announcementsWithReadStatus
    });

  } catch (error) {
    console.error('[ANNOUNCEMENT-GET-ALL] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcements'
    });
  }
};

// ============================================
// GET SINGLE ANNOUNCEMENT
// ============================================
exports.getAnnouncementById = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findById(id)
      .populate('author', 'name email')
      .populate('targetRoles', 'name');

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Increment view count
    announcement.statistics.totalViews += 1;
    await announcement.save();

    // Add isRead flag
    const announcementObj = announcement.toObject();
    announcementObj.isRead = req.user ? announcement.isReadBy(req.user._id) : false;

    res.json({
      success: true,
      announcement: announcementObj
    });

  } catch (error) {
    console.error('[ANNOUNCEMENT-GET] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch announcement'
    });
  }
};

// ============================================
// CREATE ANNOUNCEMENT
// ============================================
exports.createAnnouncement = async (req, res) => {
  try {
    const {
      title,
      content,
      priority,
      category,
      targetAudience,
      targetRoles,
      expiresAt,
      isPinned,
      scheduledFor
    } = req.body;

    console.log('[ANNOUNCEMENT-CREATE] Creating announcement:', title);

    // Validate required fields
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required'
      });
    }

    const announcement = await Announcement.create({
      title,
      content,
      priority: priority || 'normal',
      category: category || 'general',
      targetAudience: targetAudience || 'all',
      targetRoles: targetRoles || [],
      author: req.user._id,
      expiresAt: expiresAt || null,
      isPinned: isPinned || false,
      scheduledFor: scheduledFor || null
    });

    const populatedAnnouncement = await Announcement.findById(announcement._id)
      .populate('author', 'name email')
      .populate('targetRoles', 'name');

    // Broadcast to SSE clients
    broadcastToClients({
      type: 'new_announcement',
      announcement: populatedAnnouncement
    });

    console.log('[ANNOUNCEMENT-CREATE] Announcement created successfully');

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      announcement: populatedAnnouncement
    });

  } catch (error) {
    console.error('[ANNOUNCEMENT-CREATE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create announcement',
      error: error.message
    });
  }
};

// ============================================
// UPDATE ANNOUNCEMENT
// ============================================
exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    console.log('[ANNOUNCEMENT-UPDATE] Updating announcement:', id);

    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Update fields
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        announcement[key] = updates[key];
      }
    });

    await announcement.save();

    const updatedAnnouncement = await Announcement.findById(id)
      .populate('author', 'name email')
      .populate('targetRoles', 'name');

    // Broadcast update to SSE clients
    broadcastToClients({
      type: 'announcement_updated',
      announcement: updatedAnnouncement
    });

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      announcement: updatedAnnouncement
    });

  } catch (error) {
    console.error('[ANNOUNCEMENT-UPDATE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update announcement'
    });
  }
};

// ============================================
// DELETE ANNOUNCEMENT
// ============================================
exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    console.log('[ANNOUNCEMENT-DELETE] Deleting announcement:', id);

    const announcement = await Announcement.findByIdAndDelete(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    // Broadcast deletion to SSE clients
    broadcastToClients({
      type: 'announcement_deleted',
      announcementId: id
    });

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });

  } catch (error) {
    console.error('[ANNOUNCEMENT-DELETE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete announcement'
    });
  }
};

// ============================================
// MARK AS READ
// ============================================
exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findById(id);

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    await announcement.markAsRead(req.user._id);

    // Get updated unread count for user
    const unreadCount = await Announcement.countDocuments({
      isActive: true,
      'readBy.user': { $ne: req.user._id },
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    res.json({
      success: true,
      message: 'Marked as read',
      unreadCount
    });

  } catch (error) {
    console.error('[ANNOUNCEMENT-MARK-READ] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark as read'
    });
  }
};

// ============================================
// MARK ALL AS READ
// ============================================
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    // Find all unread announcements for this user
    const unreadAnnouncements = await Announcement.find({
      isActive: true,
      'readBy.user': { $ne: userId },
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    // Mark each as read
    const promises = unreadAnnouncements.map(announcement => 
      announcement.markAsRead(userId)
    );

    await Promise.all(promises);

    res.json({
      success: true,
      message: `Marked ${unreadAnnouncements.length} announcements as read`,
      count: unreadAnnouncements.length
    });

  } catch (error) {
    console.error('[ANNOUNCEMENT-MARK-ALL-READ] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark all as read'
    });
  }
};

// ============================================
// GET UNREAD COUNT
// ============================================
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Announcement.countDocuments({
      isActive: true,
      'readBy.user': { $ne: req.user._id },
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    });

    res.json({
      success: true,
      unreadCount: count
    });

  } catch (error) {
    console.error('[ANNOUNCEMENT-UNREAD-COUNT] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get unread count'
    });
  }
};

// ============================================
// CLEAR ALL NOTIFICATIONS
// ============================================
exports.clearAllNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    // This doesn't delete announcements, just marks them as read
    // and optionally hides them from the user's view
    await exports.markAllAsRead(req, res);

  } catch (error) {
    console.error('[ANNOUNCEMENT-CLEAR-ALL] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear notifications'
    });
  }
};

// ============================================
// GET ANNOUNCEMENT STATISTICS
// ============================================
exports.getStatistics = async (req, res) => {
  try {
    const totalAnnouncements = await Announcement.countDocuments();
    const activeAnnouncements = await Announcement.countDocuments({ isActive: true });
    const pinnedAnnouncements = await Announcement.countDocuments({ isPinned: true });
    
    const priorityStats = await Announcement.aggregate([
      { $group: { _id: '$priority', count: { $sum: 1 } } }
    ]);

    const categoryStats = await Announcement.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    res.json({
      success: true,
      statistics: {
        total: totalAnnouncements,
        active: activeAnnouncements,
        pinned: pinnedAnnouncements,
        byPriority: priorityStats,
        byCategory: categoryStats
      }
    });

  } catch (error) {
    console.error('[ANNOUNCEMENT-STATS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get statistics'
    });
  }
};