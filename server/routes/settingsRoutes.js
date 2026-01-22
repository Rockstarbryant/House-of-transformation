// server/routes/settingsRoutes.js - UPDATED VERSION
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
  resetSettings,
  // NEW M-Pesa & Donation methods
  getMpesaSettings,
  updateMpesaSettings,
  testMpesaConnection,
  getDonationSettings,
  updateDonationSettings,
  updatePaymentGateway
} = require('../controllers/settingsController');

const { protect } = require('../middleware/supabaseAuth');
const { requireAdmin } = require('../middleware/requirePermission');

const router = express.Router();

console.log('[SETTINGS-ROUTES] Initializing settings routes...');

// ============================================
// PUBLIC ROUTES - NO AUTH REQUIRED
// ============================================

// Get public settings (safe to expose)
router.get('/public', getPublicSettings);

// Get donation settings (public - for frontend)
router.get('/donations/public', getDonationSettings);

// ============================================
// PROTECTED ADMIN ROUTES - AUTH REQUIRED
// ============================================

// Get all settings (admin only)
router.get('/', protect, requireAdmin, getSettings);

// ============================================
// GENERAL SETTINGS
// ============================================

router.patch('/general', protect, requireAdmin, updateGeneralSettings);
router.patch('/email', protect, requireAdmin, updateEmailSettings);
router.patch('/notifications', protect, requireAdmin, updateNotificationSettings);
router.patch('/security', protect, requireAdmin, updateSecuritySettings);
router.patch('/social', protect, requireAdmin, updateSocialMedia);
router.patch('/maintenance', protect, requireAdmin, updateMaintenanceMode);
router.patch('/api-keys', protect, requireAdmin, updateApiKeys);
router.patch('/features', protect, requireAdmin, updateFeatures);

// ============================================
// PAYMENT & M-PESA SETTINGS
// ============================================

// M-Pesa settings (admin only)
router.get('/mpesa', protect, requireAdmin, getMpesaSettings);
router.patch('/mpesa', protect, requireAdmin, updateMpesaSettings);
router.post('/mpesa/test', protect, requireAdmin, testMpesaConnection);

// Payment gateway settings (admin only)
router.patch('/payment-gateway', protect, requireAdmin, updatePaymentGateway);

// Donation settings (admin only)
router.get('/donations', protect, requireAdmin, getDonationSettings);
router.patch('/donations', protect, requireAdmin, updateDonationSettings);

// ============================================
// UTILITY ROUTES
// ============================================

// Reset settings to default (admin only)
router.post('/reset', protect, requireAdmin, resetSettings);

console.log('[SETTINGS-ROUTES] Routes registered successfully');

module.exports = router;