// server/routes/emailTestRoutes.js
const express = require('express');
const emailService = require('../services/emailService');
const { protect } = require('../middleware/supabaseAuth');
const { requireAdmin } = require('../middleware/requirePermission');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

console.log('[EMAIL-TEST-ROUTES] Initializing email test routes...');

// ===== TEST EMAIL CONNECTION =====
// GET /api/email/test-connection
// Admin only - tests SMTP connection
router.get('/test-connection', protect, requireAdmin, asyncHandler(async (req, res) => {
  try {
    console.log('[EMAIL-TEST] Testing connection...');
    
    const result = await emailService.testConnection();
    
    res.json({
      success: result.success,
      message: result.message || result.error,
      details: result
    });

  } catch (error) {
    console.error('[EMAIL-TEST] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Test failed',
      error: error.message
    });
  }
}));

// ===== SEND TEST EMAIL =====
// POST /api/email/send-test
// Admin only - sends test email to specified address
router.post('/send-test', protect, requireAdmin, asyncHandler(async (req, res) => {
  try {
    const { recipientEmail } = req.body;

    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        message: 'recipientEmail is required'
      });
    }

    console.log('[EMAIL-TEST] Sending test email to:', recipientEmail);

    const result = await emailService.sendEmail({
      to: recipientEmail,
      subject: 'Test Email from House of Transformation',
      text: 'This is a test email. If you received this, email settings are working correctly!',
      html: `
        <h2>Test Email</h2>
        <p>This is a test email from House of Transformation.</p>
        <p>If you received this, your email settings are configured correctly! ✅</p>
        <p>Sent at: ${new Date().toLocaleString()}</p>
      `
    });

    res.json({
      success: result.success,
      message: result.success 
        ? `Test email sent to ${recipientEmail}`
        : `Failed to send email: ${result.error}`,
      details: result
    });

  } catch (error) {
    console.error('[EMAIL-TEST] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
}));

console.log('[EMAIL-TEST-ROUTES] Routes registered successfully');

module.exports = router;