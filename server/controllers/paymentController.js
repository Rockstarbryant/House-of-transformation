// server/controllers/paymentController.js - FIXED VERSION
const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');
const asyncHandler = require('../middleware/asyncHandler');
const Campaign = require('../models/Campaign');
const Settings = require('../models/Settings');
const TransactionAuditLog = require('../models/TransactionAuditLog');
const MpesaVerificationService = require('../services/mpesaVerificationService');

// Initialize Supabase client
const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY
);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if payment already processed (by idempotency key)
 */
async function isPaymentAlreadyProcessed(idempotencyKey, userId) {
  try {
    const { data: existing, error } = await supabase
      .from('payments')
      .select('id, status')
      .eq('idempotency_key', idempotencyKey)
      .eq('user_id', userId)
      .single();

    // ✅ FIXED: Check error code instead of using .catch()
    if (error && error.code !== 'PGRST116') {
      console.error('[PAYMENT-IDEMPOTENCY] Error:', error);
    }

    return error ? null : existing;
  } catch (error) {
    return null;
  }
}  

/**
 * Log financial transaction to audit trail
 */
async function logAuditTransaction(data) {
  try {
    await TransactionAuditLog.logTransaction(data);
  } catch (error) {
    console.error('[PAYMENT-AUDIT] Failed to log:', error);
  }
}

