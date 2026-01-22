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


// server/controllers/settingsController.js - ADD THESE METHODS

// ============================================
// M-PESA SETTINGS MANAGEMENT
// ============================================

// @desc    Get M-Pesa settings (admin only)
// @route   GET /api/settings/mpesa
// @access  Private/Admin
exports.getMpesaSettings = asyncHandler(async (req, res) => {
  try {
    console.log('[SETTINGS-MPESA-GET] Fetching M-Pesa settings');

    const settings = await Settings.getSettings();

    // Don't expose secrets in response
    const mpesaSettings = {
      enabled: settings.paymentSettings.mpesa.enabled,
      environment: settings.paymentSettings.mpesa.environment,
      shortcode: settings.paymentSettings.mpesa.shortcode,
      callbackUrl: settings.paymentSettings.mpesa.callbackUrl,
      timeout: settings.paymentSettings.mpesa.timeout
    };

    res.json({
      success: true,
      mpesa: mpesaSettings
    });

  } catch (error) {
    console.error('[SETTINGS-MPESA-GET] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch M-Pesa settings',
      error: error.message
    });
  }
});

// @desc    Update M-Pesa settings (admin only)
// @route   PATCH /api/settings/mpesa
// @access  Private/Admin
exports.updateMpesaSettings = asyncHandler(async (req, res) => {
  try {
    const { consumerKey, consumerSecret, shortcode, passkey, environment, callbackUrl, timeout, enabled } = req.body;

    console.log('[SETTINGS-MPESA-UPDATE] Updating M-Pesa settings');

    // Validate required fields
    if (!consumerKey && !consumerSecret && !shortcode && !passkey) {
      return res.status(400).json({
        success: false,
        message: 'At least one M-Pesa credential must be provided'
      });
    }

    // Validate environment
    if (environment && !['sandbox', 'production'].includes(environment)) {
      return res.status(400).json({
        success: false,
        message: 'Environment must be "sandbox" or "production"'
      });
    }

    const settings = await Settings.getSettings();

    // Update only provided fields
    if (consumerKey !== undefined) settings.paymentSettings.mpesa.consumerKey = consumerKey;
    if (consumerSecret !== undefined) settings.paymentSettings.mpesa.consumerSecret = consumerSecret;
    if (shortcode !== undefined) settings.paymentSettings.mpesa.shortcode = shortcode;
    if (passkey !== undefined) settings.paymentSettings.mpesa.passkey = passkey;
    if (environment !== undefined) settings.paymentSettings.mpesa.environment = environment;
    if (callbackUrl !== undefined) settings.paymentSettings.mpesa.callbackUrl = callbackUrl;
    if (timeout !== undefined) settings.paymentSettings.mpesa.timeout = timeout;
    if (enabled !== undefined) settings.paymentSettings.mpesa.enabled = enabled;

    settings.lastUpdatedBy = req.user._id;
    await settings.save();

    console.log('[SETTINGS-MPESA-UPDATE] M-Pesa settings updated');

    res.json({
      success: true,
      message: 'M-Pesa settings updated successfully',
      mpesa: {
        enabled: settings.paymentSettings.mpesa.enabled,
        environment: settings.paymentSettings.mpesa.environment,
        shortcode: settings.paymentSettings.mpesa.shortcode
      }
    });

  } catch (error) {
    console.error('[SETTINGS-MPESA-UPDATE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update M-Pesa settings',
      error: error.message
    });
  }
});

