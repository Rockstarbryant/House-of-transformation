// server/controllers/transactionAuditController.js
const TransactionAuditLog = require('../models/TransactionAuditLog');
const asyncHandler = require('../middleware/asyncHandler');

// ✅ SECURITY HELPER
const hasAuditPermission = (user) => {
  if (!user || !user.role) return false;
  if (user.role.name === 'admin') return true;
  return user.role.permissions && (
    user.role.permissions.includes('view:audit:logs') ||
    user.role.permissions.includes('manage:donations')
  );
};

// ============================================
// GET ALL AUDIT LOGS (Admin/Finance Team)
// ============================================
exports.getAllAuditLogs = asyncHandler(async (req, res) => {
  try {

    // ✅ CRITICAL: Permission check
if (!hasAuditPermission(req.user)) {
  return res.status(403).json({
    success: false,
    message: 'Access denied: Insufficient permissions',
    requiredPermissions: ['view:audit:logs', 'manage:donations'],
    userPermissions: req.user?.role?.permissions || [],
    userRole: req.user?.role?.name || 'none'
  });
}

    const { 
      page = 1, 
      limit = 50, 
      transactionType, 
      status, 
      userId,
      startDate,
      endDate,
      searchTerm
    } = req.query;

    console.log('[AUDIT-LOGS] Fetching audit logs');

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 50;
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query = {};

    if (transactionType) {
      query.transactionType = transactionType;
    }

    if (status) {
      query.status = status;
    }

    if (userId) {
      query.userId = userId;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Search in transaction ID or action
    if (searchTerm) {
      query.$or = [
        { transactionId: { $regex: searchTerm, $options: 'i' } },
        { action: { $regex: searchTerm, $options: 'i' } },
        { mpesaReceiptNumber: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    // Get total count
    const total = await TransactionAuditLog.countDocuments(query);

    // Get paginated logs
    const logs = await TransactionAuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const pages = Math.ceil(total / limitNum);

    console.log('[AUDIT-LOGS] Fetched', logs.length, 'logs');

    res.json({
      success: true,
      logs,
      pagination: {
        total,
        pages,
        currentPage: pageNum,
        limit: limitNum
      }
    });

  } catch (error) {
    console.error('[AUDIT-LOGS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message
    });
  }
});

// ============================================
// GET SINGLE AUDIT LOG
// ============================================
exports.getAuditLog = asyncHandler(async (req, res) => {
  try {

    // ✅ CRITICAL: Permission check
if (!hasAuditPermission(req.user)) {
  return res.status(403).json({
    success: false,
    message: 'Access denied: Insufficient permissions',
    requiredPermissions: ['view:audit:logs', 'manage:donations'],
    userPermissions: req.user?.role?.permissions || [],
    userRole: req.user?.role?.name || 'none'
  });
}

    const { id } = req.params;

    console.log('[AUDIT-LOG] Fetching log:', id);

    const log = await TransactionAuditLog.findById(id).lean();

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

  } catch (error) {
    console.error('[AUDIT-LOG] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit log',
      error: error.message
    });
  }
});

// ============================================
// GET AUDIT LOGS BY TRANSACTION ID
// ============================================
exports.getAuditLogsByTransaction = asyncHandler(async (req, res) => {
  try {

    // ✅ CRITICAL: Permission check
if (!hasAuditPermission(req.user)) {
  return res.status(403).json({
    success: false,
    message: 'Access denied: Insufficient permissions',
    requiredPermissions: ['view:audit:logs', 'manage:donations'],
    userPermissions: req.user?.role?.permissions || [],
    userRole: req.user?.role?.name || 'none'
  });
}

    const { transactionId } = req.params;

    console.log('[AUDIT-LOGS] Fetching logs for transaction:', transactionId);

    const logs = await TransactionAuditLog.find({ transactionId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      logs,
      count: logs.length
    });

  } catch (error) {
    console.error('[AUDIT-LOGS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message
    });
  }
});

// ============================================
// GET AUDIT LOGS BY USER
// ============================================
exports.getAuditLogsByUser = asyncHandler(async (req, res) => {
  try {

    // ✅ CRITICAL: Permission check
if (!hasAuditPermission(req.user)) {
  return res.status(403).json({
    success: false,
    message: 'Access denied: Insufficient permissions',
    requiredPermissions: ['view:audit:logs', 'manage:donations'],
    userPermissions: req.user?.role?.permissions || [],
    userRole: req.user?.role?.name || 'none'
  });
}

    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    console.log('[AUDIT-LOGS] Fetching logs for user:', userId);

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const skip = (pageNum - 1) * limitNum;

    const total = await TransactionAuditLog.countDocuments({ userId });

    const logs = await TransactionAuditLog.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const pages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      logs,
      pagination: {
        total,
        pages,
        currentPage: pageNum,
        limit: limitNum
      }
    });

  } catch (error) {
    console.error('[AUDIT-LOGS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs',
      error: error.message
    });
  }
});