// ============================================
// INITIATE M-PESA PAYMENT
// ============================================
exports.initiateMpesaPayment = asyncHandler(async (req, res) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { pledgeId, amount, phoneNumber } = req.body;
    const idempotencyKey = req.idempotencyKey;
    const userId = req.user._id.toString();

    console.log('[PAYMENT-MPESA-INITIATE] Request ID:', requestId);
    console.log('[PAYMENT-MPESA-INITIATE] User:', userId);
    console.log('[PAYMENT-MPESA-INITIATE] Pledge:', pledgeId);

    // ✅ IDEMPOTENCY CHECK
    const existingPayment = await isPaymentAlreadyProcessed(idempotencyKey, userId);
    if (existingPayment) {
      console.log('[PAYMENT-MPESA-INITIATE] Duplicate request detected:', idempotencyKey);
      
      if (existingPayment.status === 'pending' || existingPayment.status === 'success') {
        return res.json({
          success: true,
          message: 'Payment already initiated',
          isDuplicate: true,
          paymentId: existingPayment.id,
          status: existingPayment.status
        });
      }
    }

    // VALIDATE INPUTS
    if (!pledgeId || !amount || !phoneNumber) {
      await logAuditTransaction({
        transactionType: 'payment_initiated',
        userId,
        action: 'validate_inputs_failed',
        status: 'failed',
        statusReason: 'Missing required fields',
        error: 'pledgeId, amount, phoneNumber required'
      });

      return res.status(400).json({
        success: false,
        message: 'Pledge ID, amount, and phone number are required'
      });
    }

    // Validate phone format (Kenya)
    const phoneRegex = /^254\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number. Must be in format: 254XXXXXXXXX'
      });
    }

    if (amount <= 0 || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }

    // Get pledge from Supabase
    const { data: pledge, error: pledgeError } = await supabase
      .from('pledges')
      .select('*')
      .eq('id', pledgeId)
      .single();

    if (pledgeError) {
      await logAuditTransaction({
        transactionType: 'payment_initiated',
        userId,
        pledgeId,
        action: 'pledge_not_found',
        status: 'failed'
      });
      return res.status(404).json({ success: false, message: 'Pledge not found' });
    }

    // ✅ AUTHORIZATION CHECK
    if (pledge.user_id !== userId && req.user?.role?.name !== 'admin') {
      console.error('[PAYMENT-MPESA-INITIATE] Authorization failed:', {
        pledgeOwner: pledge.user_id,
        requestUser: userId
      });

      await logAuditTransaction({
        transactionType: 'payment_initiated',
        userId,
        pledgeId,
        action: 'authorization_failed',
        status: 'failed',
        error: 'User attempted to pay another user\'s pledge'
      });

      return res.status(403).json({
        success: false,
        message: 'You can only pay your own pledges'
      });
    }

    // Validate amount doesn't exceed remaining
    if (amount > pledge.remaining_amount) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount exceeds remaining balance',
        remaining: pledge.remaining_amount
      });
    }

    // GET M-PESA SETTINGS
    const settings = await Settings.getSettings();
    const mpesa = settings.paymentSettings.mpesa;

    if (!mpesa.enabled) {
      return res.status(400).json({
        success: false,
        message: 'M-Pesa payments are not enabled'
      });
    }

    if (!mpesa.consumerKey || !mpesa.consumerSecret || !mpesa.shortcode || !mpesa.passkey) {
      return res.status(400).json({
        success: false,
        message: 'M-Pesa is not properly configured'
      });
    }

    // CREATE PAYMENT RECORD (status: pending)
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        pledge_id: pledgeId,
        campaign_id: pledge.campaign_id,
        user_id: userId,
        amount: amount,
        payment_method: 'mpesa',
        mpesa_phone_number: phoneNumber,
        status: 'pending',
        idempotency_key: idempotencyKey,
        request_id: requestId
      }])
      .select()
      .single();

    if (paymentError) {
      console.error('[PAYMENT-MPESA-INITIATE] Payment creation failed:', paymentError);
      
      if (paymentError.code === '23505') {
        return res.status(400).json({
          success: false,
          message: 'Duplicate payment request',
          error: 'This exact request was already processed'
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to create payment record',
        error: paymentError.message
      });
    }

    console.log('[PAYMENT-MPESA-INITIATE] Payment record created:', payment.id);

    // CALL M-PESA API
    const MpesaService = require('../services/mpesaService');
    const mpesaService = new MpesaService(mpesa);

    try {
      console.log('[PAYMENT-MPESA-INITIATE] Calling M-Pesa API...');
      const mpesaResult = await mpesaService.initiateSTKPush(
        phoneNumber,
        amount,
        `PLEDGE_${payment.id}`,
        mpesa.transactionDesc
      );

      console.log('[PAYMENT-MPESA-INITIATE] STK Push sent successfully');

      // Update payment with M-Pesa checkout request ID
      await supabase
        .from('payments')
        .update({
          mpesa_transaction_id: mpesaResult.checkoutRequestId
        })
        .eq('id', payment.id);

      // Log audit trail
      await logAuditTransaction({
        transactionId: payment.id,
        transactionType: 'payment_initiated',
        userId,
        pledgeId,
        paymentId: payment.id,
        amount,
        paymentMethod: 'mpesa',
        mpesaCheckoutRequestId: mpesaResult.checkoutRequestId,
        mpesaPhoneNumber: phoneNumber,
        status: 'pending',
        idempotencyKey,
        requestId,
        action: 'mpesa_stk_push_sent',
        details: {
          checkoutRequestId: mpesaResult.checkoutRequestId,
          responseCode: mpesaResult.responseCode
        }
      });

      res.json({
        success: true,
        message: 'M-Pesa payment initiated. Check your phone for prompt.',
        payment: {
          id: payment.id,
          amount: payment.amount,
          status: payment.status,
          phoneNumber: phoneNumber,
          checkoutRequestId: mpesaResult.checkoutRequestId,
          createdAt: payment.created_at
        }
      });

    } catch (mpesaError) {
      console.error('[PAYMENT-MPESA-INITIATE] M-Pesa API error:', mpesaError.message);

      // Update payment status to failed using the correct object-based error handling
  const { error: updateError } = await supabase
    .from('payments')
    .update({
      status: 'failed',
      failure_reason: mpesaError.message
    })
    .eq('id', payment.id);

  if (updateError) {
    console.error('[PAYMENT-MPESA-INITIATE] Critical: Could not update failed status', updateError);
  }

      
      await logAuditTransaction({
        transactionId: payment.id,
        transactionType: 'payment_initiated',
        userId,
        pledgeId,
        paymentId: payment.id,
        amount,
        paymentMethod: 'mpesa',
        status: 'failed',
        error: mpesaError.message,
        action: 'mpesa_api_call_failed'
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to initiate M-Pesa STK push',
        error: mpesaError.message
      });
    }

  } catch (error) {
    console.error('[PAYMENT-MPESA-INITIATE] Error:', error);

    await logAuditTransaction({
      transactionType: 'payment_initiated',
      userId: req.user._id,
      action: 'unexpected_error',
      status: 'failed',
      error: error.message,
      stackTrace: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      error: error.message
    });
  }
});

