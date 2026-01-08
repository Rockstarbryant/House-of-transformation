// server/services/auditService.js
const AuditLog = require('../models/AuditLog');

class AuditService {
  /**
   * Log an audit event
   * @param {Object} data - Audit log data
   */
  async log(data) {
    try {
      const auditLog = await AuditLog.create({
        user: data.userId || null,
        userEmail: data.userEmail || null,
        userName: data.userName || null,
        userRole: data.userRole || null,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId || null,
        resourceName: data.resourceName || null,
        method: data.method,
        endpoint: data.endpoint,
        statusCode: data.statusCode,
        changes: data.changes || null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent || null,
        metadata: data.metadata || {},
        error: data.error || null,
        success: data.success,
        duration: data.duration || null,
        timestamp: new Date()
      });
      
      return auditLog;
    } catch (error) {
      // Don't throw - just log to console to prevent audit failures from breaking app
      console.error('❌ Audit logging failed:', error);
      return null;
    }
  }

  /**
   * Log authentication event
   */
  async logAuth(type, req, user = null, success = true, error = null) {
    const actions = {
      login: success ? 'auth.login.success' : 'auth.login.failed',
      signup: success ? 'auth.signup.success' : 'auth.signup.failed',
      logout: 'auth.logout',
      refresh: 'auth.token.refresh',
      passwordReset: 'auth.password.reset.request',
      passwordResetSuccess: 'auth.password.reset.success',
      emailVerify: 'auth.email.verify'
    };

    return this.log({
      userId: user?._id || user?.id,
      userEmail: user?.email || req.body?.email,
      userName: user?.name,
      userRole: user?.role,
      action: actions[type],
      resourceType: 'user',
      resourceId: user?._id || user?.id,
      method: req.method,
      endpoint: req.originalUrl || req.url,
      statusCode: success ? 200 : 401,
      ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
      userAgent: req.get('user-agent'),
      success,
      error: error ? { message: error.message, code: error.code } : null
    });
  }

  /**
   * Log CRUD operation
   */
  async logCrud(action, resourceType, req, resource = null, changes = null) {
    const user = req.user;
    
    return this.log({
      userId: user?._id || user?.id,
      userEmail: user?.email,
      userName: user?.name,
      userRole: user?.role,
      action: `${resourceType}.${action}`,
      resourceType,
      resourceId: resource?._id || resource?.id || req.params?.id,
      resourceName: resource?.title || resource?.name || resource?.fullName,
      method: req.method,
      endpoint: req.originalUrl || req.url,
      statusCode: 200,
      changes,
      ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
      userAgent: req.get('user-agent'),
      metadata: {
        body: this.sanitizeBody(req.body),
        params: req.params,
        query: req.query
      },
      success: true
    });
  }

  /**
   * Log access denied
   */
  async logAccessDenied(req, reason = 'Insufficient permissions') {
    const user = req.user;
    
    return this.log({
      userId: user?._id || user?.id,
      userEmail: user?.email,
      userName: user?.name,
      userRole: user?.role,
      action: 'system.access.denied',
      resourceType: 'system',
      method: req.method,
      endpoint: req.originalUrl || req.url,
      statusCode: 403,
      ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
      userAgent: req.get('user-agent'),
      metadata: { reason },
      success: false
    });
  }

  /**
   * Log system error
   */
  async logError(req, error) {
    const user = req.user;
    
    return this.log({
      userId: user?._id || user?.id,
      userEmail: user?.email,
      userName: user?.name,
      userRole: user?.role,
      action: 'system.error',
      resourceType: 'system',
      method: req.method,
      endpoint: req.originalUrl || req.url,
      statusCode: error.statusCode || 500,
      ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
      userAgent: req.get('user-agent'),
      error: {
        message: error.message,
        stack: error.stack,
        code: error.code
      },
      success: false
    });
  }

  /**
   * Log rate limit hit
   */
  async logRateLimit(req) {
    const user = req.user;
    
    return this.log({
      userId: user?._id || user?.id,
      userEmail: user?.email,
      userName: user?.name,
      userRole: user?.role,
      action: 'system.rate.limit',
      resourceType: 'system',
      method: req.method,
      endpoint: req.originalUrl || req.url,
      statusCode: 429,
      ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
      userAgent: req.get('user-agent'),
      success: false
    });
  }

  /**
   * Sanitize request body (remove sensitive data)
   */
  sanitizeBody(body) {
    if (!body) return null;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'confirmPassword', 'token', 'apiKey', 'secret'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  /**
   * Get filtered logs
   */
  async getLogs(filters, options) {
    return AuditLog.getFilteredLogs(filters, options);
  }

  /**
   * Get statistics
   */
  async getStats(filters) {
    return AuditLog.getStats(filters);
  }

  /**
   * Get user activity
   */
  async getUserActivity(userId, limit = 50) {
    return AuditLog.find({ user: userId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  }

  /**
   * Get failed login attempts for IP
   */
  async getFailedLoginAttempts(ipAddress, hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    return AuditLog.countDocuments({
      action: 'auth.login.failed',
      ipAddress,
      timestamp: { $gte: since }
    });
  }

  /**
   * Export logs to CSV
   */
  async exportToCSV(filters = {}) {
    const { logs } = await this.getLogs(filters, { limit: 10000 });
    
    const headers = [
      'Timestamp',
      'User',
      'Email',
      'Role',
      'Action',
      'Resource Type',
      'Resource ID',
      'Method',
      'Endpoint',
      'Status',
      'IP Address',
      'Success'
    ];
    
    const rows = logs.map(log => [
      log.timestamp,
      log.userName || 'N/A',
      log.userEmail || 'N/A',
      log.userRole || 'N/A',
      log.action,
      log.resourceType,
      log.resourceId || 'N/A',
      log.method,
      log.endpoint,
      log.statusCode,
      log.ipAddress,
      log.success ? 'Yes' : 'No'
    ]);
    
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    return csv;
  }

  /**
   * Clean old logs (older than specified days)
   */
  async cleanOldLogs(days = 90) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const result = await AuditLog.deleteMany({
      timestamp: { $lt: cutoffDate }
    });
    
    return result.deletedCount;
  }
}

module.exports = new AuditService();