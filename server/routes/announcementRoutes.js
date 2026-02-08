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
// SSE STREAM - Manual CORS handling
// ============================================

// ✅ Handle OPTIONS preflight for /stream
router.options('/stream', (req, res) => {
  const origin = req.headers.origin;
  
  console.log('[SSE-OPTIONS] Preflight request from:', origin);
  
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cache-Control');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  res.status(204).end();
});

// ✅ SSE GET endpoint
router.get('/stream', protectSSE, streamAnnouncements);

// ============================================
// SPECIFIC ROUTES (MUST COME BEFORE /:id)
// ============================================

// Get unread count
router.get('/count/unread', protect, getUnreadCount);

// Get statistics
router.get('/stats/overview', protect, requirePermission('manage:announcements'), getStatistics);

// Mark all as read
router.post('/read/all', protect, markAllAsRead);

// Clear all
router.post('/clear/all', protect, clearAllNotifications);

// ============================================
// GENERAL ROUTES
// ============================================

// Get all announcements
router.get('/', protect, getAllAnnouncements);

// Create announcement
router.post('/', protect, requirePermission('manage:announcements'), createAnnouncement);

// ============================================
// DYNAMIC ID ROUTES (MUST BE LAST)
// ============================================

// Get single announcement
router.get('/:id', protect, getAnnouncementById);

// Mark announcement as read
router.post('/:id/read', protect, markAsRead);

// Update announcement
router.patch('/:id', protect, requirePermission('manage:announcements'), updateAnnouncement);

// Delete announcement
router.delete('/:id', protect, requirePermission('manage:announcements'), deleteAnnouncement);

console.log('[ANNOUNCEMENT-ROUTES] Routes registered successfully');

module.exports = router;