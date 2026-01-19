// server/routes/emailNotificationRoutes.js
const express = require('express');
const {
  // User Management
  getUsers,
  getRoles,
  getUsersByRole,
  
  // Email Sending
  sendSingleEmail,
  sendBulkEmails,
  sendToAllUsers,
  sendByRole,
  
  // Email History
  getEmailHistory,
  getEmailLogDetails,
  getEmailStatistics,
  
  // Templates
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  
  // Drafts
  saveDraft,
  getDrafts,
  deleteDraft,
  
  // Inbox (Received Emails)
  getInbox,
  createReceivedEmail,
  updateReceivedEmail,
  deleteReceivedEmail
} = require('../controllers/emailNotificationController');

const { protect } = require('../middleware/supabaseAuth');
const { requireAdmin } = require('../middleware/requirePermission');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

console.log('[EMAIL-NOTIFICATION-ROUTES] Initializing email notification routes...');

// All routes require admin access
router.use(protect);
router.use(requireAdmin);

// ============================================
// USER MANAGEMENT ROUTES
// ============================================
router.get('/users', getUsers);
router.get('/roles', getRoles);
router.get('/users/role/:roleId', getUsersByRole);

// ============================================
// EMAIL SENDING ROUTES
// ============================================
router.post('/send-single', sendSingleEmail);
router.post('/send-bulk', sendBulkEmails);
router.post('/send-all', sendToAllUsers);
router.post('/send-by-role', sendByRole);

// ============================================
// EMAIL HISTORY ROUTES
// ============================================
router.get('/history', getEmailHistory);
router.get('/history/:id', getEmailLogDetails);
router.get('/statistics', getEmailStatistics);

// ============================================
// TEMPLATE ROUTES
// ============================================
router.get('/templates', getTemplates);
router.post('/templates', createTemplate);
router.put('/templates/:id', updateTemplate);
router.delete('/templates/:id', deleteTemplate);

// ============================================
// DRAFT ROUTES
// ============================================
router.post('/drafts', saveDraft);
router.get('/drafts', getDrafts);
router.delete('/drafts/:id', deleteDraft);

// ============================================
// INBOX ROUTES (RECEIVED EMAILS)
// ============================================
router.get('/inbox', getInbox);
router.post('/inbox', createReceivedEmail);
router.patch('/inbox/:id', updateReceivedEmail);
router.delete('/inbox/:id', deleteReceivedEmail);

console.log('[EMAIL-NOTIFICATION-ROUTES] Routes registered successfully');

module.exports = router;