// ============================================
// M-PESA CALLBACK HANDLER
// ============================================
exports.mpesaCallback = asyncHandler(async (req, res) => {
  const callbackId = `callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { Body } = req.body;
    
    console.log('[PAYMENT-MPESA-CALLBACK] Received callback, ID:', callbackId);

    if (!Body || !Body.stkCallback) {
      console.error('[PAYMENT-MPESA-CALLBACK] Invalid callback format');
      await logAuditTransaction({
        transactionType: 'payment_success',
        action: 'callback_invalid_format',
        status: 'failed',
        error: 'Missing stkCallback in body'
      });
      return res.json({ success: false });
    }

    const result = Body.stkCallback;
    const checkoutRequestId = result.CheckoutRequestID;
    const resultCode = result.ResultCode;

    console.log('[PAYMENT-MPESA-CALLBACK] Checkout Request ID:', checkoutRequestId);
    console.log('[PAYMENT-MPESA-CALLBACK] Result Code:', resultCode);

    if (!checkoutRequestId || resultCode === undefined) {
      console.error('[PAYMENT-MPESA-CALLBACK] Missing critical fields');
      return res.json({ success: false });
    }

    // ✅ FIXED: Check for existing callback without .catch()
  /*  let existingLog = null;
    try {
      const { data, error } = await supabase
        .from('callback_logs')
        .select('id, processing_status')
        .eq('checkout_request_id', checkoutRequestId)
        .eq('processing_status', 'completed')
        .single();

      if (!error) {
        existingLog = data;
      }
    } catch (err) {
      existingLog = null;
    }  */

      //
const { data: existingLog, error: logError } = await supabase
  .from('callback_logs')
  .select('id, processing_status')
  .eq('checkout_request_id', checkoutRequestId)
  .eq('processing_status', 'completed')
  .single();

// If error code is PGRST116, it just means "not found", which is fine.
if (logError && logError.code !== 'PGRST116') {
    console.error('[PAYMENT-MPESA-CALLBACK] DB Error:', logError);
}

if (existingLog) {
  return res.json({ success: true, isDuplicate: true });
}

    if (existingLog) {
      console.log('[PAYMENT-MPESA-CALLBACK] Duplicate callback detected, returning cached response');
      return res.json({ 
        success: true, 
        isDuplicate: true,
        message: 'Callback already processed'
      });
    }

    // Log callback received
    const { data: callbackLog } = await supabase
      .from('callback_logs')
      .insert([{
        checkout_request_id: checkoutRequestId,
        result_code: resultCode.toString(),
        raw_body: JSON.stringify(Body),
        processing_status: 'processing',
        callback_id: callbackId
      }])
      .select('id')
      .single();

    if (resultCode === 0) {
      console.log('[PAYMENT-MPESA-CALLBACK] Payment successful');

      const callbackMetadata = result.CallbackMetadata?.Item || [];
      const mpesaReceiptNumber = callbackMetadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
      const transactionDate = callbackMetadata.find(item => item.Name === 'TransactionDate')?.Value;
      const phoneNumber = callbackMetadata.find(item => item.Name === 'PhoneNumber')?.Value;
      const mpesaAmount = parseFloat(callbackMetadata.find(item => item.Name === 'Amount')?.Value || 0);

      console.log('[PAYMENT-MPESA-CALLBACK] Receipt:', mpesaReceiptNumber);
      console.log('[PAYMENT-MPESA-CALLBACK] Amount from M-Pesa:', mpesaAmount);

      // Get payment by checkout request ID
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('mpesa_transaction_id', checkoutRequestId)
        .single();

      if (paymentError) {
        console.error('[PAYMENT-MPESA-CALLBACK] Payment not found for checkout:', checkoutRequestId);
        
        await supabase
          .from('callback_logs')
          .update({ processing_status: 'failed', error: 'Payment record not found' })
          .eq('id', callbackLog.id);

        return res.json({ 
          success: false,
          error: 'Payment record not found'
        });
      }

      // Validate amount
      const variance = 1;
      const difference = Math.abs(payment.amount - mpesaAmount);
      
      if (difference > variance) {
        console.error('[PAYMENT-MPESA-CALLBACK] Amount mismatch!', {
          expected: payment.amount,
          received: mpesaAmount
        });

        await supabase
          .from('callback_logs')
          .update({ 
            processing_status: 'failed', 
            error: `Amount mismatch: expected ${payment.amount}, got ${mpesaAmount}`
          })
          .eq('id', callbackLog.id);

        return res.json({ 
          success: false,
          error: 'Payment amount mismatch'
        });
      }

      // ✅ FIXED: Check for duplicate receipt without .catch()
      if (mpesaReceiptNumber) {
        let duplicateReceipt = null;
        try {
          const { data, error } = await supabase
            .from('payments')
            .select('id, status')
            .eq('mpesa_receipt_number', mpesaReceiptNumber)
            .neq('id', payment.id)
            .single();

          if (!error) {
            duplicateReceipt = data;
          }
        } catch (err) {
          duplicateReceipt = null;
        }

        if (duplicateReceipt) {
          console.error('[PAYMENT-MPESA-CALLBACK] Duplicate receipt number detected!', mpesaReceiptNumber);

          await supabase
            .from('callback_logs')
            .update({ 
              processing_status: 'failed', 
              error: 'Duplicate M-Pesa receipt number'
            })
            .eq('id', callbackLog.id);

          return res.json({
            success: false,
            error: 'Duplicate M-Pesa transaction'
          });
        }
      }

      // Update payment
      const { error: paymentUpdateError } = await supabase
        .from('payments')
        .update({
          status: 'success',
          mpesa_receipt_number: mpesaReceiptNumber,
          completed_at: new Date().toISOString(),
          processed_at: new Date().toISOString()
        })
        .eq('id', payment.id);

      if (paymentUpdateError) {
        console.error('[PAYMENT-MPESA-CALLBACK] Payment update failed:', paymentUpdateError);
        throw new Error(`Failed to update payment: ${paymentUpdateError.message}`);
      }

      console.log('[PAYMENT-MPESA-CALLBACK] Payment updated to success');

      // Wait for triggers to fire
      await new Promise(resolve => setTimeout(resolve, 100));

      // Mark callback as processed
      await supabase
        .from('callback_logs')
        .update({ 
          processing_status: 'completed',
          mpesa_receipt_number: mpesaReceiptNumber,
          processed_payment_id: payment.id
        })
        .eq('id', callbackLog.id);

      // Log audit trail
      await logAuditTransaction({
        transactionId: payment.id,
        transactionType: 'payment_success',
        userId: payment.user_id,
        paymentId: payment.id,
        pledgeId: payment.pledge_id,
        amount: payment.amount,
        paymentMethod: 'mpesa',
        mpesaCheckoutRequestId: checkoutRequestId,
        mpesaReceiptNumber,
        mpesaPhoneNumber: phoneNumber,
        status: 'success',
        requestId: callbackId,
        action: 'mpesa_payment_confirmed'
      });

      return res.json({ 
        success: true,
        message: 'Payment processed successfully'
      });

    } else {
      console.log('[PAYMENT-MPESA-CALLBACK] Payment failed, result code:', resultCode);

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('mpesa_transaction_id', checkoutRequestId)
        .single();

      if (!paymentError && payment) {
        await supabase
          .from('payments')
          .update({
            status: 'failed',
            failure_reason: result.ResultDesc || 'User cancelled or transaction failed'
          })
          .eq('id', payment.id);

        await logAuditTransaction({
          transactionId: payment.id,
          transactionType: 'payment_failed',
          userId: payment.user_id,
          paymentId: payment.id,
          status: 'failed',
          statusReason: result.ResultDesc,
          action: 'mpesa_payment_failed'
        });
      }

      await supabase
        .from('callback_logs')
        .update({ 
          processing_status: 'completed',
          error: result.ResultDesc || 'User cancelled or transaction failed'
        })
        .eq('id', callbackLog.id);

      return res.json({ 
        success: true,
        message: 'Payment cancellation recorded'
      });
    }

  } catch (error) {
    console.error('[PAYMENT-MPESA-CALLBACK] Unexpected error:', error);

    await logAuditTransaction({
      transactionType: 'payment_success',
      action: 'callback_unexpected_error',
      status: 'failed',
      error: error.message,
      stackTrace: error.stack
    });

    return res.json({ 
      success: false,
      error: 'Internal server error'
    });
  }
});

// ============================================
// RECORD MANUAL PAYMENT - ✅ FIXED
// ============================================
exports.recordManualPayment = asyncHandler(async (req, res) => {
  const requestId = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const { pledgeId, amount, paymentMethod, mpesaRef, notes } = req.body;
    const adminUserId = req.user._id.toString();

    console.log('[PAYMENT-MANUAL] Recording manual payment, request ID:', requestId);

    // VALIDATE INPUTS
    if (!pledgeId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Pledge ID, amount, and payment method are required'
      });
    }

    const validMethods = ['mpesa', 'bank_transfer', 'cash'];
    if (!validMethods.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment method. Must be one of: ${validMethods.join(', ')}`
      });
    }

    if (amount <= 0 || isNaN(amount)) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a positive number'
      });
    }

    // GET PLEDGE
    const { data: pledge, error: pledgeError } = await supabase
      .from('pledges')
      .select('*')
      .eq('id', pledgeId)
      .single();

    if (pledgeError) {
      return res.status(404).json({
        success: false,
        message: 'Pledge not found'
      });
    }

    if (amount > pledge.remaining_amount) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount exceeds remaining balance',
        remaining: pledge.remaining_amount
      });
    }

    // ✅ FIXED: M-Pesa verification without .catch()
    if (paymentMethod === 'mpesa') {
      if (!mpesaRef) {
        return res.status(400).json({
          success: false,
          message: 'M-Pesa reference required for M-Pesa payments'
        });
      }

      try {
        console.log('[PAYMENT-MANUAL] Verifying M-Pesa receipt:', mpesaRef);

        const Settings = require('../models/Settings');
        const settings = await Settings.getSettings();
        const mpesaService = new MpesaVerificationService(settings.paymentSettings.mpesa);

        const receiptVerification = await mpesaService.verifyReceiptNumber(mpesaRef);
        if (!receiptVerification.verified) {
          return res.status(400).json({
            success: false,
            message: 'Invalid M-Pesa receipt number',
            error: receiptVerification.reason
          });
        }

        // ✅ FIXED: Check for duplicate without .catch()
        let existingWithReceipt = null;
        try {
          const { data, error } = await supabase
            .from('payments')
            .select('id, amount, status')
            .eq('mpesa_receipt_number', mpesaRef)
            .single();

          if (!error) {
            existingWithReceipt = data;
          }
        } catch (err) {
          existingWithReceipt = null;
        }

        if (existingWithReceipt) {
          console.error('[PAYMENT-MANUAL] Duplicate M-Pesa receipt detected:', mpesaRef);
          return res.status(400).json({
            success: false,
            message: 'This M-Pesa receipt has already been recorded',
            details: {
              existingPaymentId: existingWithReceipt.id,
              existingAmount: existingWithReceipt.amount,
              status: existingWithReceipt.status
            }
          });
        }

      } catch (verificationError) {
        console.error('[PAYMENT-MANUAL] M-Pesa verification failed:', verificationError);
        return res.status(400).json({
          success: false,
          message: 'Failed to verify M-Pesa receipt',
          error: verificationError.message
        });
      }
    }

    // CREATE PAYMENT
    try {
      console.log('[PAYMENT-MANUAL] Creating payment record...');

      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert([{
          pledge_id: pledgeId,
          campaign_id: pledge.campaign_id,
          user_id: pledge.user_id,
          amount: amount,
          payment_method: paymentMethod,
          mpesa_receipt_number: paymentMethod === 'mpesa' ? mpesaRef : null,
          status: 'success',
          verified_by_id: adminUserId,
          verified_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
          notes: notes || null
        }])
        .select()
        .single();

      if (paymentError) {
        console.error('[PAYMENT-MANUAL] Payment creation failed:', paymentError);
        
        if (paymentError.code === '23505') {
          return res.status(400).json({
            success: false,
            message: 'Duplicate payment record'
          });
        }

        throw paymentError;
      }

      console.log('[PAYMENT-MANUAL] Payment created:', payment.id);

      // Wait for triggers
      await new Promise(resolve => setTimeout(resolve, 150));

      // Verify updates
      const { data: updatedPledge } = await supabase
        .from('pledges')
        .select('*')
        .eq('id', pledgeId)
        .single();

      console.log('[PAYMENT-MANUAL] Pledge updated:', {
        pledgeId,
        newPaidAmount: updatedPledge.paid_amount,
        newStatus: updatedPledge.status,
        remainingAmount: updatedPledge.remaining_amount
      });

      // Log audit trail
      await logAuditTransaction({
        transactionId: payment.id,
        transactionType: 'payment_success',
        userId: pledge.user_id,
        paymentId: payment.id,
        pledgeId,
        amount,
        paymentMethod,
        mpesaReceiptNumber: paymentMethod === 'mpesa' ? mpesaRef : null,
        status: 'success',
        verifiedBy: adminUserId,
        requestId,
        action: 'manual_payment_recorded'
      });

      res.status(201).json({
        success: true,
        message: 'Payment recorded successfully',
        payment: {
          id: payment.id,
          amount: payment.amount,
          method: paymentMethod,
          status: payment.status,
          verifiedAt: payment.verified_at
        },
        pledge: {
          id: updatedPledge.id,
          pledgedAmount: updatedPledge.pledged_amount,
          paidAmount: updatedPledge.paid_amount,
          remainingAmount: updatedPledge.remaining_amount,
          status: updatedPledge.status
        }
      });

    } catch (transactionError) {
      console.error('[PAYMENT-MANUAL] Transaction failed:', transactionError);

      await logAuditTransaction({
        transactionType: 'payment_success',
        userId: pledge.user_id,
        pledgeId,
        amount,
        paymentMethod,
        status: 'failed',
        error: transactionError.message,
        action: 'manual_payment_transaction_failed',
        verifiedBy: adminUserId
      });

      return res.status(500).json({
        success: false,
        message: 'Failed to record payment',
        error: transactionError.message
      });
    }

  } catch (error) {
    console.error('[PAYMENT-MANUAL] Unexpected error:', error);

    await logAuditTransaction({
      transactionType: 'payment_success',
      userId: req.user._id,
      action: 'manual_payment_unexpected_error',
      status: 'failed',
      error: error.message,
      stackTrace: error.stack
    });

    res.status(500).json({
      success: false,
      message: 'Failed to record payment',
      error: error.message
    });
  }
});