// ============================================
// EXPORT AUDIT LOGS (CSV)
// ============================================
exports.exportAuditLogs = asyncHandler(async (req, res) => {
  try {

    // ✅ CRITICAL: Permission check
if (!hasAuditPermission(req.user)) {
  return res.status(403).json({
    success: false,
    message: 'Access denied: Insufficient permissions',
    requiredPermissions: ['view:audit:logs', 'manage:donations'],
    userPermissions: req.user?.role?.permissions || [],
    userRole: req.user?.role?.name || 'none'
  });
}
    const { 
      transactionType, 
      status, 
      startDate,
      endDate
    } = req.query;

    console.log('[AUDIT-LOGS] Exporting logs');

    // Build query (same as getAll)
    const query = {};
    if (transactionType) query.transactionType = transactionType;
    if (status) query.status = status;
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    // Get all logs (no pagination for export)
    const logs = await TransactionAuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(10000) // Safety limit
      .lean();

    // Convert to CSV
    const csvHeaders = [
      'ID',
      'Transaction ID',
      'Type',
      'User ID',
      'Action',
      'Status',
      'Amount',
      'Payment Method',
      'M-Pesa Receipt',
      'Error',
      'Created At'
    ].join(',');

    const csvRows = logs.map(log => [
      log._id,
      log.transactionId || '',
      log.transactionType || '',
      log.userId || '',
      log.action || '',
      log.status || '',
      log.amount || '',
      log.paymentMethod || '',
      log.mpesaReceiptNumber || '',
      log.error ? `"${log.error.replace(/"/g, '""')}"` : '',
      new Date(log.createdAt).toISOString()
    ].join(','));

    const csv = [csvHeaders, ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${Date.now()}.csv`);
    res.send(csv);

  } catch (error) {
    console.error('[AUDIT-LOGS] Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export audit logs',
      error: error.message
    });
  }
});

// ============================================
// GET AUDIT LOG STATISTICS
// ============================================
exports.getAuditStats = asyncHandler(async (req, res) => {
  try {

    // ✅ CRITICAL: Permission check
if (!hasAuditPermission(req.user)) {
  return res.status(403).json({
    success: false,
    message: 'Access denied: Insufficient permissions',
    requiredPermissions: ['view:audit:logs', 'manage:donations'],
    userPermissions: req.user?.role?.permissions || [],
    userRole: req.user?.role?.name || 'none'
  });
}

    console.log('[AUDIT-STATS] Fetching statistics');

    const stats = await TransactionAuditLog.aggregate([
      {
        $facet: {
          byType: [
            { $group: { _id: '$transactionType', count: { $sum: 1 } } }
          ],
          byStatus: [
            { $group: { _id: '$status', count: { $sum: 1 } } }
          ],
          byAction: [
            { $group: { _id: '$action', count: { $sum: 1 } } }
          ],
          total: [
            { $count: 'count' }
          ],
          recentErrors: [
            { $match: { status: 'failed' } },
            { $sort: { createdAt: -1 } },
            { $limit: 10 }
          ]
        }
      }
    ]);

    res.json({
      success: true,
      stats: {
        byType: stats[0].byType,
        byStatus: stats[0].byStatus,
        byAction: stats[0].byAction,
        total: stats[0].total[0]?.count || 0,
        recentErrors: stats[0].recentErrors
      }
    });

  } catch (error) {
    console.error('[AUDIT-STATS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});