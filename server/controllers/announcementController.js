const Announcement = require('../models/Announcement');
const User = require('../models/User');
const { addEmailNotificationJob, addSmsNotificationJob } = require('../queues/notificationQueue');

// ============================================
// SSE CLIENTS MANAGEMENT
// ============================================
/**
 * Map<userId (string), res>
 *
 * Using a Map instead of a plain array gives O(1) lookup/removal and
 * naturally de-duplicates — one connection per user.
 *
 * NOTE: This is an in-process store. For multi-instance deployments
 * (horizontal scaling), replace with Redis pub/sub or a dedicated
 * SSE gateway service.
 */
const sseClients = new Map();

const addSSEClient = (userId, res) => {
  // If the same user opens a second tab, close the old connection first
  if (sseClients.has(userId)) {
    try {
      sseClients.get(userId).end();
    } catch (_) { /* already closed */ }
  }
  sseClients.set(userId, res);
  console.log(`[SSE] Client connected: ${userId} | Total: ${sseClients.size}`);
};

const removeSSEClient = (userId) => {
  sseClients.delete(userId);
  console.log(`[SSE] Client disconnected: ${userId} | Total: ${sseClients.size}`);
};

/**
 * Broadcast a message to all connected SSE clients.
 * Optionally filter by audience to avoid unnecessary writes.
 *
 * @param {Object} data           - Payload to broadcast
 * @param {Set}    [targetUserIds] - If provided, only broadcast to these user IDs
 */
const broadcastToClients = (data, targetUserIds = null) => {
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  let count = 0;

  for (const [userId, res] of sseClients) {
    if (targetUserIds && !targetUserIds.has(userId)) continue;
    try {
      res.write(payload);
      count++;
    } catch (error) {
      console.error(`[SSE] Failed to write to client ${userId}:`, error.message);
      removeSSEClient(userId);
    }
  }

  console.log(`[SSE] Broadcast "${data.type}" to ${count} client(s)`);
};

// ============================================
// SSE STREAM ENDPOINT
// ============================================
exports.streamAnnouncements = async (req, res) => {
  try {
    console.log('[SSE] New connection | User:', req.user?.email);

    // CORS headers must be set before any write
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Type, Cache-Control, Connection');

    // SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');  // Disables Nginx buffering
    res.status(200);

    // Flush headers immediately
    res.write(': SSE stream initialized\n\n');
    res.flushHeaders?.(); // If response supports explicit flush

    const userId = req.user._id.toString();
    addSSEClient(userId, res);

    // Confirm connection
    res.write(`data: ${JSON.stringify({
      type:      'connected',
      message:   'SSE connection established',
      timestamp: Date.now(),
    })}\n\n`);

    // Send current unread count on connect
    try {
      const now = new Date();
      const unreadCount = await Announcement.countDocuments({
        isActive: true,
        'readBy.user': { $ne: req.user._id },
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: now } },
        ],
      });

      res.write(`data: ${JSON.stringify({ type: 'unreadCount', count: unreadCount })}\n\n`);
    } catch (countErr) {
      console.error('[SSE] Error fetching initial unread count:', countErr.message);
    }

    // Heartbeat — prevents proxies/load balancers from closing idle connections
    const heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch (err) {
        console.error('[SSE] Heartbeat error — removing client');
        clearInterval(heartbeat);
        removeSSEClient(userId);
      }
    }, 25_000); // 25 s (below typical 30 s proxy timeouts)

    // Cleanup on disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      removeSSEClient(userId);
    });

    req.on('error', (err) => {
      console.error('[SSE] Request error:', err.message);
      clearInterval(heartbeat);
      removeSSEClient(userId);
    });

  } catch (error) {
    console.error('[SSE] Stream setup error:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Failed to establish SSE connection' });
    }
  }
};

// ============================================
// GET ALL ANNOUNCEMENTS (with filters)
// ============================================
exports.getAllAnnouncements = async (req, res) => {
  try {
    const {
      page       = 1,
      limit      = 20,
      priority,
      category,
      isActive,
      unreadOnly,
      startDate,
      endDate,
      search,
    } = req.query;

    // ── Base query ────────────────────────────────────────────────────────
    const query = {};

    if (priority)  query.priority  = priority;
    if (category)  query.category  = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate)   query.createdAt.$lte = new Date(endDate);
    }

    if (search) {
      query.$or = [
        { title:   { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    if (unreadOnly === 'true' && req.user) {
      query['readBy.user'] = { $ne: req.user._id };
    }

    // ── BUG FIX: original code had two $or keys — second silently overwrote the first.
    // Use $and to combine search $or with expiry $or.
    const now = new Date();
    const expiryCondition = {
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: now } },
      ],
    };

    // Merge expiry with existing query using $and
    const finalQuery = query.$or
      ? { $and: [{ $or: query.$or }, expiryCondition, ...Object.entries(query)
          .filter(([k]) => k !== '$or')
          .map(([k, v]) => ({ [k]: v })) ] }
      : { ...query, ...expiryCondition };

    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Announcement.countDocuments(finalQuery);

    const announcements = await Announcement.find(finalQuery)
      .populate('author', 'name email')
      .populate('targetRoles', 'name')
      .sort({ isPinned: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Attach isRead flag per user
    const withReadStatus = announcements.map((a) => ({
      ...a,
      isRead: req.user
        ? a.readBy?.some((r) => r.user?.toString() === req.user._id.toString())
        : false,
    }));

    res.json({
      success:       true,
      count:         announcements.length,
      total,
      page:          parseInt(page),
      pages:         Math.ceil(total / parseInt(limit)),
      announcements: withReadStatus,
    });

  } catch (error) {
    console.error('[ANNOUNCEMENT-GET-ALL] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch announcements' });
  }
};

