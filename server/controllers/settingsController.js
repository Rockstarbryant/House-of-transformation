// server/controllers/settingsController.js
const Settings = require('../models/Settings');
const asyncHandler = require('../middleware/asyncHandler');

// ============================================
// GET SETTINGS
// ============================================

// @desc    Get all settings
// @route   GET /api/settings
// @access  Private/Admin
exports.getSettings = asyncHandler(async (req, res) => {
  try {
    console.log('[SETTINGS-GET] Fetching settings');

    const settings = await Settings.getSettings();

    res.json({
      success: true,
      settings
    });

  } catch (error) {
    console.error('[SETTINGS-GET] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch settings',
      error: error.message
    });
  }
});

// @desc    Get public settings (safe to expose)
// @route   GET /api/settings/public
// @access  Public
exports.getPublicSettings = asyncHandler(async (req, res) => {
  try {
    console.log('[SETTINGS-PUBLIC] Fetching public settings');

    const settings = await Settings.getSettings();

    // Only return safe, public-facing settings
    const publicSettings = {
      siteName: settings.siteName,
      siteTagline: settings.siteTagline,
      siteDescription: settings.siteDescription,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      contactAddress: settings.contactAddress,
      socialMedia: settings.socialMedia,
      features: settings.features,
      maintenanceMode: {
        enabled: settings.maintenanceMode.enabled,
        message: settings.maintenanceMode.message,
        estimatedTime: settings.maintenanceMode.estimatedTime
      },
      livestreamSettings: {
        platform: settings.livestreamSettings.platform,
        youtubeChannelId: settings.livestreamSettings.youtubeChannelId,
        enableChat: settings.livestreamSettings.enableChat
      }
    };

    res.json({
      success: true,
      settings: publicSettings
    });

  } catch (error) {
    console.error('[SETTINGS-PUBLIC] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch public settings',
      error: error.message
    });
  }
});

// ============================================
// UPDATE SETTINGS
// ============================================

// @desc    Update general settings
// @route   PATCH /api/settings/general
// @access  Private/Admin
exports.updateGeneralSettings = asyncHandler(async (req, res) => {
  try {
    const { siteName, siteTagline, siteDescription, contactEmail, contactPhone, contactAddress } = req.body;

    console.log('[SETTINGS-UPDATE-GENERAL] Updating general settings');

    const settings = await Settings.getSettings();

    if (siteName !== undefined) settings.siteName = siteName;
    if (siteTagline !== undefined) settings.siteTagline = siteTagline;
    if (siteDescription !== undefined) settings.siteDescription = siteDescription;
    if (contactEmail !== undefined) settings.contactEmail = contactEmail;
    if (contactPhone !== undefined) settings.contactPhone = contactPhone;
    if (contactAddress !== undefined) settings.contactAddress = contactAddress;

    settings.lastUpdatedBy = req.user.id;
    await settings.save();

    console.log('[SETTINGS-UPDATE-GENERAL] General settings updated');

    res.json({
      success: true,
      message: 'General settings updated successfully',
      settings
    });

  } catch (error) {
    console.error('[SETTINGS-UPDATE-GENERAL] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update general settings',
      error: error.message
    });
  }
});

// @desc    Update email settings
// @route   PATCH /api/settings/email
// @access  Private/Admin
exports.updateEmailSettings = asyncHandler(async (req, res) => {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPassword, fromEmail, fromName } = req.body;

    console.log('[SETTINGS-UPDATE-EMAIL] Updating email settings');

    const settings = await Settings.getSettings();

    if (smtpHost !== undefined) settings.emailSettings.smtpHost = smtpHost;
    if (smtpPort !== undefined) settings.emailSettings.smtpPort = smtpPort;
    if (smtpUser !== undefined) settings.emailSettings.smtpUser = smtpUser;
    if (smtpPassword !== undefined) settings.emailSettings.smtpPassword = smtpPassword;
    if (fromEmail !== undefined) settings.emailSettings.fromEmail = fromEmail;
    if (fromName !== undefined) settings.emailSettings.fromName = fromName;

    settings.lastUpdatedBy = req.user.id;
    await settings.save();

    console.log('[SETTINGS-UPDATE-EMAIL] Email settings updated');

    res.json({
      success: true,
      message: 'Email settings updated successfully',
      settings
    });

  } catch (error) {
    console.error('[SETTINGS-UPDATE-EMAIL] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update email settings',
      error: error.message
    });
  }
});

// @desc    Update notification settings
// @route   PATCH /api/settings/notifications
// @access  Private/Admin
exports.updateNotificationSettings = asyncHandler(async (req, res) => {
  try {
    const updates = req.body;

    console.log('[SETTINGS-UPDATE-NOTIFICATIONS] Updating notification settings');

    const settings = await Settings.getSettings();

    Object.keys(updates).forEach(key => {
      if (settings.notificationSettings[key] !== undefined) {
        settings.notificationSettings[key] = updates[key];
      }
    });

    settings.lastUpdatedBy = req.user.id;
    await settings.save();

    console.log('[SETTINGS-UPDATE-NOTIFICATIONS] Notification settings updated');

    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      settings
    });

  } catch (error) {
    console.error('[SETTINGS-UPDATE-NOTIFICATIONS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification settings',
      error: error.message
    });
  }
});

// @desc    Update security settings
// @route   PATCH /api/settings/security
// @access  Private/Admin
exports.updateSecuritySettings = asyncHandler(async (req, res) => {
  try {
    const updates = req.body;

    console.log('[SETTINGS-UPDATE-SECURITY] Updating security settings');

    const settings = await Settings.getSettings();

    Object.keys(updates).forEach(key => {
      if (settings.securitySettings[key] !== undefined) {
        settings.securitySettings[key] = updates[key];
      }
    });

    settings.lastUpdatedBy = req.user.id;
    await settings.save();

    console.log('[SETTINGS-UPDATE-SECURITY] Security settings updated');

    res.json({
      success: true,
      message: 'Security settings updated successfully',
      settings
    });

  } catch (error) {
    console.error('[SETTINGS-UPDATE-SECURITY] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update security settings',
      error: error.message
    });
  }
});

