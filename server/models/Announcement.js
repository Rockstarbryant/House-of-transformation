const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema(
  {
    title: {
      type:      String,
      required:  [true, 'Announcement title is required'],
      trim:      true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    content: {
      type:     String,
      required: [true, 'Announcement content is required'],
      trim:     true,
    },
    priority: {
      type:    String,
      enum:    ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },
    category: {
      type:    String,
      enum:    ['general', 'event', 'service', 'urgent', 'ministry', 'technical'],
      default: 'general',
    },
    targetAudience: {
      type:    String,
      enum:    ['all', 'members', 'volunteers', 'staff', 'specific_roles'],
      default: 'all',
    },
    targetRoles: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref:  'Role',
      },
    ],
    author: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    expiresAt: {
      type:    Date,
      default: null, // null = no expiration
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
    isPinned: {
      type:    Boolean,
      default: false,
    },
    attachments: [
      {
        fileName: String,
        fileUrl:  String,
        fileType: String,
        fileSize: Number,
      },
    ],
    readBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref:  'User',
        },
        readAt: {
          type:    Date,
          default: Date.now,
        },
      },
    ],
    statistics: {
      totalViews: { type: Number, default: 0 },
      totalReads: { type: Number, default: 0 },
    },
    scheduledFor: {
      type:    Date,
      default: null,
    },

    // ── Notification channel flags ──────────────────────────────────────
    // Set by admin at creation time to control which channels fire.
    notifyEmail: {
      type:    Boolean,
      default: false,
    },
    notifySMS: {
      type:    Boolean,
      default: false,
    },
    // Set by the worker after successfully dispatching notifications.
    emailSent: {
      type:    Boolean,
      default: false,
    },
    smsSent: {
      type:    Boolean,
      default: false,
    },
    // ── Delivery tracking ─────────────────────────────────────────────────────
// Records exactly who received notifications so admin can review and resend
emailDeliveries: [
  {
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name:    String,
    email:   String,
    sentAt:  { type: Date, default: Date.now },
    success: { type: Boolean, default: true },
  },
],
smsDeliveries: [
  {
    userId:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name:    String,
    phone:   String,
    sentAt:  { type: Date, default: Date.now },
    success: { type: Boolean, default: true },
  },
],
  },
  {
    timestamps: true,
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────
AnnouncementSchema.index({ createdAt: -1 });
AnnouncementSchema.index({ priority:  1  });
AnnouncementSchema.index({ isActive:  1  });
AnnouncementSchema.index({ expiresAt: 1  });
AnnouncementSchema.index({ 'readBy.user': 1 });
AnnouncementSchema.index({ notifyEmail: 1 });
AnnouncementSchema.index({ notifySMS:   1 });

// ── Virtual ────────────────────────────────────────────────────────────────
AnnouncementSchema.virtual('isExpired').get(function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// ── Instance methods ───────────────────────────────────────────────────────
AnnouncementSchema.methods.markAsRead = function (userId) {
  const alreadyRead = this.readBy.some(
    (r) => r.user.toString() === userId.toString()
  );

  if (!alreadyRead) {
    this.readBy.push({ user: userId, readAt: new Date() });
    this.statistics.totalReads += 1;
  }

  return this.save();
};

AnnouncementSchema.methods.isReadBy = function (userId) {
  return this.readBy.some((r) => r.user.toString() === userId.toString());
};

// ── Static methods ─────────────────────────────────────────────────────────
/**
 * BUG FIX: The original had two $or keys in the same object — the second
 * silently overwrote the first, breaking the active/expired filter.
 * Fixed by using $and to combine both conditions.
 */
AnnouncementSchema.statics.getActiveForUser = async function (userId, userRoleId) {
  const now = new Date();

  const query = {
    isActive: true,
    $and: [
      // Not expired
      {
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: now } },
        ],
      },
      // Audience match
      {
        $or: [
          { targetAudience: 'all' },
          { targetAudience: 'specific_roles', targetRoles: userRoleId },
        ],
      },
    ],
  };

  return this.find(query)
    .populate('author', 'name email')
    .populate('targetRoles', 'name')
    .sort({ isPinned: -1, createdAt: -1 });
};

module.exports = mongoose.model('Announcement', AnnouncementSchema);