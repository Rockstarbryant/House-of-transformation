// server/routes/settingsRoutes.js
const express = require('express');
const {
  getSettings,
  getPublicSettings,
  updateGeneralSettings,
  updateEmailSettings,
  updateNotificationSettings,
  updateSecuritySettings,
  updatePaymentSettings,
  updateSocialMedia,
  updateMaintenanceMode,
  updateApiKeys,
  updateFeatures,
  resetSettings
} = require('../controllers/settingsController');

const { protect } = require('../middleware/supabaseAuth');
const { requireAdmin, requirePermission } = require('../middleware/requirePermission');

const router = express.Router();

console.log('[SETTINGS-ROUTES] Initializing settings routes...');

// ============================================
// PUBLIC ROUTES
// ============================================

// Get public settings (safe to expose)
router.get('/public', getPublicSettings);

// ============================================
// PROTECTED ADMIN ROUTES
// ============================================

// Get all settings (admin only)
router.get('/', protect, requireAdmin, getSettings);

// Update settings by category (admin only)
router.patch('/general', protect, requireAdmin, updateGeneralSettings);
router.patch('/email', protect, requireAdmin, updateEmailSettings);
router.patch('/notifications', protect, requireAdmin, updateNotificationSettings);
router.patch('/security', protect, requireAdmin, updateSecuritySettings);
router.patch('/payment', protect, requireAdmin, updatePaymentSettings);
router.patch('/social', protect, requireAdmin, updateSocialMedia);
router.patch('/maintenance', protect, requireAdmin, updateMaintenanceMode);
router.patch('/api-keys', protect, requireAdmin, updateApiKeys);
router.patch('/features', protect, requireAdmin, updateFeatures);

// Reset settings to default (admin only)
router.post('/reset', protect, requireAdmin, resetSettings);

console.log('[SETTINGS-ROUTES] Routes registered successfully');

module.exports = router;