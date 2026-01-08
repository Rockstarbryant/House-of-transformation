// server/controllers/auditController.js
const auditService = require('../services/auditService');
const asyncHandler = require('../middleware/asyncHandler');

/**
 * @desc    Get audit logs with filters
 * @route   GET /api/audit/logs
 * @access  Private/Admin
 */
exports.getLogs = asyncHandler(async (req, res) => {
  const {
    userId,
    action,
    resourceType,
    success,
    startDate,
    endDate,
    ipAddress,
    search,
    page,
    limit,
    sortBy,
    sortOrder
  } = req.query;

  const filters = {
    userId,
    action,
    resourceType,
    success: success === 'true' ? true : success === 'false' ? false : undefined,
    startDate,
    endDate,
    ipAddress,
    search
  };

  const options = {
    page: parseInt(page) || 1,
    limit: parseInt(limit) || 50,
    sortBy: sortBy || 'timestamp',
    sortOrder: sortOrder || 'desc'
  };

  const result = await auditService.getLogs(filters, options);

  res.json({
    success: true,
    ...result
  });
});

/**
 * @desc    Get audit statistics
 * @route   GET /api/audit/stats
 * @access  Private/Admin
 */
exports.getStats = asyncHandler(async (req, res) => {
  const { startDate, endDate, userId } = req.query;

  const stats = await auditService.getStats({
    startDate,
    endDate,
    userId
  });

  res.json({
    success: true,
    stats
  });
});

/**
 * @desc    Get user activity
 * @route   GET /api/audit/user/:userId
 * @access  Private/Admin
 */
exports.getUserActivity = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { limit } = req.query;

  const activity = await auditService.getUserActivity(
    userId,
    parseInt(limit) || 50
  );

  res.json({
    success: true,
    count: activity.length,
    activity
  });
});

/**
 * @desc    Export audit logs to CSV
 * @route   GET /api/audit/export
 * @access  Private/Admin
 */
exports.exportLogs = asyncHandler(async (req, res) => {
  const {
    userId,
    action,
    resourceType,
    success,
    startDate,
    endDate,
    ipAddress
  } = req.query;

  const filters = {
    userId,
    action,
    resourceType,
    success: success === 'true' ? true : success === 'false' ? false : undefined,
    startDate,
    endDate,
    ipAddress
  };

  const csv = await auditService.exportToCSV(filters);

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
  res.send(csv);
});

/**
 * @desc    Get security alerts (failed logins, access denied)
 * @route   GET /api/audit/security-alerts
 * @access  Private/Admin
 */
exports.getSecurityAlerts = asyncHandler(async (req, res) => {
  const { hours = 24 } = req.query;
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  const AuditLog = require('../models/AuditLog');

  const [failedLogins, accessDenied, errors] = await Promise.all([
    // Failed login attempts
    AuditLog.aggregate([
      {
        $match: {
          action: 'auth.login.failed',
          timestamp: { $gte: since }
        }
      },
      {
        $group: {
          _id: '$ipAddress',
          count: { $sum: 1 },
          emails: { $addToSet: '$userEmail' },
          lastAttempt: { $max: '$timestamp' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]),

    // Access denied attempts
    AuditLog.aggregate([
      {
        $match: {
          action: 'system.access.denied',
          timestamp: { $gte: since }
        }
      },
      {
        $group: {
          _id: {
            user: '$user',
            endpoint: '$endpoint'
          },
          count: { $sum: 1 },
          email: { $first: '$userEmail' },
          lastAttempt: { $max: '$timestamp' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]),

    // System errors
    AuditLog.find({
      action: 'system.error',
      timestamp: { $gte: since }
    })
      .sort({ timestamp: -1 })
      .limit(20)
      .lean()
  ]);

  res.json({
    success: true,
    alerts: {
      failedLogins: {
        count: failedLogins.length,
        details: failedLogins
      },
      accessDenied: {
        count: accessDenied.length,
        details: accessDenied
      },
      errors: {
        count: errors.length,
        details: errors
      }
    }
  });
});

/**
 * @desc    Get recent activity (last 100 actions)
 * @route   GET /api/audit/recent
 * @access  Private/Admin
 */
exports.getRecentActivity = asyncHandler(async (req, res) => {
  const { limit = 100 } = req.query;

  const AuditLog = require('../models/AuditLog');

  const recent = await AuditLog.find()
    .populate('user', 'name email role')
    .sort({ timestamp: -1 })
    .limit(parseInt(limit))
    .lean();

  res.json({
    success: true,
    count: recent.length,
    logs: recent
  });
});

/**
 * @desc    Get action timeline for resource
 * @route   GET /api/audit/timeline/:resourceType/:resourceId
 * @access  Private/Admin
 */
exports.getResourceTimeline = asyncHandler(async (req, res) => {
  const { resourceType, resourceId } = req.params;

  const AuditLog = require('../models/AuditLog');

  const timeline = await AuditLog.find({
    resourceType,
    resourceId
  })
    .populate('user', 'name email role')
    .sort({ timestamp: 1 }) // Chronological order
    .lean();

  res.json({
    success: true,
    count: timeline.length,
    timeline
  });
});

/**
 * @desc    Clean old audit logs
 * @route   DELETE /api/audit/clean
 * @access  Private/Admin
 */
exports.cleanOldLogs = asyncHandler(async (req, res) => {
  const { days = 90 } = req.query;

  const deletedCount = await auditService.cleanOldLogs(parseInt(days));

  res.json({
    success: true,
    message: `Deleted ${deletedCount} logs older than ${days} days`,
    deletedCount
  });
});

/**
 * @desc    Get audit log by ID
 * @route   GET /api/audit/:id
 * @access  Private/Admin
 */
exports.getLogById = asyncHandler(async (req, res) => {
  const AuditLog = require('../models/AuditLog');

  const log = await AuditLog.findById(req.params.id)
    .populate('user', 'name email role')
    .lean();

  if (!log) {
    return res.status(404).json({
      success: false,
      message: 'Audit log not found'
    });
  }

  res.json({
    success: true,
    log
  });
});