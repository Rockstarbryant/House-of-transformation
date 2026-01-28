const express = require('express');
const {
  getAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  clearAllNotifications,
  getStatistics,
  streamAnnouncements
} = require('../controllers/announcementController');

const { protect } = require('../middleware/supabaseAuth');
const { protectSSE } = require('../middleware/sseAuth');
const { requirePermission } = require('../middleware/requirePermission');

const router = express.Router();

console.log('[ANNOUNCEMENT-ROUTES] Initializing announcement routes...');

// ============================================
// SSE STREAM (Protected - All authenticated users)
// Uses special SSE auth that accepts token from query param
// ============================================
router.get('/stream', protectSSE, streamAnnouncements);

// ============================================
// PUBLIC/AUTHENTICATED USER ROUTES
// ============================================

// Get all announcements (with filters) - All authenticated users
router.get('/', protect, getAllAnnouncements);

// Get single announcement - All authenticated users
router.get('/:id', protect, getAnnouncementById);

// Mark announcement as read - All authenticated users
router.post('/:id/read', protect, markAsRead);

// Mark all announcements as read - All authenticated users
router.post('/read/all', protect, markAllAsRead);

// Get unread count - All authenticated users
router.get('/count/unread', protect, getUnreadCount);

// Clear all notifications - All authenticated users
router.post('/clear/all', protect, clearAllNotifications);

// ============================================
// PROTECTED ROUTES (Require manage:announcements permission)
// ============================================

// Create announcement - Requires permission
router.post(
  '/',
  protect,
  requirePermission('manage:announcements'),
  createAnnouncement
);

// Update announcement - Requires permission
router.patch(
  '/:id',
  protect,
  requirePermission('manage:announcements'),
  updateAnnouncement
);

// Delete announcement - Requires permission
router.delete(
  '/:id',
  protect,
  requirePermission('manage:announcements'),
  deleteAnnouncement
);

// Get statistics - Requires permission
router.get(
  '/stats/overview',
  protect,
  requirePermission('manage:announcements'),
  getStatistics
);

console.log('[ANNOUNCEMENT-ROUTES] Routes registered successfully');

module.exports = router;