// ============================================
// GET SINGLE ANNOUNCEMENT
// ============================================
exports.getAnnouncementById = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate('author', 'name email')
      .populate('targetRoles', 'name');

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    // Increment view count (fire-and-forget — don't block response)
    Announcement.findByIdAndUpdate(req.params.id, {
      $inc: { 'statistics.totalViews': 1 },
    }).catch((e) => console.error('[SSE] View count update failed:', e.message));

    const obj    = announcement.toObject();
    obj.isRead   = req.user ? announcement.isReadBy(req.user._id) : false;

    res.json({ success: true, announcement: obj });

  } catch (error) {
    console.error('[ANNOUNCEMENT-GET] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch announcement' });
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
      scheduledFor,
      notifyEmail = false,   // ← NEW
      notifySMS   = false,   // ← NEW
    } = req.body;

    if (!title?.trim() || !content?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Title and content are required',
      });
    }

    const announcement = await Announcement.create({
      title:          title.trim(),
      content:        content.trim(),
      priority:       priority    || 'normal',
      category:       category    || 'general',
      targetAudience: targetAudience || 'all',
      targetRoles:    targetRoles || [],
      author:         req.user._id,
      expiresAt:      expiresAt   || null,
      isPinned:       isPinned    || false,
      scheduledFor:   scheduledFor || null,
      notifyEmail:    Boolean(notifyEmail),  // ← NEW
      notifySMS:      Boolean(notifySMS),    // ← NEW
    });

    const populated = await Announcement.findById(announcement._id)
      .populate('author', 'name email')
      .populate('targetRoles', 'name');

    // ── 1. SSE broadcast (immediate, synchronous) ─────────────────────────
    broadcastToClients({ type: 'new_announcement', announcement: populated });

    // ── 2. Queue notification jobs (async, non-blocking) ─────────────────
    const announcementId = announcement._id.toString();

    if (notifyEmail) {
      await addEmailNotificationJob(announcementId);
    }

    if (notifySMS) {
      await addSmsNotificationJob(announcementId);
    }

    console.log(
      `[ANNOUNCEMENT-CREATE] ✅ Created: "${title}" | email=${notifyEmail} sms=${notifySMS}`
    );

    res.status(201).json({
      success:      true,
      message:      'Announcement created successfully',
      announcement: populated,
    });

  } catch (error) {
    console.error('[ANNOUNCEMENT-CREATE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create announcement',
      error:   error.message,
    });
  }
};

// ============================================
// UPDATE ANNOUNCEMENT
// ============================================
exports.updateAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    // Whitelist updatable fields to prevent mass-assignment
    const ALLOWED = [
      'title', 'content', 'priority', 'category', 'targetAudience',
      'targetRoles', 'expiresAt', 'isPinned', 'scheduledFor', 'isActive',
      'notifyEmail', 'notifySMS',
    ];

    ALLOWED.forEach((key) => {
      if (req.body[key] !== undefined) {
        announcement[key] = req.body[key];
      }
    });

    await announcement.save();

    const updated = await Announcement.findById(id)
      .populate('author', 'name email')
      .populate('targetRoles', 'name');

    broadcastToClients({ type: 'announcement_updated', announcement: updated });

    res.json({ success: true, message: 'Announcement updated successfully', announcement: updated });

  } catch (error) {
    console.error('[ANNOUNCEMENT-UPDATE] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update announcement' });
  }
};

// ============================================
// DELETE ANNOUNCEMENT
// ============================================
exports.deleteAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findByIdAndDelete(id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    broadcastToClients({ type: 'announcement_deleted', announcementId: id });

    res.json({ success: true, message: 'Announcement deleted successfully' });

  } catch (error) {
    console.error('[ANNOUNCEMENT-DELETE] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete announcement' });
  }
};

// ============================================
// MARK AS READ
// ============================================
exports.markAsRead = async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    await announcement.markAsRead(req.user._id);

    const now = new Date();
    const unreadCount = await Announcement.countDocuments({
      isActive:        true,
      'readBy.user':   { $ne: req.user._id },
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: now } },
      ],
    });

    res.json({ success: true, message: 'Marked as read', unreadCount });

  } catch (error) {
    console.error('[ANNOUNCEMENT-MARK-READ] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark as read' });
  }
};

