// server/controllers/paymentController.js
const { createClient } = require('@supabase/supabase-js');
const config = require('../config/env');
const asyncHandler = require('../middleware/asyncHandler');
const Campaign = require('../models/Campaign');
const Settings = require('../models/Settings');

// Initialize Supabase client
const supabase = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY
);

// ============================================
// INITIATE M-PESA PAYMENT
// ============================================
exports.initiateMpesaPayment = asyncHandler(async (req, res) => {
  try {
    const { pledgeId, amount, phoneNumber } = req.body;

    console.log('[PAYMENT-MPESA-INITIATE] Initiating M-Pesa payment for pledge:', pledgeId);

    // Validate required fields
    if (!pledgeId || !amount || !phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Pledge ID, amount, and phone number are required'
      });
    }

    // Validate phone number format (Kenya)
    const phoneRegex = /^254\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number. Must be in format: 254XXXXXXXXX'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    // Get pledge from Supabase
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

    // Validate amount doesn't exceed remaining
    if (amount > pledge.remaining_amount) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount exceeds remaining balance',
        remaining: pledge.remaining_amount
      });
    }

    // Get M-Pesa settings
    const settings = await Settings.getSettings();
    const mpesa = settings.paymentSettings.mpesa;

    if (!mpesa.enabled) {
      return res.status(400).json({
        success: false,
        message: 'M-Pesa payments are not enabled'
      });
    }

    // Create payment record in Supabase (status: pending)
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        pledge_id: pledgeId,
        campaign_id: pledge.campaign_id,
        user_id: req.user._id,
        amount: amount,
        payment_method: 'mpesa',
        mpesa_phone_number: phoneNumber,
        status: 'pending'
      }])
      .select()
      .single();

    if (paymentError) {
      console.error('[PAYMENT-MPESA-INITIATE] Supabase error:', paymentError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create payment record',
        error: paymentError.message
      });
    }

    // TODO: Call actual M-Pesa API (STK Push)
    // For now, return mock response for testing
    console.log('[PAYMENT-MPESA-INITIATE] Payment initiated:', payment.id);

    res.json({
      success: true,
      message: 'M-Pesa payment initiated. Please check your phone for prompt.',
      payment: {
        id: payment.id,
        amount: payment.amount,
        status: payment.status,
        phoneNumber: phoneNumber,
        createdAt: payment.created_at
      }
    });

  } catch (error) {
    console.error('[PAYMENT-MPESA-INITIATE] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      error: error.message
    });
  }
});

// ============================================
// M-PESA CALLBACK (Webhook)
// ============================================
exports.mpesaCallback = asyncHandler(async (req, res) => {
  try {
    const { Body } = req.body;
    
    if (!Body || !Body.stkCallback) {
      console.log('[PAYMENT-MPESA-CALLBACK] Invalid callback format');
      return res.json({ success: false });
    }

    const result = Body.stkCallback;
    const checkoutRequestId = result.CheckoutRequestID;
    const resultCode = result.ResultCode;
    const resultDesc = result.ResultDesc;

    console.log('[PAYMENT-MPESA-CALLBACK] Processing callback for:', checkoutRequestId);

    if (resultCode === 0) {
      // Payment successful
      const callbackMetadata = result.CallbackMetadata?.Item || [];
      const mpesaReceiptNumber = callbackMetadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
      const transactionDate = callbackMetadata.find(item => item.Name === 'TransactionDate')?.Value;
      const phoneNumber = callbackMetadata.find(item => item.Name === 'PhoneNumber')?.Value;

      // Update payment in Supabase
      const { data: payment, error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'success',
          mpesa_transaction_id: mpesaReceiptNumber,
          mpesa_receipt_number: mpesaReceiptNumber,
          completed_at: new Date().toISOString()
        })
        .eq('mpesa_transaction_id', checkoutRequestId)
        .select()
        .single();

      if (updateError) {
        console.error('[PAYMENT-MPESA-CALLBACK] Update error:', updateError);
        return res.json({ success: false });
      }

      // Update pledge status
      const { data: pledge } = await supabase
        .from('pledges')
        .select('*')
        .eq('id', payment.pledge_id)
        .single();

      if (pledge) {
        const newPaidAmount = pledge.paid_amount + payment.amount;
        const newRemainingAmount = pledge.pledged_amount - newPaidAmount;

        let pledgeStatus = pledge.status;
        if (newRemainingAmount === 0) {
          pledgeStatus = 'completed';
        } else if (newPaidAmount > 0) {
          pledgeStatus = 'partial';
        }

        await supabase
          .from('pledges')
          .update({
            paid_amount: newPaidAmount,
            remaining_amount: newRemainingAmount,
            status: pledgeStatus
          })
          .eq('id', payment.pledge_id);
      }

      // Update campaign current_amount
      const { data: campaign } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', payment.campaign_id)
        .single();

      if (campaign) {
        await supabase
          .from('campaigns')
          .update({
            current_amount: campaign.current_amount + payment.amount
          })
          .eq('id', payment.campaign_id);
      }

      console.log('[PAYMENT-MPESA-CALLBACK] Payment success processed:', payment.id);

    } else {
      // Payment failed
      console.log('[PAYMENT-MPESA-CALLBACK] Payment failed:', resultDesc);

      // Update payment status to failed
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          failure_reason: resultDesc
        })
        .eq('mpesa_transaction_id', checkoutRequestId);
    }

    // M-Pesa expects JSON response
    res.json({ success: true });

  } catch (error) {
    console.error('[PAYMENT-MPESA-CALLBACK] Error:', error);
    res.json({ success: false });
  }
});