// ============================================
// GET PAYMENT HISTORY
// ============================================
exports.getUserPayments = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user._id.toString();

    console.log('[PAYMENT-GET-USER] Fetching payments for user:', userId);

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    const { count, error: countError } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch payments',
        error: countError.message
      });
    }

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      console.error('[PAYMENT-GET-USER] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch payments',
        error: error.message
      });
    }

    const pages = Math.ceil((count || 0) / limitNum);

    res.json({
      success: true,
      payments: data || [],
      pagination: {
        total: count || 0,
        pages,
        currentPage: pageNum,
        limit: limitNum
      }
    });

  } catch (error) {
    console.error('[PAYMENT-GET-USER] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message
    });
  }
});

exports.getAllPayments = asyncHandler(async (req, res) => {
  try {
    const { status, paymentMethod, campaignId, page = 1, limit = 20 } = req.query;

    console.log('[PAYMENT-GET-ALL] Fetching all payments');

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('payments')
      .select('*', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (paymentMethod) query = query.eq('payment_method', paymentMethod);
    if (campaignId) query = query.eq('campaign_id', campaignId);

    const { count, error: countError } = await query;

    if (countError) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch payments',
        error: countError.message
      });
    }

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      console.error('[PAYMENT-GET-ALL] Error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch payments',
        error: error.message
      });
    }

    const pages = Math.ceil((count || 0) / limitNum);

    res.json({
      success: true,
      payments: data || [],
      pagination: {
        total: count || 0,
        pages,
        currentPage: pageNum,
        limit: limitNum
      }
    });

  } catch (error) {
    console.error('[PAYMENT-GET-ALL] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments',
      error: error.message
    });
  }
});