// @desc    Update payment settings
// @route   PATCH /api/settings/payment
// @access  Private/Admin
exports.updatePaymentSettings = asyncHandler(async (req, res) => {
  try {
    const updates = req.body;

    console.log('[SETTINGS-UPDATE-PAYMENT] Updating payment settings');

    const settings = await Settings.getSettings();

    Object.keys(updates).forEach(key => {
      if (settings.paymentSettings[key] !== undefined) {
        settings.paymentSettings[key] = updates[key];
      }
    });

    settings.lastUpdatedBy = req.user.id;
    await settings.save();

    console.log('[SETTINGS-UPDATE-PAYMENT] Payment settings updated');

    res.json({
      success: true,
      message: 'Payment settings updated successfully',
      settings
    });

  } catch (error) {
    console.error('[SETTINGS-UPDATE-PAYMENT] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment settings',
      error: error.message
    });
  }
});

// @desc    Update social media links
// @route   PATCH /api/settings/social
// @access  Private/Admin
exports.updateSocialMedia = asyncHandler(async (req, res) => {
  try {
    const updates = req.body;

    console.log('[SETTINGS-UPDATE-SOCIAL] Updating social media links');

    const settings = await Settings.getSettings();

    Object.keys(updates).forEach(key => {
      if (settings.socialMedia[key] !== undefined) {
        settings.socialMedia[key] = updates[key];
      }
    });

    settings.lastUpdatedBy = req.user.id;
    await settings.save();

    console.log('[SETTINGS-UPDATE-SOCIAL] Social media links updated');

    res.json({
      success: true,
      message: 'Social media links updated successfully',
      settings
    });

  } catch (error) {
    console.error('[SETTINGS-UPDATE-SOCIAL] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update social media links',
      error: error.message
    });
  }
});

// @desc    Update maintenance mode
// @route   PATCH /api/settings/maintenance
// @access  Private/Admin
exports.updateMaintenanceMode = asyncHandler(async (req, res) => {
  try {
    const { enabled, message, allowedIPs, estimatedTime } = req.body;

    console.log('[SETTINGS-UPDATE-MAINTENANCE] Updating maintenance mode');

    const settings = await Settings.getSettings();

    if (enabled !== undefined) settings.maintenanceMode.enabled = enabled;
    if (message !== undefined) settings.maintenanceMode.message = message;
    if (allowedIPs !== undefined) settings.maintenanceMode.allowedIPs = allowedIPs;
    if (estimatedTime !== undefined) settings.maintenanceMode.estimatedTime = estimatedTime;

    settings.lastUpdatedBy = req.user.id;
    await settings.save();

    console.log('[SETTINGS-UPDATE-MAINTENANCE] Maintenance mode updated');

    res.json({
      success: true,
      message: 'Maintenance mode updated successfully',
      settings
    });

  } catch (error) {
    console.error('[SETTINGS-UPDATE-MAINTENANCE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update maintenance mode',
      error: error.message
    });
  }
});

// @desc    Update API keys
// @route   PATCH /api/settings/api-keys
// @access  Private/Admin
exports.updateApiKeys = asyncHandler(async (req, res) => {
  try {
    const updates = req.body;

    console.log('[SETTINGS-UPDATE-APIKEYS] Updating API keys');

    const settings = await Settings.getSettings();

    Object.keys(updates).forEach(key => {
      if (settings.apiKeys[key] !== undefined) {
        settings.apiKeys[key] = updates[key];
      }
    });

    settings.lastUpdatedBy = req.user.id;
    await settings.save();

    console.log('[SETTINGS-UPDATE-APIKEYS] API keys updated');

    res.json({
      success: true,
      message: 'API keys updated successfully',
      settings
    });

  } catch (error) {
    console.error('[SETTINGS-UPDATE-APIKEYS] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update API keys',
      error: error.message
    });
  }
});

// @desc    Update feature flags
// @route   PATCH /api/settings/features
// @access  Private/Admin
exports.updateFeatures = asyncHandler(async (req, res) => {
  try {
    const updates = req.body;

    console.log('[SETTINGS-UPDATE-FEATURES] Updating feature flags');

    const settings = await Settings.getSettings();

    Object.keys(updates).forEach(key => {
      if (settings.features[key] !== undefined) {
        settings.features[key] = updates[key];
      }
    });

    settings.lastUpdatedBy = req.user.id;
    await settings.save();

    console.log('[SETTINGS-UPDATE-FEATURES] Feature flags updated');

    res.json({
      success: true,
      message: 'Feature flags updated successfully',
      settings
    });

  } catch (error) {
    console.error('[SETTINGS-UPDATE-FEATURES] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update feature flags',
      error: error.message
    });
  }
});

// @desc    Reset settings to default
// @route   POST /api/settings/reset
// @access  Private/Admin
exports.resetSettings = asyncHandler(async (req, res) => {
  try {
    console.log('[SETTINGS-RESET] Resetting all settings to default');

    // Delete existing settings
    await Settings.deleteMany({});

    // Create new default settings
    const settings = await Settings.create({
      lastUpdatedBy: req.user.id
    });

    console.log('[SETTINGS-RESET] Settings reset to default');

    res.json({
      success: true,
      message: 'Settings reset to default successfully',
      settings
    });

  } catch (error) {
    console.error('[SETTINGS-RESET] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reset settings',
      error: error.message
    });
  }
});