// ============================================
// RECORD MANUAL PAYMENT (Admin only)
// ============================================
exports.recordManualPayment = asyncHandler(async (req, res) => {
  try {
    const { pledgeId, amount, paymentMethod, mpesaRef, notes } = req.body;

    console.log('[PAYMENT-MANUAL] Recording manual payment for pledge:', pledgeId);

    if (!pledgeId || !amount || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'Pledge ID, amount, and payment method are required'
      });
    }

    // Get pledge
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
        message: 'Payment amount exceeds remaining balance'
      });
    }

    // Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        pledge_id: pledgeId,
        campaign_id: pledge.campaign_id,
        user_id: pledge.user_id,
        amount: amount,
        payment_method: paymentMethod,
        mpesa_ref: mpesaRef || null,
        status: 'success',
        verified_by_id: req.user._id,
        verified_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (paymentError) {
      console.error('[PAYMENT-MANUAL] Supabase error:', paymentError);
      return res.status(500).json({
        success: false,
        message: 'Failed to record payment',
        error: paymentError.message
      });
    }

    // Update pledge
    const newPaidAmount = pledge.paid_amount + amount;
    const newRemainingAmount = pledge.pledged_amount - newPaidAmount;

    let pledgeStatus = pledge.status;
    if (newRemainingAmount === 0) {
      pledgeStatus = 'completed';
    } else if (newPaidAmount > 0) {
      pledgeStatus = 'partial';
    }

    await supabase
      .from('pledges')
      .update({
        paid_amount: newPaidAmount,
        remaining_amount: newRemainingAmount,
        status: pledgeStatus
      })
      .eq('id', pledgeId);

    // Update campaign
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', pledge.campaign_id)
      .single();

    if (campaign) {
      await supabase
        .from('campaigns')
        .update({
          current_amount: campaign.current_amount + amount
        })
        .eq('id', pledge.campaign_id);
    }

    console.log('[PAYMENT-MANUAL] Payment recorded:', payment.id);

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      payment
    });

  } catch (error) {
    console.error('[PAYMENT-MANUAL] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record payment',
      error: error.message
    });
  }
});

// ============================================
// GET PAYMENT HISTORY (User)
// ============================================
exports.getUserPayments = asyncHandler(async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    console.log('[PAYMENT-GET-USER] Fetching payments for user:', req.user._id);

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;

    const { count, error: countError } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user._id);

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
      .eq('user_id', req.user._id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (error) {
      console.error('[PAYMENT-GET-USER] Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch payments',
        error: error.message
      });
    }

    const pages = Math.ceil(count / limitNum);

    res.json({
      success: true,
      payments: data,
      pagination: {
        total: count,
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

// ============================================
// GET ALL PAYMENTS (Admin only)
// ============================================
exports.getAllPayments = asyncHandler(async (req, res) => {
  try {
    const { status, paymentMethod, campaignId, page = 1, limit = 20 } = req.query;

    console.log('[PAYMENT-GET-ALL] Fetching all payments');

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 20;
    const offset = (pageNum - 1) * limitNum;

    // Build query
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
      console.error('[PAYMENT-GET-ALL] Supabase error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch payments',
        error: error.message
      });
    }

    const pages = Math.ceil(count / limitNum);

    res.json({
      success: true,
      payments: data,
      pagination: {
        total: count,
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