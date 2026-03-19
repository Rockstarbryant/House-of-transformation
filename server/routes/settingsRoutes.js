// server/routes/settingsRoutes.js — FULL UPDATED VERSION
const express = require('express');
const {
  getSettings,
  getPublicSettings,
  updateGeneralSettings,
  updateEmailSettings,
  updateNotificationSettings,
  updateSecuritySettings,
  updatePaymentMethods,
  updatePaymentSettings,
  updateSocialMedia,
  updateMaintenanceMode,
  updateApiKeys,
  updateFeatures,
  resetSettings,
  // M-Pesa & Donation
  getMpesaSettings,
  updateMpesaSettings,
  testMpesaConnection,
  simulateMpesaStkPush,
  getDonationSettings,
  updateDonationSettings,
  updatePaymentGateway,
  // ── NEW ──
  getChurchInfo,
  updateChurchInfo,
  updateLeadership,
  updateServiceTimes,
} = require('../controllers/settingsController');

const { protect }      = require('../middleware/supabaseAuth');
const { requireAdmin } = require('../middleware/requirePermission');

const router = express.Router();

// ─── PUBLIC — no auth ─────────────────────────────────────────────────────────
router.get('/public',             getPublicSettings);
router.get('/donations/public',   getDonationSettings);

// ─── MEMBER — any authenticated user ──────────────────────────────────────────
// Returns church identity, social media, service times, visible leadership.
// Intentionally NOT requireAdmin so all portal members can read this.
router.get('/church-info',        protect, getChurchInfo);

// ─── ADMIN ONLY ───────────────────────────────────────────────────────────────
router.get('/',                   protect, requireAdmin, getSettings);

// General / identity
router.patch('/general',          protect, requireAdmin, updateGeneralSettings);
router.patch('/church-info',      protect, requireAdmin, updateChurchInfo);

// Leadership directory
router.patch('/leadership',       protect, requireAdmin, updateLeadership);

// Service times
router.patch('/service-times',    protect, requireAdmin, updateServiceTimes);

// Email / notifications / security
router.patch('/email',            protect, requireAdmin, updateEmailSettings);
router.patch('/notifications',    protect, requireAdmin, updateNotificationSettings);
router.patch('/security',         protect, requireAdmin, updateSecuritySettings);

// Social / maintenance / api-keys / features
router.patch('/social',           protect, requireAdmin, updateSocialMedia);
router.patch('/maintenance',      protect, requireAdmin, updateMaintenanceMode);
router.patch('/api-keys',         protect, requireAdmin, updateApiKeys);
router.patch('/features',         protect, requireAdmin, updateFeatures);

// Payment & M-Pesa
router.get('/mpesa',              protect, requireAdmin, getMpesaSettings);
router.patch('/mpesa',            protect, requireAdmin, updateMpesaSettings);
router.post('/mpesa/test',        protect, requireAdmin, testMpesaConnection);
router.post('/mpesa/simulate',    protect, requireAdmin, simulateMpesaStkPush);
router.patch('/payment',          protect, requireAdmin, updatePaymentGateway);
router.patch('/payment-methods', protect, requireAdmin, updatePaymentMethods);

// Donations
router.get('/donations',          protect, requireAdmin, getDonationSettings);
router.patch('/donations',        protect, requireAdmin, updateDonationSettings);

// Reset
router.post('/reset',             protect, requireAdmin, resetSettings);

module.exports = router;