// ============================================
// MARK ALL AS READ
// ============================================
exports.markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const now    = new Date();

    const unread = await Announcement.find({
      isActive:      true,
      'readBy.user': { $ne: userId },
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: now } },
      ],
    }).select('_id');

    await Promise.all(unread.map((a) => a.markAsRead(userId)));

    res.json({
      success: true,
      message: `Marked ${unread.length} announcements as read`,
      count:   unread.length,
    });

  } catch (error) {
    console.error('[ANNOUNCEMENT-MARK-ALL-READ] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to mark all as read' });
  }
};

// ============================================
// GET UNREAD COUNT
// ============================================
exports.getUnreadCount = async (req, res) => {
  try {
    const now = new Date();
    const count = await Announcement.countDocuments({
      isActive:      true,
      'readBy.user': { $ne: req.user._id },
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: now } },
      ],
    });

    res.json({ success: true, unreadCount: count });

  } catch (error) {
    console.error('[ANNOUNCEMENT-UNREAD-COUNT] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get unread count' });
  }
};

// ============================================
// RESEND NOTIFICATIONS
// ============================================
exports.resendNotifications = async (req, res) => {
  try {
    const { id }      = req.params;
    const { channel } = req.body; // 'email' | 'sms' | 'both'

    if (!['email', 'sms', 'both'].includes(channel)) {
      return res.status(400).json({
        success: false,
        message: "channel must be 'email', 'sms', or 'both'",
      });
    }

    const announcement = await Announcement.findById(id);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    const { addEmailNotificationJob, addSmsNotificationJob } = require('../queues/notificationQueue');
    const queued = [];

    if (channel === 'email' || channel === 'both') {
      // Force re-enable so the service doesn't skip it
      await Announcement.findByIdAndUpdate(id, { notifyEmail: true, emailSent: false });
      //await addEmailNotificationJob(id + '-resend-' + Date.now()); // unique job id
      // BullMQ jobId deduplication uses the id option — pass announcement id + timestamp
      const { Queue } = require('bullmq');
      const { getRedisConnection } = require('../config/redis');
      const q = new Queue('announcement-notifications', { connection: getRedisConnection() });
      await q.add('send-email', { announcementId: id }, {
        jobId: `email-resend-${id}-${Date.now()}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
      queued.push('email');
    }

    if (channel === 'sms' || channel === 'both') {
      await Announcement.findByIdAndUpdate(id, { notifySMS: true, smsSent: false });
      const { Queue } = require('bullmq');
      const { getRedisConnection } = require('../config/redis');
      const q = new Queue('announcement-notifications', { connection: getRedisConnection() });
      await q.add('send-sms', { announcementId: id }, {
        jobId: `sms-resend-${id}-${Date.now()}`,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
      queued.push('sms');
    }

    console.log(`[ANNOUNCEMENT-RESEND] Queued resend for: ${queued.join(', ')} | announcement: ${id}`);

    res.json({
      success: true,
      message: `Resend queued for: ${queued.join(', ')}`,
      queued,
    });

  } catch (error) {
    console.error('[ANNOUNCEMENT-RESEND] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to queue resend', error: error.message });
  }
};

// ============================================
// NOTIFICATION DELIVERY STATS
// ============================================
exports.getNotificationStats = async (req, res) => {
  try {
    const { id } = req.params;

    const announcement = await Announcement.findById(id)
      .select('title notifyEmail notifySMS emailSent smsSent emailDeliveries smsDeliveries')
      .lean();

    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    const emailDeliveries = announcement.emailDeliveries || [];
    const smsDeliveries   = announcement.smsDeliveries   || [];

    res.json({
      success: true,
      stats: {
        email: {
          enabled:    announcement.notifyEmail,
          sent:       announcement.emailSent,
          total:      emailDeliveries.length,
          successful: emailDeliveries.filter(d => d.success).length,
          failed:     emailDeliveries.filter(d => !d.success).length,
          deliveries: emailDeliveries,
        },
        sms: {
          enabled:    announcement.notifySMS,
          sent:       announcement.smsSent,
          total:      smsDeliveries.length,
          successful: smsDeliveries.filter(d => d.success).length,
          failed:     smsDeliveries.filter(d => !d.success).length,
          deliveries: smsDeliveries,
        },
      },
    });

  } catch (error) {
    console.error('[ANNOUNCEMENT-NOTIF-STATS] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get notification stats' });
  }
};

// ============================================
// CLEAR ALL (alias for markAllAsRead)
// ============================================
exports.clearAllNotifications = exports.markAllAsRead;

// ============================================
// STATISTICS
// ============================================
exports.getStatistics = async (req, res) => {
  try {
    const [total, active, pinned, priorityStats, categoryStats] = await Promise.all([
      Announcement.countDocuments(),
      Announcement.countDocuments({ isActive: true }),
      Announcement.countDocuments({ isPinned: true }),
      Announcement.aggregate([{ $group: { _id: '$priority', count: { $sum: 1 } } }]),
      Announcement.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    ]);

    res.json({
      success: true,
      statistics: { total, active, pinned, byPriority: priorityStats, byCategory: categoryStats },
    });

  } catch (error) {
    console.error('[ANNOUNCEMENT-STATS] Error:', error);
    res.status(500).json({ success: false, message: 'Failed to get statistics' });
  }
};