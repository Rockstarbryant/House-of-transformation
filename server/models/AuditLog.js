// server/models/AuditLog.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  // User Information
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // null for unauthenticated actions
  },
  userEmail: {
    type: String,
    default: null
  },
  userName: {
    type: String,
    default: null
  },
  userRole: {
    type: String,
    default: null
  },
  
  // Action Details
  action: {
    type: String,
    required: true,
    enum: [
      // Authentication
      'auth.login.success',
      'auth.login.failed',
      'auth.signup.success',
      'auth.signup.failed',
      'auth.logout',
      'auth.token.refresh',
      'auth.password.reset.request',
      'auth.password.reset.success',
      'auth.email.verify',
      
      // User Management
      'user.create',
      'user.update',
      'user.delete',
      'user.role.change',
      'user.status.change',
      'user.bulk.update',
      
      // Content Management
      'sermon.create',
      'sermon.update',
      'sermon.delete',
      'sermon.like',
      'blog.create',
      'blog.update',
      'blog.delete',
      'blog.approve',
      'event.create',
      'event.update',
      'event.delete',
      'event.register',
      'gallery.upload',
      'gallery.delete',
      'gallery.like',
      
      // Livestream
      'livestream.create',
      'livestream.update',
      'livestream.archive',
      'livestream.delete',
      
      // Volunteer
      'volunteer.apply',
      'volunteer.edit',
      'volunteer.approve',
      'volunteer.reject',
      'volunteer.delete',
      
      // Feedback
      'feedback.submit',
      'feedback.update',
      'feedback.respond',
      'feedback.publish',
      'feedback.delete',
      
      // System
      'system.access.denied',
      'system.error',
      'system.rate.limit'
    ]
  },
  
  // Resource Details
  resourceType: {
    type: String,
    enum: ['user', 'sermon', 'blog', 'event', 'gallery', 'livestream', 'volunteer', 'feedback', 'system'],
    required: true
  },
  resourceId: {
    type: String,
    default: null
  },
  resourceName: {
    type: String,
    default: null
  },
  
  // Request Details
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    required: true
  },
  endpoint: {
    type: String,
    required: true
  },
  statusCode: {
    type: Number,
    required: true
  },
  
  // Data Changes (for updates)
  changes: {
    before: mongoose.Schema.Types.Mixed,
    after: mongoose.Schema.Types.Mixed
  },
  
  // Request Metadata
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    default: null
  },
  
  // Additional Context
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Error Information (for failed actions)
  error: {
    message: String,
    stack: String,
    code: String
  },
  
  // Success/Failure
  success: {
    type: Boolean,
    required: true
  },
  
  // Timing
  duration: {
    type: Number, // milliseconds
    default: null
  },
  
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Indexes for fast querying
auditLogSchema.index({ user: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });
auditLogSchema.index({ success: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userEmail: 1, timestamp: -1 });

// Static method to get logs with filters
auditLogSchema.statics.getFilteredLogs = async function(filters = {}, options = {}) {
  const {
    userId,
    action,
    resourceType,
    success,
    startDate,
    endDate,
    ipAddress,
    search
  } = filters;
  
  const {
    page = 1,
    limit = 50,
    sortBy = 'timestamp',
    sortOrder = 'desc'
  } = options;
  
  const query = {};
  
  if (userId) query.user = userId;
  if (action) query.action = action;
  if (resourceType) query.resourceType = resourceType;
  if (success !== undefined) query.success = success;
  if (ipAddress) query.ipAddress = ipAddress;
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  if (search) {
    query.$or = [
      { userEmail: { $regex: search, $options: 'i' } },
      { userName: { $regex: search, $options: 'i' } },
      { endpoint: { $regex: search, $options: 'i' } },
      { resourceName: { $regex: search, $options: 'i' } }
    ];
  }
  
  const skip = (page - 1) * limit;
  const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };
  
  const [logs, total] = await Promise.all([
    this.find(query)
      .populate('user', 'name email role')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
  ]);
  
  return {
    logs,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    }
  };
};

// Static method to get statistics
auditLogSchema.statics.getStats = async function(filters = {}) {
  const { startDate, endDate, userId } = filters;
  
  const matchStage = {};
  if (startDate || endDate) {
    matchStage.timestamp = {};
    if (startDate) matchStage.timestamp.$gte = new Date(startDate);
    if (endDate) matchStage.timestamp.$lte = new Date(endDate);
  }
  if (userId) matchStage.user = new mongoose.Types.ObjectId(userId);
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $facet: {
        totalActions: [{ $count: 'count' }],
        successRate: [
          {
            $group: {
              _id: '$success',
              count: { $sum: 1 }
            }
          }
        ],
        byAction: [
          {
            $group: {
              _id: '$action',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ],
        byResourceType: [
          {
            $group: {
              _id: '$resourceType',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } }
        ],
        byUser: [
          {
            $group: {
              _id: '$user',
              count: { $sum: 1 },
              email: { $first: '$userEmail' },
              name: { $first: '$userName' }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ],
        failedLogins: [
          { $match: { action: 'auth.login.failed' } },
          {
            $group: {
              _id: '$ipAddress',
              count: { $sum: 1 },
              lastAttempt: { $max: '$timestamp' }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ],
        recentErrors: [
          { $match: { success: false } },
          { $sort: { timestamp: -1 } },
          { $limit: 20 }
        ]
      }
    }
  ]);
  
  const result = stats[0];
  const totalSuccess = result.successRate.find(s => s._id === true)?.count || 0;
  const totalFailed = result.successRate.find(s => s._id === false)?.count || 0;
  const total = totalSuccess + totalFailed;
  
  return {
    totalActions: result.totalActions[0]?.count || 0,
    successCount: totalSuccess,
    failedCount: totalFailed,
    successRate: total > 0 ? ((totalSuccess / total) * 100).toFixed(2) : 0,
    topActions: result.byAction,
    byResourceType: result.byResourceType,
    topUsers: result.byUser,
    failedLoginAttempts: result.failedLogins,
    recentErrors: result.recentErrors
  };
};

// TTL Index - automatically delete logs older than 90 days (optional)
// Uncomment if you want auto-deletion
// auditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

module.exports = mongoose.model('AuditLog', auditLogSchema);