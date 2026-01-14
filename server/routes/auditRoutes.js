// server/routes/auditRoutes.js
const express = require('express');
const {
  getLogs,
  getStats,
  getUserActivity,
  exportLogs,
  getSecurityAlerts,
  getRecentActivity,
  getResourceTimeline,
  cleanOldLogs,
  getLogById
} = require('../controllers/auditController');
const { protect, authorize } = require('../middleware/supabaseAuth');

const router = express.Router();

// All routes require admin authentication
router.use(protect);
router.use(authorize('admin'));

// ===== MAIN ROUTES =====
// Get filtered audit logs
router.get('/logs', getLogs);

// Get audit statistics
router.get('/stats', getStats);

// Get recent activity
router.get('/recent', getRecentActivity);

// Export logs to CSV
router.get('/export', exportLogs);

// Get security alerts
router.get('/security-alerts', getSecurityAlerts);

// Get specific audit log by ID
router.get('/:id', getLogById);

// ===== USER-SPECIFIC ROUTES =====
// Get activity for specific user
router.get('/user/:userId', getUserActivity);

// ===== RESOURCE-SPECIFIC ROUTES =====
// Get timeline for specific resource
router.get('/timeline/:resourceType/:resourceId', getResourceTimeline);

// ===== MAINTENANCE ROUTES =====
// Clean old logs (be careful with this!)
router.delete('/clean', cleanOldLogs);

module.exports = router;