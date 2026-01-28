// server/middleware/idempotencyMiddleware.js
const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');

const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY
);

/**
 * Idempotency middleware - prevents duplicate API requests
 * 
 * Usage:
 * router.post('/payments/mpesa/initiate', protect, idempotencyMiddleware, initiateMpesaPayment);
 */
exports.idempotencyMiddleware = async (req, res, next) => {
  try {
    // Idempotency key from request headers
    const idempotencyKey = req.get('idempotency-key');
    
    // If no key provided, generate one from user + endpoint + body hash
    if (!idempotencyKey) {
      return res.status(400).json({
        success: false,
        message: 'Idempotency-Key header is required for payment operations',
        help: 'Include header: Idempotency-Key: <UUID>'
      });
    }

    // Validate key format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(idempotencyKey)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid idempotency-key format. Must be UUID (e.g., 550e8400-e29b-41d4-a716-446655440000)'
      });
    }

    // Store key in request for later use
    req.idempotencyKey = idempotencyKey;
    req.userId = req.user._id;

    // Check if this request was already processed
    const { data: existingRequest, error: fetchError } = await supabase
      .from('idempotency_keys')
      .select('*')
      .eq('idempotency_key', idempotencyKey)
      .eq('user_id', req.user._id.toString())
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = not found (expected)
      console.error('[IDEMPOTENCY] Error checking key:', fetchError);
      return res.status(500).json({
        success: false,
        message: 'Failed to validate request'
      });
    }

    if (existingRequest) {
      // Request already processed - return cached response
      console.log('[IDEMPOTENCY] Duplicate request detected for key:', idempotencyKey);
      
      // If original request failed, allow retry
      if (existingRequest.response_status >= 400) {
        console.log('[IDEMPOTENCY] Original request failed, allowing retry');
        return next();
      }

      // Success response - return cached
      return res.status(existingRequest.response_status).json(
        JSON.parse(existingRequest.response_body)
      );
    }

    // Store original send function
    const originalSend = res.send;
    let responseBody = null;

    // Override send to capture response
    res.send = function(data) {
      responseBody = data;
      
      // Save idempotency key with response (async, don't block)
      if (res.statusCode < 500) {
        supabase
          .from('idempotency_keys')
          .insert([{
            idempotency_key: idempotencyKey,
            user_id: req.user._id.toString(),
            endpoint: req.path,
            method: req.method,
            response_status: res.statusCode,
            response_body: JSON.stringify(data),
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
          }])
          .catch(err => console.error('[IDEMPOTENCY] Failed to store response:', err));
      }

      // Call original send
      return originalSend.call(this, data);
    };

    next();

  } catch (error) {
    console.error('[IDEMPOTENCY] Middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

/**
 * Clean up old idempotency keys (run via cron job)
 */
exports.cleanupExpiredKeys = async () => {
  try {
    const { error } = await supabase
      .from('idempotency_keys')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('[IDEMPOTENCY-CLEANUP] Error:', error);
    } else {
      console.log('[IDEMPOTENCY-CLEANUP] Old keys removed');
    }
  } catch (error) {
    console.error('[IDEMPOTENCY-CLEANUP] Unexpected error:', error);
  }
};