// @desc    Test M-Pesa connection
// @route   POST /api/settings/mpesa/test
// @access  Private/Admin
exports.testMpesaConnection = asyncHandler(async (req, res) => {
  try {
    console.log('[SETTINGS-MPESA-TEST] Testing M-Pesa connection');

    const settings = await Settings.getSettings();
    const mpesa = settings.paymentSettings.mpesa;

    // Basic validation
    if (!mpesa.enabled) {
      return res.status(400).json({
        success: false,
        message: 'M-Pesa is not enabled'
      });
    }

    if (!mpesa.consumerKey || !mpesa.consumerSecret || !mpesa.shortcode || !mpesa.passkey) {
      return res.status(400).json({
        success: false,
        message: 'M-Pesa credentials are incomplete',
        missing: {
          consumerKey: !mpesa.consumerKey,
          consumerSecret: !mpesa.consumerSecret,
          shortcode: !mpesa.shortcode,
          passkey: !mpesa.passkey
        }
      });
    }

    // Mock test - in production, call actual M-Pesa OAuth endpoint
    console.log('[SETTINGS-MPESA-TEST] Configuration valid');

    res.json({
      success: true,
      message: 'M-Pesa configuration is valid',
      environment: mpesa.environment,
      shortcode: mpesa.shortcode,
      status: 'configured'
    });

  } catch (error) {
    console.error('[SETTINGS-MPESA-TEST] Error:', error);
    res.status(500).json({
      success: false,
      message: 'M-Pesa connection test failed',
      error: error.message
    });
  }
});

// ============================================
// DONATION SETTINGS MANAGEMENT
// ============================================

// @desc    Get donation settings
// @route   GET /api/settings/donations
// @access  Public/Admin
exports.getDonationSettings = asyncHandler(async (req, res) => {
  try {
    console.log('[SETTINGS-DONATIONS-GET] Fetching donation settings');

    const settings = await Settings.getSettings();

    res.json({
      success: true,
      donations: settings.donationSettings,
      paymentGateway: settings.paymentSettings.paymentGateway,
      minimumDonation: settings.paymentSettings.minimumDonation,
      currency: settings.paymentSettings.currency
    });

  } catch (error) {
    console.error('[SETTINGS-DONATIONS-GET] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donation settings',
      error: error.message
    });
  }
});

// @desc    Update donation settings (admin only)
// @route   PATCH /api/settings/donations
// @access  Private/Admin
exports.updateDonationSettings = asyncHandler(async (req, res) => {
  try {
    const updates = req.body;

    console.log('[SETTINGS-DONATIONS-UPDATE] Updating donation settings');

    const settings = await Settings.getSettings();

    // Update donation settings
    Object.keys(updates).forEach(key => {
      if (settings.donationSettings[key] !== undefined) {
        settings.donationSettings[key] = updates[key];
      }
    });

    settings.lastUpdatedBy = req.user._id;
    await settings.save();

    console.log('[SETTINGS-DONATIONS-UPDATE] Donation settings updated');

    res.json({
      success: true,
      message: 'Donation settings updated successfully',
      donations: settings.donationSettings
    });

  } catch (error) {
    console.error('[SETTINGS-DONATIONS-UPDATE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update donation settings',
      error: error.message
    });
  }
});

// @desc    Update payment gateway settings (admin only)
// @route   PATCH /api/settings/payment-gateway
// @access  Private/Admin
exports.updatePaymentGateway = asyncHandler(async (req, res) => {
  try {
    const { gateway, minimumDonation, currency } = req.body;

    console.log('[SETTINGS-PAYMENT-GATEWAY] Updating payment gateway settings');

    // Validate gateway
    if (gateway && !['mpesa', 'stripe', 'paypal', 'flutterwave'].includes(gateway)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment gateway. Must be one of: mpesa, stripe, paypal, flutterwave'
      });
    }

    const settings = await Settings.getSettings();

    if (gateway) settings.paymentSettings.paymentGateway = gateway;
    if (minimumDonation !== undefined) settings.paymentSettings.minimumDonation = minimumDonation;
    if (currency) settings.paymentSettings.currency = currency;

    settings.lastUpdatedBy = req.user._id;
    await settings.save();

    console.log('[SETTINGS-PAYMENT-GATEWAY] Payment gateway updated');

    res.json({
      success: true,
      message: 'Payment gateway settings updated successfully',
      gateway: settings.paymentSettings.paymentGateway,
      minimumDonation: settings.paymentSettings.minimumDonation,
      currency: settings.paymentSettings.currency
    });

  } catch (error) {
    console.error('[SETTINGS-PAYMENT-GATEWAY] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment gateway settings',
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