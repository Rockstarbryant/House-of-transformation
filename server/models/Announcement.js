const mongoose = require('mongoose');

const AnnouncementSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Announcement title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  content: {
    type: String,
    required: [true, 'Announcement content is required'],
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  category: {
    type: String,
    enum: ['general', 'event', 'service', 'urgent', 'ministry', 'technical'],
    default: 'general'
  },
  targetAudience: {
    type: String,
    enum: ['all', 'members', 'volunteers', 'staff', 'specific_roles'],
    default: 'all'
  },
  targetRoles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  }],
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  expiresAt: {
    type: Date,
    default: null // null means no expiration
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number
  }],
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  statistics: {
    totalViews: {
      type: Number,
      default: 0
    },
    totalReads: {
      type: Number,
      default: 0
    }
  },
  scheduledFor: {
    type: Date,
    default: null // For future scheduling
  },
  emailSent: {
    type: Boolean,
    default: false
  },
  smsSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for performance
AnnouncementSchema.index({ createdAt: -1 });
AnnouncementSchema.index({ priority: 1 });
AnnouncementSchema.index({ isActive: 1 });
AnnouncementSchema.index({ expiresAt: 1 });
AnnouncementSchema.index({ 'readBy.user': 1 });

// Virtual for checking if announcement is expired
AnnouncementSchema.virtual('isExpired').get(function() {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Method to mark as read by user
AnnouncementSchema.methods.markAsRead = function(userId) {
  const alreadyRead = this.readBy.some(read => read.user.toString() === userId.toString());
  
  if (!alreadyRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
    this.statistics.totalReads += 1;
  }
  
  return this.save();
};

// Method to check if user has read announcement
AnnouncementSchema.methods.isReadBy = function(userId) {
  return this.readBy.some(read => read.user.toString() === userId.toString());
};

// Static method to get active announcements for user
AnnouncementSchema.statics.getActiveForUser = async function(userId, userRole) {
  const now = new Date();
  
  const query = {
    isActive: true,
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: now } }
    ],
    $or: [
      { targetAudience: 'all' },
      { targetAudience: 'specific_roles', targetRoles: userRole }
    ]
  };
  
  return this.find(query)
    .populate('author', 'name email')
    .populate('targetRoles', 'name')
    .sort({ isPinned: -1, createdAt: -1 });
};

module.exports = mongoose.model('Announcement', AnnouncementSchema);