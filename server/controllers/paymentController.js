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

    // GET M-PESA SETTINGS FROM DATABASE
    const settings = await Settings.getSettings();
    const mpesa = settings.paymentSettings.mpesa;

    if (!mpesa.enabled) {
      return res.status(400).json({
        success: false,
        message: 'M-Pesa payments are not enabled'
      });
    }

    // VALIDATE M-PESA CREDENTIALS EXIST
    if (!mpesa.consumerKey || !mpesa.consumerSecret || !mpesa.shortcode || !mpesa.passkey) {
      return res.status(400).json({
        success: false,
        message: 'M-Pesa credentials are not configured. Please configure M-Pesa settings first.',
        missing: {
          consumerKey: !mpesa.consumerKey,
          consumerSecret: !mpesa.consumerSecret,
          shortcode: !mpesa.shortcode,
          passkey: !mpesa.passkey
        }
      });
    }

    // GENERATE TIMESTAMP AND PASSWORD (Base64)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const timestamp = `${year}${month}${day}${hours}${minutes}${seconds}`;

    const passwordString = mpesa.shortcode + mpesa.passkey + timestamp;
    const password = Buffer.from(passwordString).toString('base64');

    console.log('[PAYMENT-MPESA-INITIATE] M-Pesa credentials loaded');
    console.log('[PAYMENT-MPESA-INITIATE] Environment:', mpesa.environment);
    console.log('[PAYMENT-MPESA-INITIATE] Party A (Phone):', phoneNumber);
    console.log('[PAYMENT-MPESA-INITIATE] Party B (Shortcode):', mpesa.shortcode);
    console.log('[PAYMENT-MPESA-INITIATE] Transaction Type:', mpesa.transactionType);
    console.log('[PAYMENT-MPESA-INITIATE] Timestamp:', timestamp);
    console.log('[PAYMENT-MPESA-INITIATE] Password (Base64):', password.substring(0, 20) + '...');

    // CREATE PAYMENT RECORD IN SUPABASE (status: pending)
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

    // ACTUALLY CALL M-PESA API
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

      console.log('[PAYMENT-MPESA-INITIATE] STK Push sent successfully:', mpesaResult);

      // Update payment with M-Pesa response
      await supabase
        .from('payments')
        .update({
          mpesa_transaction_id: mpesaResult.checkoutRequestId
        })
        .eq('id', payment.id);

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
      console.error('[PAYMENT-MPESA-INITIATE] M-Pesa API error:', mpesaError);
      
      // Update payment status to failed
      await supabase
        .from('payments')
        .update({
          status: 'failed',
          failure_reason: mpesaError.message
        })
        .eq('id', payment.id);

      return res.status(500).json({
        success: false,
        message: 'Failed to initiate M-Pesa STK push',
        error: mpesaError.message
      });
    }

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
    console.log('[PAYMENT-MPESA-CALLBACK] Result Code:', resultCode);
    console.log('[PAYMENT-MPESA-CALLBACK] Result Description:', resultDesc);

    if (resultCode === 0) {
      // Payment successful
      console.log('[PAYMENT-MPESA-CALLBACK] Payment successful');

      const callbackMetadata = result.CallbackMetadata?.Item || [];
      const mpesaReceiptNumber = callbackMetadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
      const transactionDate = callbackMetadata.find(item => item.Name === 'TransactionDate')?.Value;
      const phoneNumber = callbackMetadata.find(item => item.Name === 'PhoneNumber')?.Value;

      console.log('[PAYMENT-MPESA-CALLBACK] Receipt:', mpesaReceiptNumber);
      console.log('[PAYMENT-MPESA-CALLBACK] Phone:', phoneNumber);
      console.log('[PAYMENT-MPESA-CALLBACK] Transaction Date:', transactionDate);

      // Find payment by checkout request ID
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .select('*')
        .eq('mpesa_transaction_id', checkoutRequestId)
        .single();

      if (paymentError) {
        console.error('[PAYMENT-MPESA-CALLBACK] Payment not found:', paymentError);
        return res.json({ success: false });
      }

      // Update payment status to success
      const { data: updatedPayment, error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'success',
          mpesa_receipt_number: mpesaReceiptNumber,
          completed_at: new Date().toISOString()
        })
        .eq('id', payment.id)
        .select()
        .single();

      if (updateError) {
        console.error('[PAYMENT-MPESA-CALLBACK] Payment update error:', updateError);
        return res.json({ success: false });
      }

      console.log('[PAYMENT-MPESA-CALLBACK] Payment updated to success:', payment.id);

      // GET AND UPDATE PLEDGE
      const { data: pledge, error: pledgeError } = await supabase
        .from('pledges')
        .select('*')
        .eq('id', payment.pledge_id)
        .single();

      if (pledgeError) {
        console.error('[PAYMENT-MPESA-CALLBACK] Pledge not found:', pledgeError);
        return res.json({ success: false });
      }

      // Calculate new pledge amounts
      const newPaidAmount = (pledge.paid_amount || 0) + payment.amount;
      const newRemainingAmount = pledge.pledged_amount - newPaidAmount;

      // Determine pledge status
      let pledgeStatus = 'partial';
      if (newRemainingAmount <= 0) {
        pledgeStatus = 'completed';
      } else if (newPaidAmount > 0) {
        pledgeStatus = 'partial';
      }

      console.log('[PAYMENT-MPESA-CALLBACK] Updating pledge:', {
        pledgeId: pledge.id,
        oldStatus: pledge.status,
        newStatus: pledgeStatus,
        oldPaidAmount: pledge.paid_amount,
        newPaidAmount: newPaidAmount,
        oldRemainingAmount: pledge.remaining_amount,
        newRemainingAmount: newRemainingAmount
      });

      // Update pledge
      const { error: pledgeUpdateError } = await supabase
        .from('pledges')
        .update({
          paid_amount: newPaidAmount,
          remaining_amount: newRemainingAmount,
          status: pledgeStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', pledge.id);

      if (pledgeUpdateError) {
        console.error('[PAYMENT-MPESA-CALLBACK] Pledge update error:', pledgeUpdateError);
        return res.json({ success: false });
      }

      console.log('[PAYMENT-MPESA-CALLBACK] Pledge updated successfully');

      // GET AND UPDATE CAMPAIGN
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', pledge.campaign_id)
        .single();

      if (campaignError) {
        console.error('[PAYMENT-MPESA-CALLBACK] Campaign not found:', campaignError);
        return res.json({ success: false });
      }

      const newCampaignAmount = (campaign.current_amount || 0) + payment.amount;

      console.log('[PAYMENT-MPESA-CALLBACK] Updating campaign:', {
        campaignId: campaign.id,
        oldAmount: campaign.current_amount,
        newAmount: newCampaignAmount,
        paymentAmount: payment.amount
      });

      // Update campaign
      const { error: campaignUpdateError } = await supabase
        .from('campaigns')
        .update({
          current_amount: newCampaignAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', pledge.campaign_id);

      if (campaignUpdateError) {
        console.error('[PAYMENT-MPESA-CALLBACK] Campaign update error:', campaignUpdateError);
        return res.json({ success: false });
      }

      console.log('[PAYMENT-MPESA-CALLBACK] Campaign updated successfully');
      console.log('[PAYMENT-MPESA-CALLBACK] Payment flow completed:', {
        paymentId: payment.id,
        pledgeId: pledge.id,
        campaignId: campaign.id,
        amount: payment.amount
      });

      return res.json({ success: true });

    } else {
      // Payment failed
      console.log('[PAYMENT-MPESA-CALLBACK] Payment failed:', resultDesc);

      // Find and update payment status to failed
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('mpesa_transaction_id', checkoutRequestId)
        .single();

      if (payment) {
        const { error: updateError } = await supabase
          .from('payments')
          .update({
            status: 'failed',
            failure_reason: resultDesc,
            updated_at: new Date().toISOString()
          })
          .eq('id', payment.id);

        if (updateError) {
          console.error('[PAYMENT-MPESA-CALLBACK] Failed payment update error:', updateError);
        } else {
          console.log('[PAYMENT-MPESA-CALLBACK] Payment marked as failed:', payment.id);
        }
      }

      return res.json({ success: true });
    }

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
if (newRemainingAmount <= 0) {
  pledgeStatus = 'completed';
} else if (newPaidAmount > 0) {
  pledgeStatus = 'partial';
}

console.log('[PAYMENT-MANUAL] Updating pledge:', {
  pledgeId: pledgeId,
  oldStatus: pledge.status,
  newStatus: pledgeStatus,
  newPaidAmount: newPaidAmount,
  newRemainingAmount: newRemainingAmount
});

const { error: pledgeUpdateError } = await supabase
  .from('pledges')
  .update({
    paid_amount: newPaidAmount,
    remaining_amount: newRemainingAmount,
    status: pledgeStatus,
    updated_at: new Date().toISOString()
  })
  .eq('id', pledgeId);

if (pledgeUpdateError) {
  console.error('[PAYMENT-MANUAL] Pledge update error:', pledgeUpdateError);
  return res.status(500).json({
    success: false,
    message: 'Failed to update pledge',
    error: pledgeUpdateError.message
  });
}

console.log('[PAYMENT-MANUAL] Pledge updated successfully');

    // Update campaign
    // Update campaign
const { data: campaign } = await supabase
  .from('campaigns')
  .select('*')
  .eq('id', pledge.campaign_id)
  .single();

if (campaign) {
  const newCampaignAmount = (campaign.current_amount || 0) + amount;

  console.log('[PAYMENT-MANUAL] Updating campaign:', {
    campaignId: campaign.id,
    oldAmount: campaign.current_amount,
    newAmount: newCampaignAmount
  });

  const { error: campaignUpdateError } = await supabase
    .from('campaigns')
    .update({
      current_amount: newCampaignAmount,
      updated_at: new Date().toISOString()
    })
    .eq('id', pledge.campaign_id);

  if (campaignUpdateError) {
    console.error('[PAYMENT-MANUAL] Campaign update error:', campaignUpdateError);
    return res.status(500).json({
      success: false,
      message: 'Failed to update campaign',
      error: campaignUpdateError.message
    });
  }

  console.log('[PAYMENT-MANUAL] Campaign updated successfully');
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