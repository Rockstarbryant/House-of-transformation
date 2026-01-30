// server/routes/transactionAuditRoutes.js
const express = require('express');
const router = express.Router();
const {
  getAllAuditLogs,
  getAuditLog,
  getAuditLogsByTransaction,
  getAuditLogsByUser,
  exportAuditLogs,
  getAuditStats
} = require('../controllers/transactionAuditController');

const { protect } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');

// ============================================
// PROTECTED ROUTES - Require Authentication
// ============================================

// GET all audit logs (admin/finance team only)
router.get(
  '/',
  protect,
  requirePermission('view:donation:reports', 'manage:donations'),
  getAllAuditLogs
);

// GET statistics
router.get(
  '/stats',
  protect,
  requirePermission('view:donation:reports', 'manage:donations'),
  getAuditStats
);

// Export audit logs (CSV)
router.get(
  '/export',
  protect,
  requirePermission('view:donation:reports', 'manage:donations'),
  exportAuditLogs
);

// GET logs by transaction ID
router.get(
  '/transaction/:transactionId',
  protect,
  requirePermission('view:donation:reports', 'manage:donations'),
  getAuditLogsByTransaction
);

// GET logs by user ID
router.get(
  '/user/:userId',
  protect,
  requirePermission('view:donation:reports', 'manage:donations'),
  getAuditLogsByUser
);

// GET single audit log
router.get(
  '/:id',
  protect,
  requirePermission('view:donation:reports', 'manage:donations'),
  getAuditLog
);

module.exports = router;